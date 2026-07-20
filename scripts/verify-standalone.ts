import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables manually BEFORE importing firebase-dependent modules
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    console.log(`Loading .env.local from ${envPath}`);
    dotenv.config({ path: envPath });
} else {
    console.error(".env.local not found!");
}

// Mock Firebase initialization if needed, or rely on existing firebase.ts
// Note: firebase.ts initializes app using process.env, so importing it AFTER dotenv.config is crucial.

async function runVerification() {
    console.log("Starting Verification...");

    // Dynamically import RequestServices so it uses the loaded env vars
    const { RequestServices } = await import('../lib/services/request-service');

    try {
        // 1. Create
        console.log("1. Creating Request...");
        const requestId = await RequestServices.createRequest({
            userId: 'test-script-user',
            serviceId: 'service-script-1'
        });
        console.log(`   Request created with ID: ${requestId}`);

        // 2. Assign
        console.log("2. Assigning Request...");
        await RequestServices.assignRequest(requestId, 'provider-script-1');
        console.log("   Assigned.");

        // 3. Start
        console.log("3. Starting Job...");
        await RequestServices.startJob(requestId, 45); // 45 minutes ETA
        console.log("   Job started.");

        // 4. Complete
        console.log("4. Completing Job...");
        await RequestServices.completeJob(requestId, false, "Script verified", []);
        console.log("   Job completed.");

        // 5. Verify Final State
        console.log("5. Verifying Final State...");
        const finalRequest = await RequestServices.getRequest(requestId);
        console.log("   Final Status:", finalRequest?.status);
        console.log("   Chat Locked:", finalRequest?.chatLocked);

        if (finalRequest?.status === 'completed' && finalRequest.chatLocked === true) {
            console.log("SUCCESS: Request lifecycle verified.");
        } else {
            console.error("FAILURE: Final state incorrect.");
            process.exit(1);
        }

    } catch (error) {
        console.error("Verification Failed:", error);
        process.exit(1);
    }
}

runVerification();
