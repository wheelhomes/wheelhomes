
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
    // Dynamic import to ensure env vars are loaded first
    const { cleanupMockData } = await import('../lib/seed-data');
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    const { auth } = await import("../lib/firebase");

    console.log("Authenticating as Admin to perform cleanup...");
    try {
        // Using the default admin credentials from the setup guide
        await signInWithEmailAndPassword(auth, "admin@wheelofcomfort.com", "admin123");
        console.log("Authenticated successfully.");

        console.log("Running mock data cleanup...");
        const success = await cleanupMockData();
        if (success) {
            console.log("Cleanup finished.");
            process.exit(0);
        } else {
            console.error("Cleanup failed.");
            process.exit(1);
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Authentication failed:", error.message);
        } else {
            console.error("Authentication failed:", error);
        }
        console.error("Make sure the admin account exists (see admin_setup_guide.md).");
        process.exit(1);
    }
}

main();
