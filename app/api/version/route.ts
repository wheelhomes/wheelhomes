import { NextResponse } from 'next/server';

// Current web application version and build stamp
const APP_VERSION = "1.2.0";
const BUILD_TIMESTAMP = 1794403320000;

export async function GET() {
    return NextResponse.json({
        success: true,
        version: APP_VERSION,
        buildTime: BUILD_TIMESTAMP,
        releaseNotes: "6-digit Login PIN & Biometric App Lock, online WhatsApp-style voice calling, real-time notifications, HOD department routing, and field assistant dispatch.",
        mobile: {
            latestVersion: "1.2.0",
            latestBuildNumber: 4,
            minRequiredVersion: "1.0.0",
            downloadUrl: "https://wheelofcomfort.vercel.app/downloads/wheelofcomfort.apk",
            releaseNotes: "New 6-digit Login PIN & Fingerprint/Face Biometric App Lock! Plus WhatsApp-style online voice calling and real-time notifications.",
            forceUpdate: false
        }
    }, {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
    });
}
