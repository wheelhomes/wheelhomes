import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  // If an external cloud URL (e.g. Firebase Storage or GitHub release) is configured:
  const cloudUrl = process.env.APK_DOWNLOAD_URL || process.env.NEXT_PUBLIC_APK_URL;
  if (cloudUrl && cloudUrl.startsWith("http")) {
    return NextResponse.redirect(cloudUrl);
  }

  // Check local files in public/downloads
  const localApkPath = path.join(process.cwd(), "public", "downloads", "wheelofcomfort.apk");
  
  if (fs.existsSync(localApkPath)) {
    const stat = fs.statSync(localApkPath);
    const fileStream = fs.createReadStream(localApkPath);

    // Convert ReadStream to Web ReadableStream
    const stream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": 'attachment; filename="wheelofcomfort.apk"',
        "Content-Length": stat.size.toString(),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  }

  // If APK is not yet in public folder, check build output directory directly
  const buildOutputs = [
    path.join(process.cwd(), "mobile", "build", "app", "outputs", "flutter-apk", "app-arm64-v8a-release.apk"),
    path.join(process.cwd(), "mobile", "build", "app", "outputs", "flutter-apk", "app-release.apk"),
    path.join(process.cwd(), "mobile", "build", "app", "outputs", "flutter-apk", "app-armeabi-v7a-release.apk"),
    path.join(process.cwd(), "mobile", "build", "app", "outputs", "flutter-apk", "app-debug.apk"),
  ];

  for (const candidate of buildOutputs) {
    if (fs.existsSync(candidate)) {
      const stat = fs.statSync(candidate);
      const fileStream = fs.createReadStream(candidate);
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
      });

      return new NextResponse(stream as any, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.android.package-archive",
          "Content-Disposition": 'attachment; filename="wheelofcomfort.apk"',
          "Content-Length": stat.size.toString(),
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }
  }

  return NextResponse.json(
    {
      error: "APK not ready yet",
      message: "The mobile app release build is currently being packaged. Please check back in a moment.",
    },
    { status: 404 }
  );
}
