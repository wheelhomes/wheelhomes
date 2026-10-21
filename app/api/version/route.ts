import { NextResponse } from 'next/server';

// Current web application version and build stamp
const APP_VERSION = "1.0.1";
const BUILD_TIMESTAMP = 1729519200000;

export async function GET() {
    return NextResponse.json({
        success: true,
        version: APP_VERSION,
        buildTime: BUILD_TIMESTAMP,
        releaseNotes: "Streamlined user roles (Clients, Service Providers, and Real Estate Agents), property listing tools, and performance enhancements.",
        mobile: {
            latestVersion: "1.0.0",
            latestBuildNumber: 1,
            minRequiredVersion: "1.0.0",
            downloadUrl: "https://wheelhomes.com/downloads/wheelofcomfort.apk",
            releaseNotes: "Streamlined user roles (Clients, Service Providers, and Real Estate Agents), performance enhancements, and direct job dispatches.",
            forceUpdate: false
        }
    }, {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
    });
}
