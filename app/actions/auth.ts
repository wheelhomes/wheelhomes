'use server';

import { adminDb } from "@/lib/firebase-admin";

export async function checkEmailExistsAction(email: string) {
    try {
        // 1. Check if admin credentials exist
        if (!process.env.FIREBASE_PRIVATE_KEY) {
            // Fallback: If no admin keys, we can't secure check.
            // Return null so frontend can decide (maybe fallback to unsafe check if really desperate, or fail)
            // For security, we should return "success" (pretend it exists) or "error".
            console.error("Missing FIREBASE_PRIVATE_KEY");
            return { success: false, error: "Server misconfiguration" };
        }

        const db = adminDb();

        // 2. Query Users Collection
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).limit(1).get();

        const exists = !snapshot.empty;
        return { success: true, exists };

    } catch (error) {
        console.error("Check email error:", error);
        return { success: false, error: "Failed to check email" };
    }
}
