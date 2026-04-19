import { appendFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { execSync } from "child_process";
import { homedir } from "os";

const BASE_DIR = dirname(process.argv[1]);
const VERSIONS_DIR = join(BASE_DIR, "versions");
const CURRENT_LINK = join(BASE_DIR, "current");

if (!existsSync(BASE_DIR)) mkdirSync(BASE_DIR);
if (!existsSync(VERSIONS_DIR)) mkdirSync(VERSIONS_DIR);

const cmd = process.argv[2];
const arg = process.argv[3];

// ---------------- HELPERS ----------------
function normalizeVersion(version: string): string {
  // Remove 'v' prefix if present
  version = version.replace(/^v/i, '');
  
  // Add .0 if version has only 2 parts (e.g., 20.20 -> 20.20.0)
  const parts = version.split('.');
  if (parts.length === 2) {
    version = `${version}.0`;
  }
  
  return version;
}

function getNvmrcVersion(): string | null {
  const file = join(process.cwd(), ".nvmrc");
  if (!existsSync(file)) return null;

  const version = readFileSync(file, "utf-8").trim();
  return version ? normalizeVersion(version) : null;
}

async function validateVersion(version: string) {
  const url = `https://nodejs.org/dist/v${version}/`;
  const res = await fetch(url);
  return res.ok;
}

// ---------------- INSTALL ----------------
async function install(version?: string) {
  if (!version) {
    version = getNvmrcVersion() || "";
    if (!version) {
      console.log("[nodevm] No version provided and .nvmrc not found");
      console.log("Usage: nodevm install <version>");
      return;
    }
    console.log(`[nodevm] Using version from .nvmrc: ${version}`);
  } else {
    version = normalizeVersion(version);
  }
  
  const exists = await validateVersion(version);

  if (!exists) {
    console.log(`[nodevm] version v${version} does not exist`);
    return;
  }
  const url = `https://nodejs.org/dist/v${version}/node-v${version}-win-x64.zip`;
  const zipPath = join(BASE_DIR, `node-${version}.zip`);
  const extractPath = join(VERSIONS_DIR, version);

  if (existsSync(extractPath)) {
    console.log(`[nodevm] v${version} already installed`);
    return;
  }

  console.log(`[nodevm] downloading Node ${version}...`);

  const res = await fetch(url);
  if (!res.ok) throw new Error("Download failed");

  const buffer = await res.arrayBuffer();
  writeFileSync(zipPath, Buffer.from(buffer));

  console.log("[nodevm] extracting...");

  execSync(
    `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${VERSIONS_DIR}'"`
  );

  const extracted = join(VERSIONS_DIR, `node-v${version}-win-x64`);

  execSync(`rename "${extracted}" "${version}"`);
  
  // Remove the zip file
  execSync(`del "${zipPath}"`, { stdio: "ignore" });

  console.log(`[nodevm] installed Node ${version}`);
  
  // Automatically use the installed version
  use(version);
}

// ---------------- USE ----------------
function use(version?: string) {
  if (!version) {
    version = getNvmrcVersion() || "";
    if (!version) {
      console.log("[nodevm] No version provided and .nvmrc not found");
      return;
    }
  } else {
    version = normalizeVersion(version);
  }

  const versionPath = join(VERSIONS_DIR, version);

  if (!existsSync(versionPath)) {
    console.log(`[nodevm] version ${version} not installed`);
    console.log(`[nodevm] run: nodevm install ${version}`);
    return;
  }

  // Remove old symlink if exists
  if (existsSync(CURRENT_LINK)) {
    try {
      execSync(`rmdir "${CURRENT_LINK}"`, { stdio: "ignore" });
    } catch (e) {
      // Ignore errors
    }
  }

  // Create junction/symlink to the version
  try {
    execSync(`mklink /J "${CURRENT_LINK}" "${versionPath}"`, { stdio: "pipe" });
    console.log(`[nodevm] Now using Node ${version}`);
    
    // Check if current is in PATH
    const userPath = execSync('powershell -Command "[Environment]::GetEnvironmentVariable(\\"Path\\", \\"User\\")"', {
      encoding: "utf-8",
    }).trim();
    
    if (!userPath.includes(CURRENT_LINK)) {
      console.log("\n[nodevm] ⚠️  Add this to your PATH once:");
      console.log(CURRENT_LINK);
      console.log("\nRun: nodevm setup-path");
    } else {
      console.log("[nodevm] Restart your terminal or run: refreshenv");
    }
    
    execSync(`"${join(CURRENT_LINK, 'node.exe')}" --version`, { stdio: "inherit" });
  } catch (error) {
    console.error("[nodevm] Failed to create symlink. Run as Administrator or enable Developer Mode in Windows Settings.");
  }
}

// ---------------- LIST ----------------
function list() {
  const versions = readdirSync(VERSIONS_DIR);

  if (!versions.length) {
    console.log("[nodevm] no versions installed");
    return;
  }

  console.log("Installed versions:");
  versions.forEach((v) => console.log(" -", v));
}

// ---------------- MAIN ----------------
(async () => {
  switch (cmd) {
    case "install":
    case "i":
      await install(arg);
      break;

    case "use":
      use(arg);
      break;

    case "list":
      list();
      break;

    default:
      console.log(`
Usage:
  nodevm install <version> (or just: use .nvmrc)
  nodevm use <version>   (or just: use .nvmrc)
  nodevm list
  setup.bat      (one-time setup)
      `);
  }
})();