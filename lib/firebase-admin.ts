import "server-only";
import admin from 'firebase-admin';

interface FirebaseAdminConfig {
    projectId: string;
    clientEmail: string;
    privateKey: string;
}

function formatPrivateKey(key: string) {
    return key.replace(/\\n/g, '\n');
}

export function createFirebaseAdminApp(config: FirebaseAdminConfig) {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    return admin.initializeApp({
        credential: admin.credential.cert({
            projectId: config.projectId,
            clientEmail: config.clientEmail,
            privateKey: formatPrivateKey(config.privateKey),
        }),
    });
}

export function initAdmin() {
    const params = {
        projectId: process.env.FIREBASE_PROJECT_ID as string,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL as string,
        privateKey: process.env.FIREBASE_PRIVATE_KEY as string,
    };

    if (!params.privateKey || !params.clientEmail || !params.projectId) {
        // During build time or if envs missing, we might not want to throw immediately to avoid crashing non-auth routes
        // But for auth actions, we need to check.
        // Return null or throw custom error?
        // For now, let's just warn and let access fail if used.
        console.warn("Firebase Admin: Missing environment variables.");
        // We'll let it try to init, usually it throws.
    }

    return createFirebaseAdminApp(params);
}

export const adminAuth = () => {
    initAdmin();
    return admin.auth();
};

export const adminDb = () => {
    initAdmin();
    return admin.firestore();
};
