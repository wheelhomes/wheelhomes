import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireAdmin, rateLimit, tooManyRequests } from "@/lib/api-auth";

interface CleanupTestDataBody {
    userIds?: string[];
    applicationIds?: string[];
    requestIds?: string[];
}

export async function POST(req: Request) {
    try {
        const caller = await requireAdmin(req);
        if (caller instanceof NextResponse) return caller;

        if (!rateLimit(`admin-cleanup-test:${caller.uid}`, 10, 60 * 1000)) {
            return tooManyRequests();
        }

        const body = (await req.json()) as CleanupTestDataBody;
        const userIds = Array.isArray(body.userIds) ? body.userIds.filter((id) => id && id !== caller.uid) : [];
        const applicationIds = Array.isArray(body.applicationIds) ? body.applicationIds.filter(Boolean) : [];
        const requestIds = Array.isArray(body.requestIds) ? body.requestIds.filter(Boolean) : [];

        const db = adminDb();
        let deletedUsers = 0;
        let deletedApplications = 0;
        let deletedRequests = 0;

        // 1. Delete selected users from Firestore `users` and Firebase Auth
        for (const uid of userIds) {
            try {
                await db.collection("users").doc(uid).delete();
                deletedUsers += 1;
            } catch (e) {
                console.warn(`[cleanup-test-data] Could not delete users/${uid}:`, e);
            }
            try {
                await adminAuth().deleteUser(uid);
            } catch (authErr: any) {
                if (authErr?.code !== "auth/user-not-found") {
                    console.warn(`[cleanup-test-data] Auth delete notice for ${uid}:`, authErr?.message);
                }
            }
        }

        // 2. Delete selected applications from `user_applications`
        for (const appId of applicationIds) {
            try {
                await db.collection("user_applications").doc(appId).delete();
                deletedApplications += 1;
            } catch (e) {
                console.warn(`[cleanup-test-data] Could not delete user_applications/${appId}:`, e);
            }
        }

        // 3. Delete selected requests from both `job_requests` and `requests`
        // Safety guard: never hard-delete a request that has an active or released escrow payment record
        let skippedProtectedRequests = 0;
        for (const reqId of requestIds) {
            let removed = false;
            try {
                const jobRef = db.collection("job_requests").doc(reqId);
                const jobSnap = await jobRef.get();
                if (jobSnap.exists) {
                    const d = jobSnap.data() || {};
                    if (d.paymentStatus === "escrow_held" || d.paymentStatus === "released" || d.escrowReference) {
                        skippedProtectedRequests += 1;
                        continue;
                    }
                    await jobRef.delete();
                    removed = true;
                }
            } catch (e) {
                console.warn(`[cleanup-test-data] Could not delete job_requests/${reqId}:`, e);
            }
            try {
                const reqRef = db.collection("requests").doc(reqId);
                const reqSnap = await reqRef.get();
                if (reqSnap.exists) {
                    const d = reqSnap.data() || {};
                    if (d.paymentStatus === "escrow_held" || d.paymentStatus === "released" || d.escrowReference) {
                        skippedProtectedRequests += 1;
                        continue;
                    }
                    await reqRef.delete();
                    removed = true;
                }
            } catch (e) {
                console.warn(`[cleanup-test-data] Could not delete requests/${reqId}:`, e);
            }
            if (removed) deletedRequests += 1;
        }

        return NextResponse.json({
            success: true,
            deletedUsers,
            deletedApplications,
            deletedRequests,
            skippedProtectedRequests,
            message: `Deleted ${deletedUsers} test user(s), ${deletedApplications} application(s), and ${deletedRequests} job request(s).`,
        });
    } catch (error: any) {
        console.error("[cleanup-test-data] Error:", error);
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to clean up test data" },
            { status: 500 }
        );
    }
}

