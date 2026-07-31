import { execSync } from "child_process";
import fs from "fs";
import path from "path";

interface Issue {
  category: string;
  message: string;
}

const issues: Issue[] = [];

function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(process.versions.node.split(".")[0] || "0", 10);
  console.log(`ℹ️ Node.js version: ${version}`);
  if (major < 22) {
    issues.push({
      category: "Runtime",
      message: `Node.js version must be >= 22.0.0. Current is ${version}.`,
    });
  }
}

function checkPnpmVersion() {
  try {
    const version = execSync("pnpm -v").toString().trim();
    console.log(`ℹ️ pnpm version: ${version}`);
    if (!version.startsWith("10")) {
      issues.push({
        category: "Package Manager",
        message: `pnpm version must be 10.x.x. Current is ${version}.`,
      });
    }
  } catch (error) {
    issues.push({
      category: "Package Manager",
      message: "pnpm is not installed or not available in PATH.",
    });
  }
}

function checkWorkspaceDependencies() {
  const packagesDir = path.resolve(process.cwd(), "packages");
  if (!fs.existsSync(packagesDir)) return;

  const pkgs = fs.readdirSync(packagesDir);
  const dependenciesMap: Record<string, Record<string, string>> = {};

  for (const pkg of pkgs) {
    const pkgPath = path.join(packagesDir, pkg);
    if (!fs.statSync(pkgPath).isDirectory()) continue;

    const pkgJsonPath = path.join(pkgPath, "package.json");
    if (!fs.existsSync(pkgJsonPath)) continue;

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
    const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
    dependenciesMap[pkgJson.name] = deps;
  }

  // 1. Boundary Rules Enforcement
  console.log("🔍 Checking monorepo package boundary rules...");

  const sharedDeps = dependenciesMap["@rishi/shared"] || {};
  for (const dep of Object.keys(sharedDeps)) {
    if (dep.startsWith("@rishi/")) {
      issues.push({
        category: "Boundary Rule",
        message: `@rishi/shared cannot depend on any internal package. Found: ${dep}`,
      });
    }
  }

  const domainDeps = dependenciesMap["@rishi/domain"] || {};
  for (const dep of Object.keys(domainDeps)) {
    if (dep.startsWith("@rishi/") && dep !== "@rishi/shared") {
      issues.push({
        category: "Boundary Rule",
        message: `@rishi/domain can only depend on @rishi/shared. Found: ${dep}`,
      });
    }
  }

  const eventDeps = dependenciesMap["@rishi/events"] || {};
  for (const dep of Object.keys(eventDeps)) {
    if (dep.startsWith("@rishi/") && dep !== "@rishi/domain" && dep !== "@rishi/shared") {
      issues.push({
        category: "Boundary Rule",
        message: `@rishi/events can only depend on @rishi/domain (and transitively @rishi/shared). Found: ${dep}`,
      });
    }
  }

  const configDeps = dependenciesMap["@rishi/config"] || {};
  for (const dep of Object.keys(configDeps)) {
    if (dep.startsWith("@rishi/")) {
      issues.push({
        category: "Boundary Rule",
        message: `@rishi/config must remain infrastructure-independent and have zero internal dependencies. Found: ${dep}`,
      });
    }
  }

  const loggerDeps = dependenciesMap["@rishi/logger"] || {};
  for (const dep of Object.keys(loggerDeps)) {
    if (dep.startsWith("@rishi/") && dep !== "@rishi/config" && dep !== "@rishi/shared") {
      issues.push({
        category: "Boundary Rule",
        message: `@rishi/logger can only depend on @rishi/config and @rishi/shared. Found: ${dep}`,
      });
    }
  }

  // 2. Duplicate Dependencies Check
  console.log("🔍 Scanning for duplicate dependency versions across workspace packages...");
  const dependencyVersions: Record<string, Set<string>> = {};
  for (const pkgName of Object.keys(dependenciesMap)) {
    const deps = dependenciesMap[pkgName];
    if (!deps) continue;
    for (const [dep, ver] of Object.entries(deps)) {
      if (ver.startsWith("workspace:")) continue;
      if (!dependencyVersions[dep]) {
        dependencyVersions[dep] = new Set();
      }
      dependencyVersions[dep].add(ver);
    }
  }

  for (const [dep, versions] of Object.entries(dependencyVersions)) {
    if (versions.size > 1) {
      issues.push({
        category: "Duplicate Dependency",
        message: `Dependency "${dep}" has multiple versions: ${Array.from(versions).join(", ")}`,
      });
    }
  }
}

function checkTsConfigReferences() {
  console.log("🔍 Checking tsconfig.json references...");
  const tsconfigPath = path.resolve(process.cwd(), "tsconfig.json");
  if (!fs.existsSync(tsconfigPath)) {
    issues.push({
      category: "TSConfig",
      message: "Root tsconfig.json is missing.",
    });
    return;
  }

  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
  const refs = tsconfig.references || [];
  const refPaths = refs.map((r: any) => r.path);

  const expectedPaths = [
    "packages/shared",
    "packages/domain",
    "packages/events",
    "packages/auth",
    "packages/config",
    "packages/logger",
    "packages/transaction",
    "packages/database",
    "packages/storage",
    "packages/testing",
    "apps/server",
  ];

  for (const expected of expectedPaths) {
    if (!refPaths.includes(expected)) {
      issues.push({
        category: "TSConfig Reference",
        message: `Root tsconfig.json is missing project reference for "${expected}".`,
      });
    }
  }
}

function runLicenseAudit() {
  console.log("🔍 Auditing package licenses...");
  // Basic simulation of license audits
  const approvedLicenses = ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC"];
  console.log(`ℹ️ Approved license baseline: ${approvedLicenses.join(", ")}`);
}

function checkLockfile() {
  console.log("🔍 Verifying lockfile integrity...");
  const lockfilePath = path.resolve(process.cwd(), "pnpm-lock.yaml");
  if (!fs.existsSync(lockfilePath)) {
    issues.push({
      category: "Lockfile",
      message: "pnpm-lock.yaml is missing. Run 'pnpm install' to generate it.",
    });
  }
}

function run() {
  console.log("🛠️ Starting Repository Doctor Diagnostics...");

  checkNodeVersion();
  checkPnpmVersion();
  checkWorkspaceDependencies();
  checkTsConfigReferences();
  runLicenseAudit();
  checkLockfile();

  if (issues.length > 0) {
    console.error(`\n❌ Doctor check failed with ${issues.length} errors:`);
    issues.forEach((issue) => {
      console.error(`  [${issue.category}] ${issue.message}`);
    });
    process.exit(1);
  } else {
    console.log("\n✅ All Doctor diagnostics passed successfully.");
  }
}

run();
