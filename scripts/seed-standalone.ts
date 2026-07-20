
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log("Loading env from:", path.resolve(__dirname, '../.env.local'));
console.log("Loading env from:", path.resolve(__dirname, '../.env.local'));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
console.log("API Key loaded:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "YES" : "NO");

async function main() {
    // Dynamic import to ensure env vars are loaded first
    const { seedProviders } = await import('../lib/seed-data');

    console.log("Starting standalone seed...");
    const success = await seedProviders();
    if (success) {
        console.log("Seed successful.");
        process.exit(0);
    } else {
        console.error("Seed failed.");
        process.exit(1);
    }
}

main();
