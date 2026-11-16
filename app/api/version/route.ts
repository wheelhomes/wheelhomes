import { NextResponse } from 'next/server';

// Current web application version and build stamp
const APP_VERSION = "1.2.1";
const BUILD_TIMESTAMP = 1794834480000;

export async function GET() {
    return NextResponse.json({
        success: true,
        version: APP_VERSION,
        buildTime: BUILD_TIMESTAMP,
        releaseNotes: "Persistent 6-digit Login PIN & Fingerprint/Face Biometric App Lock, real-time notifications, HOD department routing, and field assistant dispatch.",
        mobile: {
            latestVersion: "1.2.1",
            latestBuildNumber: 5,
            minRequiredVersion: "1.0.0",
            downloadUrl: "https://wheelofcomfort.vercel.app/downloads/wheelofcomfort.apk",
            releaseNotes: "Fixed persistent 6-digit Login PIN & Fingerprint/Face Biometric App Lock on app reopen, plus real-time notifications.",
            forceUpdate: false
        }
    }, {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
    });
}
