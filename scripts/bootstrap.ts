import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function run() {
  console.log("🚀 Bootstrapping Rishi AI Workspace...");

  // Install Husky hooks
  try {
    console.log("📦 Initializing Husky Git Hooks...");
    execSync("npx husky", { stdio: "inherit" });
  } catch (error) {
    console.warn(
      "⚠️ Warning: Failed to initialize Husky hooks. Make sure you are in a Git repository.",
      error
    );
  }

  // Create .env from template if not exists
  const envPath = path.resolve(process.cwd(), ".env");
  const envExamplePath = path.resolve(process.cwd(), ".env.example");
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log("📝 Creating local .env from template .env.example...");
    fs.copyFileSync(envExamplePath, envPath);
  }

  console.log("✅ Bootstrap Completed Successfully.");
}

run();
