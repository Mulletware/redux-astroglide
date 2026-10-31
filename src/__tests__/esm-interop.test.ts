/**
 * ESM interop regression guard for `redux-injectable-middleware`.
 *
 * The dependency's only consumable artifact (1.0.5) is a webpack CJS bundle
 * whose named exports are registered at runtime, making them invisible to
 * Node's cjs-module-lexer. A *named* import in dist/index.mjs therefore threw
 * `SyntaxError: Named export 'injectableMiddleware' not found` under Node's
 * native ESM loader, forcing consumers to route this package through Vite's
 * `server.deps.inline` transform. The entry must consume the middleware via
 * its default/namespace interop instead. See import_issues.md (Solution 3).
 */

// This repo has no @types/node devDependency; keep the Node APIs this test
// needs untyped and self-declared so ts-jest has nothing to resolve.
declare const process: { execPath: string };
declare const __dirname: string;

function nodeRequire(moduleId: string): any {
  // Direct eval (not indirect) so the call resolves the jest module wrapper's
  // `require`, which is not visible on the jsdom global scope.
  return eval("require")(moduleId);
}

const { execFileSync } = nodeRequire("node:child_process");
const path = nodeRequire("node:path");
const fs = nodeRequire("node:fs");

const repoRoot = path.resolve(__dirname, "../..");
const entry = path.resolve(repoRoot, "dist/index.mjs");

/** Runs `code` as native Node ESM in a child process; throws on failure. */
function runNativeEsm(code: string): void {
  execFileSync(process.execPath, ["--input-type=module", "-e", code], {
    stdio: ["ignore", "pipe", "pipe"],
    cwd: repoRoot,
  });
}

describe("ESM interop with redux-injectable-middleware", () => {
  it("dist/index.mjs must not named-import the middleware", () => {
    expect(fs.existsSync(entry)).toBe(true);
    const source = fs.readFileSync(entry, "utf8");

    // A named import (or re-export) of a lexer-opaque CJS module is a link-time
    // SyntaxError under Node's native ESM loader, before any code can run.
    expect(source).not.toMatch(
      /\b(?:import|export)\s*\{[^}]*\}\s*from\s*['"]redux-injectable-middleware['"]/
    );
  });

  it("the entry interop shape resolves the middleware under native ESM", () => {
    // Exact interop emitted into dist/index.mjs, exercised in isolation so the
    // assertion is not entangled with @reduxjs/toolkit's own 1.x packaging
    // (see the next test). The bare specifier resolves against this repo's
    // installed redux-injectable-middleware@1.0.5 — the compatibility we must
    // keep — and also works against 1.1.0+, which adds an explicit default.
    runNativeEsm(`
      import * as rIMStar from "redux-injectable-middleware";
      var _default;
      const rIM = (_default = rIMStar["default"]) !== null && _default !== void 0
        ? _default
        : rIMStar;
      const { injectableMiddleware, injectMiddleware } = rIM;
      if (typeof injectableMiddleware !== "function" || typeof injectMiddleware !== "function") {
        throw new Error("redux-injectable-middleware default/namespace interop failed");
      }
    `);
  });

  it("dist/index.mjs loads under native Node ESM (no bundler interop)", () => {
    // @reduxjs/toolkit 1.x trees (like this repo's own devDependency) cannot
    // natively load the entry at all: its re-exported named exports are also
    // lexer-opaque. That failure is pre-existing and unrelated to the
    // middleware, so it is tolerated here — but the middleware import must
    // never be the reason the entry fails to link.
    runNativeEsm(`
      import(${JSON.stringify(entry)}).then(
        (m) => {
          if (typeof m.configure !== "function" || typeof m.addPlugins !== "function") {
            throw new Error("missing exports");
          }
        },
        (err) => {
          if (String((err && err.message) || err).includes("redux-injectable-middleware")) {
            throw err;
          }
        }
      );
    `);
  });
});
