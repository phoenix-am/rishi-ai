import fs from "fs";
import path from "path";

const TARGET_DIRECTORIES = [
  "node_modules",
  "dist",
  "build",
  "tsconfig.tsbuildinfo",
  ".vitest-cache",
];

function cleanDirectory(dir: string) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (TARGET_DIRECTORIES.includes(file)) {
        console.log(`🧹 Removing directory: ${filePath}`);
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        cleanDirectory(filePath);
      }
    } else if (TARGET_DIRECTORIES.includes(file)) {
      console.log(`🧹 Removing build file: ${filePath}`);
      fs.unlinkSync(filePath);
    }
  }
}

function run() {
  console.log("🧹 Purging workspace outputs...");
  const root = process.cwd();
  cleanDirectory(root);

  // Clean root target directories if they exist
  for (const target of TARGET_DIRECTORIES) {
    const rootTarget = path.join(root, target);
    if (fs.existsSync(rootTarget)) {
      console.log(`🧹 Removing root directory: ${rootTarget}`);
      fs.rmSync(rootTarget, { recursive: true, force: true });
    }
  }
  console.log("✨ Clean completed successfully.");
}

run();
