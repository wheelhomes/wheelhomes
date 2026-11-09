import { NextResponse } from 'next/server';

// Current web application version and build stamp
const APP_VERSION = "1.1.0";
const BUILD_TIMESTAMP = 1794234880000;

export async function GET() {
    return NextResponse.json({
        success: true,
        version: APP_VERSION,
        buildTime: BUILD_TIMESTAMP,
        releaseNotes: "Online WhatsApp-style voice calling, real-time notifications, HOD department routing, field assistant dispatch, and escrow completion workflow.",
        mobile: {
            latestVersion: "1.1.0",
            latestBuildNumber: 2,
            minRequiredVersion: "1.0.0",
            downloadUrl: "https://wheelofcomfort.vercel.app/downloads/wheelofcomfort.apk",
            releaseNotes: "Online WhatsApp-style voice calling, real-time Android system notifications, HOD department routing, and field assistant dispatch.",
            forceUpdate: false
        }
    }, {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
    });
}
