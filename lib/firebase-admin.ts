import "server-only";
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

interface FirebaseAdminConfig {
    projectId: string;
    clientEmail?: string;
    privateKey?: string;
}

function formatPrivateKey(key?: string): string {
    if (!key) return '';
    return key.replace(/\\n/g, '\n');
}

export function createFirebaseAdminApp(config: FirebaseAdminConfig) {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    // 1. Explicit Service Account Credentials (environment variables)
    if (config.clientEmail && config.privateKey) {
        try {
            return admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: config.projectId,
                    clientEmail: config.clientEmail,
                    privateKey: formatPrivateKey(config.privateKey),
                }),
            });
        } catch (e) {
            console.warn('[Firebase Admin] Failed to initialize with cert credentials, falling back:', e);
        }
    }

    // 2. Base64 or JSON Service Account String
    const rawSa = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (rawSa) {
        try {
            const parsed = JSON.parse(
                rawSa.startsWith('{') ? rawSa : Buffer.from(rawSa, 'base64').toString('utf8')
            );
            return admin.initializeApp({
                credential: admin.credential.cert(parsed),
            });
        } catch (e) {
            console.warn('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
        }
    }

    // 3. Local service-account.json file
    try {
        const saPath = path.resolve(process.cwd(), 'service-account.json');
        if (fs.existsSync(saPath)) {
            const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
            return admin.initializeApp({
                credential: admin.credential.cert(sa),
            });
        }
    } catch (_) {}

    // 4. Safe fallback: project ID only (allows token verification via public Google certs)
    const fallbackProjectId = config.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'wheelhomes';
    console.warn(`[Firebase Admin] Initializing without service account cert for project: ${fallbackProjectId}`);
    return admin.initializeApp({
        projectId: fallbackProjectId,
    });
}

export function initAdmin() {
    const params: FirebaseAdminConfig = {
        projectId: (process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'wheelhomes') as string,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
    };

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

