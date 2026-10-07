import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const apkDir = path.join(rootDir, "mobile", "build", "app", "outputs", "flutter-apk");
const destDir = path.join(rootDir, "public", "downloads");
const destPath = path.join(destDir, "wheelofcomfort.apk");

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const candidates = [
  "app-arm64-v8a-release.apk",
  "app-release.apk",
  "app-armeabi-v7a-release.apk",
  "app-debug.apk",
];

let foundFile = null;
for (const file of candidates) {
  const full = path.join(apkDir, file);
  if (fs.existsSync(full)) {
    foundFile = full;
    break;
  }
}

if (!foundFile) {
  console.log("⏳ No APK found yet. Build is still running in Gradle...");
  process.exit(1);
}

const stat = fs.statSync(foundFile);
const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);

console.log(`📦 Found APK: ${path.basename(foundFile)} (${sizeMb} MB)`);
console.log(`📋 Copying to public/downloads/wheelofcomfort.apk...`);

fs.copyFileSync(foundFile, destPath);

console.log(`✅ Successfully deployed APK to website downloads!`);
console.log(`🌐 Live route: /api/download-apk & /downloads/wheelofcomfort.apk`);
console.log(`File size: ${sizeMb} MB`);
