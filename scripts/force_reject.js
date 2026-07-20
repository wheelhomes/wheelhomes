
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const admin = require("firebase-admin");
const serviceAccount = require("../service-account-key.json"); // Ensure this path is correct for your environment, or use default credentials if available

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function forceReject() {
    const userId = "psOSYIRwfAc7z2MI3LkaxFN0UpF3";
    console.log(`Rejecting user ${userId}...`);

    try {
        await db.collection("users").doc(userId).update({
            status: "rejected",
            rejectionReason: "Please re-upload documents (Manual Verification Test)",
            rejectedAt: new Date().toISOString()
        });
        console.log("User rejected successfully.");
    } catch (error) {
        console.error("Error rejecting user:", error);
    }
}

forceReject();
