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
    // ESM files use .mjs extension for proper module resolution
    exports[exportPath] = {
      types: `${typesPath}/index.d.ts`,
      import: `${distPath}/index.mjs`,
      require: `${distPath}/index.js`,
    };
  }

  return exports;
}

// These match the export subpaths. For every subpath we publish a tiny
// `package.json` proxy at the package root (e.g. `plugins/persist/package.json`)
// whose `main`/`module`/`types` fields point into `dist/`.
//
// Why: resolvers that predate the Node `exports` field (notably Jest 27, which
// ships with Create React App / react-scripts 5) ignore `exports` and resolve
// subpaths purely by filesystem lookup. Without these proxies a consumer doing
// `import x from "redux-astroglide/plugins/persist"` under Jest 27 gets
// "Cannot find module". Modern Node and bundlers keep using the `exports`
// field; the proxies are a zero-cost fallback for older toolchains.
function syncProxyPackages(subpackages) {
  if (process.argv.includes("--check")) {
    console.log(
      "✓ Skipping proxy package.json generation (--check is read-only)"
    );
    return;
  }

  let written = 0;

  for (const sub of subpackages) {
    if (!sub) continue; // skip root package

    const proxyDir = path.join(ROOT_DIR, sub);
    const proxyPath = path.join(proxyDir, "package.json");

    const cjsFile = path.join(ROOT_DIR, "dist", sub, "index.js");
    const mjsFile = path.join(ROOT_DIR, "dist", sub, "index.mjs");
    const typesFile = path.join(ROOT_DIR, "dist", "types", sub, "index.d.ts");

    const proxy = {
      private: true,
      main: path.relative(proxyDir, cjsFile),
      module: path.relative(proxyDir, mjsFile),
    };

    if (fs.existsSync(typesFile)) {
      proxy.types = path.relative(proxyDir, typesFile);
    }

    fs.mkdirSync(proxyDir, { recursive: true });
    fs.writeFileSync(proxyPath, JSON.stringify(proxy, null, 2) + "\n");
    written += 1;
  }

  console.log(
    `✓ Wrote ${written} proxy package.json file(s) for legacy resolvers`
  );
}

function main() {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf-8"));
  const newExports = generateExportsField(SUBPACKAGES);

  const currentExports = JSON.stringify(packageJson.exports || {}, null, 2);
  const generatedExports = JSON.stringify(newExports, null, 2);

  if (currentExports === generatedExports) {
    console.log("✓ package.json exports field is already in sync");
    syncProxyPackages(SUBPACKAGES);
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

  // Keep legacy-resolver proxy package.json files in sync with the exports map.
  syncProxyPackages(SUBPACKAGES);
}

main();
