const fs = require("fs");
const path = require("path");

// Files to copy to dist/
const distFiles = [
  { src: "README.md", dest: "dist/README.md" },
  { src: "README.es.md", dest: "dist/README.es.md" },
  { src: "LICENSE", dest: "dist/LICENSE" },
];

// Files to copy to dist/browser/
const browserFiles = [
  { src: "dist/kick-wss.min.js", dest: "dist/browser/kick-wss.min.js" },
  { src: "dist/kick-wss.min.js.map", dest: "dist/browser/kick-wss.min.js.map" },
  { src: "dist/kick-wss.js", dest: "dist/browser/kick-wss.js" },
];

function ensureDir(dirPath) {
  const fullPath = path.join(__dirname, "..", dirPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created directory: ${dirPath}`);
  }
}

function copyFile(src, dest) {
  const srcPath = path.join(__dirname, "..", src);
  const destPath = path.join(__dirname, "..", dest);

  try {
    fs.copyFileSync(srcPath, destPath);
    console.log(`✅ Copied: ${src} -> ${dest}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to copy ${src}:`, error.message);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const target = args[0];

  if (target === "dist") {
    console.log("📁 Copying files to dist/...");
    ensureDir("dist");

    let success = true;
    for (const file of distFiles) {
      if (!copyFile(file.src, file.dest)) {
        success = false;
      }
    }

    if (success) {
      console.log("✅ All files copied to dist/");
    } else {
      console.log("❌ Some files failed to copy to dist/");
      process.exit(1);
    }
  } else if (target === "browser") {
    console.log("📁 Copying files to dist/browser/...");
    ensureDir("dist/browser");

    let success = true;
    for (const file of browserFiles) {
      if (!copyFile(file.src, file.dest)) {
        success = false;
      }
    }

    if (success) {
      console.log("✅ All files copied to dist/browser/");
    } else {
      console.log("❌ Some files failed to copy to dist/browser/");
      process.exit(1);
    }
  } else {
    console.log("Usage: node copy-files.cjs [dist|browser]");
    console.log("  dist    - Copy README files and LICENSE to dist/");
    console.log("  browser - Copy bundled files to dist/browser/");
    process.exit(1);
  }
}

main();
