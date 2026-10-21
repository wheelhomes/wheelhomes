import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { requireAdmin, rateLimit, tooManyRequests } from '@/lib/api-auth';

interface ManageUserRequest {
    action: 'suspend' | 'reactivate' | 'delete';
    targetUid: string;
    reason?: string;
    force?: boolean;
}

export async function POST(req: Request) {
    try {
        const caller = await requireAdmin(req);
        if (caller instanceof NextResponse) return caller;

        if (!rateLimit(`admin-user-action:${caller.uid}`, 30, 60 * 1000)) {
            return tooManyRequests();
        }

        const body = (await req.json()) as ManageUserRequest;
        const { action, targetUid, reason, force } = body;

        if (!targetUid || typeof targetUid !== 'string') {
            return NextResponse.json({ success: false, error: 'Target user ID is required' }, { status: 400 });
        }

        if (caller.uid === targetUid) {
            return NextResponse.json({ success: false, error: 'You cannot perform moderation actions on your own administrator account.' }, { status: 400 });
        }

        const userDocRef = adminDb().collection('users').doc(targetUid);
        const userDocSnap = await userDocRef.get();
        const userData = userDocSnap.exists ? userDocSnap.data() || {} : {};
        const nowIso = new Date().toISOString();

        // ══════════════════════════════════════════════════════════════════
        // TIER 1: SUSPEND / DEACTIVATE (SOFT DELETE)
        // ══════════════════════════════════════════════════════════════════
        if (action === 'suspend') {
            const cleanReason = (reason || 'Account suspended by platform administrator.').trim();

            // 1. Disable in Firebase Authentication (blocks token refresh and logins)
            try {
                await adminAuth().updateUser(targetUid, { disabled: true });
            } catch (authErr: any) {
                console.warn('[Admin API] Could not disable Firebase Auth user (may not exist in Auth):', authErr.message);
            }

            // 2. Update Firestore user document
            const currentStatus = userData.status || 'approved';
            await userDocRef.set({
                ...userData,
                status: 'suspended',
                suspendedAt: nowIso,
                suspensionReason: cleanReason,
                suspendedBy: caller.email || caller.uid,
                previousStatus: currentStatus !== 'suspended' ? currentStatus : 'approved'
            }, { merge: true });

            // 3. Unpublish active property listings
            try {
                const propsSnap = await adminDb().collection('properties')
                    .where('agentId', '==', targetUid)
                    .get();

                if (!propsSnap.empty) {
                    const batch = adminDb().batch();
                    propsSnap.docs.forEach(d => {
                        const orig = d.data().status || 'active';
                        batch.update(d.ref, {
                            status: 'archived',
                            isSuspended: true,
                            originalStatus: orig
                        });
                    });
                    await batch.commit();
                }
            } catch (propErr) {
                console.warn('[Admin API] Could not auto-archive properties for suspended user:', propErr);
            }

            // 4. Send in-app notification
            try {
                await adminDb().collection('notifications').add({
                    userId: targetUid,
                    recipientId: targetUid,
                    title: 'Account Suspended ⚠️',
                    message: cleanReason,
                    body: cleanReason,
                    type: 'error',
                    read: false,
                    isRead: false,
                    createdAt: nowIso,
                    link: '/contact'
                });
            } catch (notifErr) {
                console.warn('[Admin API] Could not add suspension notification:', notifErr);
            }

            return NextResponse.json({
                success: true,
                message: 'User account has been suspended and login access revoked.'
            });
        }

        // ══════════════════════════════════════════════════════════════════
        // TIER 1: REACTIVATE SUSPENDED USER
        // ══════════════════════════════════════════════════════════════════
        if (action === 'reactivate') {
            // 1. Re-enable in Firebase Authentication
            try {
                await adminAuth().updateUser(targetUid, { disabled: false });
            } catch (authErr: any) {
                console.warn('[Admin API] Could not re-enable Firebase Auth user:', authErr.message);
            }

            // 2. Restore Firestore status
            const restoreStatus = userData.previousStatus || 'approved';
            await userDocRef.set({
                ...userData,
                status: restoreStatus,
                suspendedAt: null,
                suspensionReason: null
            }, { merge: true });

            // 3. Restore any property listings that were suspended
            try {
                const propsSnap = await adminDb().collection('properties')
                    .where('agentId', '==', targetUid)
                    .where('isSuspended', '==', true)
                    .get();

                if (!propsSnap.empty) {
                    const batch = adminDb().batch();
                    propsSnap.docs.forEach(d => {
                        const orig = d.data().originalStatus || 'active';
                        batch.update(d.ref, {
                            status: orig,
                            isSuspended: false
                        });
                    });
                    await batch.commit();
                }
            } catch (propErr) {
                console.warn('[Admin API] Could not restore property listings for user:', propErr);
            }

            // 4. Send reactivation notification
            try {
                await adminDb().collection('notifications').add({
                    userId: targetUid,
                    recipientId: targetUid,
                    title: 'Account Reactivated 🎉',
                    message: 'Your Wheelhomes account has been restored. You can now access all services.',
                    body: 'Your Wheelhomes account has been restored. You can now access all services.',
                    type: 'success',
                    read: false,
                    isRead: false,
                    createdAt: nowIso,
                    link: '/dashboard'
                });
            } catch (notifErr) {
                console.warn('[Admin API] Could not send reactivation notification:', notifErr);
            }

            return NextResponse.json({
                success: true,
                message: 'User account has been reactivated successfully.'
            });
        }

        // ══════════════════════════════════════════════════════════════════
        // TIER 2: PERMANENT HARD DELETE
        // ══════════════════════════════════════════════════════════════════
        if (action === 'delete') {
            // 1. Financial Safety Check: Check for open escrow or pending transactions
            try {
                const openTxSnap = await adminDb().collection('transactions')
                    .where('userId', '==', targetUid)
                    .where('status', 'in', ['pending', 'held_in_escrow', 'disputed'])
                    .get();

                if (!openTxSnap.empty && !force) {
                    return NextResponse.json({
                        success: false,
                        error: `Cannot delete: User has ${openTxSnap.size} active escrow/pending transaction(s). Please complete or refund these transactions first.`
                    }, { status: 400 });
                }
            } catch (txErr) {
                console.warn('[Admin API] Transaction check warning:', txErr);
            }

            // 2. Anonymize user in completed and historical jobs so counterparty records don't crash
            try {
                const clientJobsSnap = await adminDb().collection('job_requests').where('clientId', '==', targetUid).get();
                if (!clientJobsSnap.empty) {
                    const batch = adminDb().batch();
                    clientJobsSnap.docs.forEach(d => batch.update(d.ref, { clientName: '[Deleted User]' }));
                    await batch.commit();
                }

                const providerJobsSnap = await adminDb().collection('job_requests').where('providerId', '==', targetUid).get();
                if (!providerJobsSnap.empty) {
                    const batch = adminDb().batch();
                    providerJobsSnap.docs.forEach(d => batch.update(d.ref, { providerName: '[Deleted User]' }));
                    await batch.commit();
                }
            } catch (jobErr) {
                console.warn('[Admin API] Could not anonymize historical jobs:', jobErr);
            }

            // 3. Remove property listings posted by user
            try {
                const propsSnap = await adminDb().collection('properties')
                    .where('agentId', '==', targetUid)
                    .get();
                if (!propsSnap.empty) {
                    const batch = adminDb().batch();
                    propsSnap.docs.forEach(d => batch.delete(d.ref));
                    await batch.commit();
                }
            } catch (propErr) {
                console.warn('[Admin API] Could not delete properties:', propErr);
            }

            // 4. Remove notifications
            try {
                const notifsSnap = await adminDb().collection('notifications')
                    .where('userId', '==', targetUid)
                    .get();
                if (!notifsSnap.empty) {
                    const batch = adminDb().batch();
                    notifsSnap.docs.forEach(d => batch.delete(d.ref));
                    await batch.commit();
                }
            } catch (notifErr) {
                console.warn('[Admin API] Could not delete notifications:', notifErr);
            }

            // 5. Remove applications in user_applications
            try {
                const userEmail = userData.email;
                if (userEmail) {
                    const appsSnap = await adminDb().collection('user_applications')
                        .where('data.email', '==', userEmail)
                        .get();
                    if (!appsSnap.empty) {
                        const batch = adminDb().batch();
                        appsSnap.docs.forEach(d => batch.delete(d.ref));
                        await batch.commit();
                    }
                }
            } catch (appErr) {
                console.warn('[Admin API] Could not delete user_applications:', appErr);
            }

            // 6. Delete Firestore User Document
            await userDocRef.delete();

            // 7. Delete from Firebase Authentication (CRITICAL: Frees up email completely)
            let authDeleted = false;
            try {
                await adminAuth().deleteUser(targetUid);
                authDeleted = true;
            } catch (authErr: any) {
                if (authErr.code === 'auth/user-not-found') {
                    authDeleted = true;
                } else {
                    console.error('[Admin API] Error deleting from Firebase Auth:', authErr);
                }
            }

            return NextResponse.json({
                success: true,
                message: `User permanently deleted from Firestore and Firebase Authentication${authDeleted ? ' (email has been freed)' : ''}.`
            });
        }

        return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });

    } catch (error: any) {
        console.error('[Admin Users API] Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}
