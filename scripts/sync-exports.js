#!/usr/bin/env node

/**
 * Sync package.json exports field with rollup config
 *
 * This script ensures the exports field in package.json stays in sync
 * with the subpackages defined in rollup.config.js.
 *
 * Run with: node scripts/sync-exports.js
 * Or use: npm run sync:exports
 */

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, "package.json");

// These should match the exports in rollup.config.js
// Update this array when adding new subpackages
const SUBPACKAGES = [
  "", // root package
  "plugins",
  "plugins/set",
  "plugins/type",
  "plugins/persist",
  "selectors",
];

function generateExportsField(subpackages) {
  const exports = {};

  for (const pkg of subpackages) {
    const exportPath = pkg ? `./${pkg}` : ".";
    const distPath = pkg ? `./dist/${pkg}` : "./dist";
    const typesPath = pkg ? `./dist/types/${pkg}` : "./dist/types";

    // Note: "types" must be first for TypeScript compatibility
    exports[exportPath] = {
      types: `${typesPath}/index.d.ts`,
      import: `${distPath}/index.es.js`,
      require: `${distPath}/index.js`,
    };
  }

  return exports;
}

function main() {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf-8"));
  const newExports = generateExportsField(SUBPACKAGES);

  const currentExports = JSON.stringify(packageJson.exports || {}, null, 2);
  const generatedExports = JSON.stringify(newExports, null, 2);

  if (currentExports === generatedExports) {
    console.log("✓ package.json exports field is already in sync");
    return;
  }

  // Check if --check flag is passed (for CI)
  if (process.argv.includes("--check")) {
    console.error("✗ package.json exports field is out of sync!");
    console.error("\nExpected exports:");
    console.error(generatedExports);
    console.error("\nCurrent exports:");
    console.error(currentExports);
    console.error("\nRun 'npm run sync:exports' to fix this.");
    process.exit(1);
  }

  // Update package.json
  packageJson.exports = newExports;

  // Preserve key order: move exports to after author
  const orderedPackageJson = {};
  for (const key of Object.keys(packageJson)) {
    orderedPackageJson[key] = packageJson[key];
    if (key === "author") {
      orderedPackageJson.exports = newExports;
    }
  }
  // Remove duplicate exports key if it was at a different position
  if (
    packageJson.exports &&
    Object.keys(packageJson).indexOf("exports") !== -1
  ) {
    delete orderedPackageJson.exports;
    // Re-add in correct position
    const finalJson = {};
    for (const key of Object.keys(orderedPackageJson)) {
      finalJson[key] = orderedPackageJson[key];
      if (key === "author") {
        finalJson.exports = newExports;
      }
    }
    fs.writeFileSync(
      PACKAGE_JSON_PATH,
      JSON.stringify(finalJson, null, 2) + "\n"
    );
  } else {
    fs.writeFileSync(
      PACKAGE_JSON_PATH,
      JSON.stringify(orderedPackageJson, null, 2) + "\n"
    );
  }

  console.log("✓ Updated package.json exports field");
  console.log("\nExports:");
  for (const [key, value] of Object.entries(newExports)) {
    console.log(`  ${key}`);
  }
}

main();
