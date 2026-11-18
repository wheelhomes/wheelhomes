import { NextResponse } from 'next/server';

// Current web application version and build stamp
const APP_VERSION = "1.2.3";
const BUILD_TIMESTAMP = 1795012200000;

export async function GET() {
    return NextResponse.json({
        success: true,
        version: APP_VERSION,
        buildTime: BUILD_TIMESTAMP,
        releaseNotes: "Clearer Create & Confirm New 6-Digit Login PIN flow, Biometric App Lock, and real-time notifications.",
        mobile: {
            latestVersion: "1.2.3",
            latestBuildNumber: 7,
            minRequiredVersion: "1.0.0",
            downloadUrl: "https://wheelofcomfort.vercel.app/downloads/wheelofcomfort.apk",
            releaseNotes: "Clearer Create & Confirm New 6-Digit Login PIN setup flow so users always know when they are setting and confirming a new PIN.",
            forceUpdate: false
        }
    }, {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
    });
}
