import { NextResponse } from 'next/server';

// Current web application version and build stamp
const APP_VERSION = "1.2.2";
const BUILD_TIMESTAMP = 1794837420000;

export async function GET() {
    return NextResponse.json({
        success: true,
        version: APP_VERSION,
        buildTime: BUILD_TIMESTAMP,
        releaseNotes: "Fixed loading screen after PIN/Fingerprint unlock, persistent 6-digit Login PIN & Biometric App Lock, and real-time notifications.",
        mobile: {
            latestVersion: "1.2.2",
            latestBuildNumber: 6,
            minRequiredVersion: "1.0.0",
            downloadUrl: "https://wheelofcomfort.vercel.app/downloads/wheelofcomfort.apk",
            releaseNotes: "Fixed infinite loading screen after unlocking with Login PIN or Fingerprint.",
            forceUpdate: false
        }
    }, {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
    });
}
