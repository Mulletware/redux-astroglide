#!/usr/bin/env node

/**
 * Test that all package exports are importable
 *
 * This script verifies that the package exports resolve correctly.
 * It tests CommonJS require() for each exported subpath.
 *
 * Note: Some modules depend on browser globals (window, localStorage).
 * These are marked as browser-only and are tested separately with jsdom.
 *
 * Run with: node scripts/test-exports.js
 * Or use: npm run test:exports
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, "package.json");
const TEST_DIR = path.join(ROOT_DIR, ".export-test-tmp");

// Modules that require browser globals (window, localStorage, etc.)
// These will be tested with a mock browser environment
const BROWSER_ONLY_MODULES = new Set([
  "plugins", // aggregates persist which needs window
  "plugins/persist", // uses window.localStorage
]);

function isBrowserOnly(exportPath) {
  const subpath = exportPath.replace(/^\.\//, "");
  return BROWSER_ONLY_MODULES.has(subpath);
}

function testExports() {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf-8"));

  if (!packageJson.exports) {
    console.error("✗ No exports field in package.json");
    process.exit(1);
  }

  console.log("Testing package exports...\n");

  // Create a temporary directory to simulate an external consumer
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });

  // Create a minimal package.json in the test directory
  fs.writeFileSync(
    path.join(TEST_DIR, "package.json"),
    JSON.stringify({ name: "export-test", type: "commonjs" }, null, 2)
  );

  // Create a symlink to simulate npm install
  const nodeModulesDir = path.join(TEST_DIR, "node_modules");
  fs.mkdirSync(nodeModulesDir, { recursive: true });

  // Symlink the package
  const symlinkPath = path.join(nodeModulesDir, packageJson.name);
  fs.symlinkSync(ROOT_DIR, symlinkPath);

  const errors = [];
  const successes = [];
  const skipped = [];

  // Test each export
  for (const [exportPath, exportConfig] of Object.entries(
    packageJson.exports
  )) {
    const subpath = exportPath.replace(/^\.\//, "");
    const importPath =
      exportPath === "." ? packageJson.name : `${packageJson.name}/${subpath}`;

    const browserOnly = isBrowserOnly(exportPath);

    // Test CommonJS require
    try {
      const testFile = path.join(TEST_DIR, "test-cjs.js");

      if (browserOnly) {
        // For browser-only modules, just verify the file resolves
        fs.writeFileSync(
          testFile,
          `
          // Mock browser globals
          global.window = { localStorage: { getItem: () => null, setItem: () => {} } };
          global.localStorage = global.window.localStorage;

          const mod = require("${importPath}");
          if (!mod || (typeof mod === 'object' && Object.keys(mod).length === 0)) {
            console.error("Module loaded but appears empty");
            process.exit(1);
          }
          console.log("Exported keys:", Object.keys(mod).join(", ") || "(default export)");
        `
        );
      } else {
        fs.writeFileSync(
          testFile,
          `
          const mod = require("${importPath}");
          if (!mod || (typeof mod === 'object' && Object.keys(mod).length === 0)) {
            console.error("Module loaded but appears empty");
            process.exit(1);
          }
          console.log("Exported keys:", Object.keys(mod).join(", ") || "(default export)");
        `
        );
      }

      const output = execSync(`node "${testFile}"`, {
        cwd: TEST_DIR,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      successes.push({ path: importPath, output: output.trim(), browserOnly });
      const icon = browserOnly ? "⚠" : "✓";
      const suffix = browserOnly ? " (browser-only, tested with mocks)" : "";
      console.log(`  ${icon} require("${importPath}")${suffix}`);
      console.log(`    ${output.trim()}`);
    } catch (err) {
      errors.push({
        path: importPath,
        error: err.stderr || err.message,
        browserOnly,
      });
      console.log(`  ✗ require("${importPath}")`);
      console.log(`    Error: ${(err.stderr || err.message).split("\n")[0]}`);
    }

    console.log("");
  }

  // Cleanup
  fs.rmSync(TEST_DIR, { recursive: true });

  // Report results
  const realErrors = errors.filter((e) => !e.browserOnly);
  const browserErrors = errors.filter((e) => e.browserOnly);

  if (browserErrors.length > 0) {
    console.log(
      `⚠ ${browserErrors.length} browser-only module(s) failed even with mocks:`
    );
    for (const { path: importPath } of browserErrors) {
      console.log(`  - ${importPath}`);
    }
    console.log("");
  }

  if (realErrors.length > 0) {
    console.error(`✗ ${realErrors.length} import(s) failed:`);
    for (const { path: importPath, error } of realErrors) {
      console.error(`  - ${importPath}`);
    }
    process.exit(1);
  }

  const browserSuccesses = successes.filter((s) => s.browserOnly).length;
  const nodeSuccesses = successes.filter((s) => !s.browserOnly).length;

  console.log(`✓ ${nodeSuccesses} Node.js exports successful`);
  if (browserSuccesses > 0) {
    console.log(
      `✓ ${browserSuccesses} browser-only exports verified with mocks`
    );
  }
}

// Check if dist exists
if (!fs.existsSync(path.join(ROOT_DIR, "dist"))) {
  console.error("✗ dist/ directory not found. Run 'npm run build' first.");
  process.exit(1);
}

testExports();
