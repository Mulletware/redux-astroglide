#!/usr/bin/env node

/**
 * Validate package.json exports field
 *
 * This script verifies that:
 * 1. All exported paths actually exist in the dist folder
 * 2. All dist subpackages have corresponding exports
 * 3. Type definitions exist for all exports
 *
 * Run with: node scripts/validate-exports.js
 * Or use: npm run validate:exports
 */

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, "package.json");
const DIST_DIR = path.join(ROOT_DIR, "dist");

function validateExports() {
  const errors = [];
  const warnings = [];

  // Load package.json
  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf-8"));
  } catch (err) {
    console.error("✗ Failed to read package.json:", err.message);
    process.exit(1);
  }

  // Check if exports field exists
  if (!packageJson.exports) {
    errors.push("Missing 'exports' field in package.json");
    console.error("✗ Missing 'exports' field in package.json");
    console.error(
      "  Run 'npm run sync:exports' to generate the exports field."
    );
    process.exit(1);
  }

  // Check if dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error("✗ dist/ directory not found. Run 'npm run build' first.");
    process.exit(1);
  }

  console.log("Validating package.json exports...\n");

  // Validate each export entry
  for (const [exportPath, exportConfig] of Object.entries(
    packageJson.exports
  )) {
    const exportName = exportPath === "." ? "(root)" : exportPath;

    // Handle string exports (simple case)
    if (typeof exportConfig === "string") {
      const fullPath = path.join(ROOT_DIR, exportConfig);
      if (!fs.existsSync(fullPath)) {
        errors.push(`Export "${exportPath}": file not found: ${exportConfig}`);
      }
      continue;
    }

    // Handle object exports (import/require/types)
    const checks = [
      { key: "import", label: "ESM" },
      { key: "require", label: "CJS" },
      { key: "types", label: "Types" },
    ];

    for (const { key, label } of checks) {
      if (exportConfig[key]) {
        const fullPath = path.join(ROOT_DIR, exportConfig[key]);
        if (fs.existsSync(fullPath)) {
          console.log(`  ✓ ${exportName} ${label}: ${exportConfig[key]}`);
        } else {
          errors.push(
            `Export "${exportPath}" ${label}: file not found: ${exportConfig[key]}`
          );
          console.log(
            `  ✗ ${exportName} ${label}: ${exportConfig[key]} (NOT FOUND)`
          );
        }
      } else if (key !== "types") {
        // types is optional but import/require should exist
        warnings.push(`Export "${exportPath}": missing "${key}" field`);
      }
    }
  }

  // Check for dist directories without exports
  const distSubdirs = findDistSubpackages(DIST_DIR);
  const exportedPaths = new Set(
    Object.keys(packageJson.exports).map((p) =>
      p === "." ? "" : p.replace(/^\.\//, "")
    )
  );

  for (const subdir of distSubdirs) {
    if (!exportedPaths.has(subdir)) {
      warnings.push(
        `dist/${subdir}/ exists but has no corresponding export in package.json`
      );
    }
  }

  // Report results
  console.log("");

  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of warnings) {
      console.log(`  ⚠ ${warning}`);
    }
    console.log("");
  }

  if (errors.length > 0) {
    console.error("Errors:");
    for (const error of errors) {
      console.error(`  ✗ ${error}`);
    }
    console.error("");
    console.error(`✗ Validation failed with ${errors.length} error(s)`);
    process.exit(1);
  }

  console.log(
    `✓ All ${
      Object.keys(packageJson.exports).length
    } exports validated successfully`
  );
}

function findDistSubpackages(distDir, prefix = "") {
  const subpackages = [];

  const entries = fs.readdirSync(distDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== "types") {
      const subpath = prefix ? `${prefix}/${entry.name}` : entry.name;

      // Check if this directory has index files (is a subpackage)
      const hasIndex = fs.existsSync(
        path.join(distDir, entry.name, "index.js")
      );
      if (hasIndex) {
        subpackages.push(subpath);
      }

      // Recurse into subdirectories
      const nested = findDistSubpackages(
        path.join(distDir, entry.name),
        subpath
      );
      subpackages.push(...nested);
    }
  }

  return subpackages;
}

validateExports();
