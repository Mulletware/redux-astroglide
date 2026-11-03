# redux-injectable-middleware: CJS/ESM interop blocker

**For the investigating agent.** This document is self-contained: it explains a
real, reproduced module-resolution failure that forces a downstream consumer to
carry a Vite workaround, lays out the evidence with file:line references, and
proposes three fixes. Your job is to bear down on the best approach, not to
trust the recommendation blindly. Everything below was verified on
2026-10-24 against Node v24.22.0.

---

## TL;DR

`redux-astroglide` ships modern dual ESM/CJS builds, but its **ESM entry makes
_named_ imports of `redux-injectable-middleware`**, whose only consumable
artifact is a **webpack IIFE CommonJS bundle** whose named exports are
registered through an opaque runtime helper that `cjs-module-lexer` cannot
statically detect. Node therefore throws `SyntaxError` on native ESM import of
`redux-astroglide`. The only current remedy is running astroglide through
Vite's transform pipeline (`server.deps.inline`) in the consumer's test config.
Three upstream fixes would retire that workaround; any **one** suffices. The
recommended first move is **Solution 3** (smallest diff, mechanism proven).

---

## UPDATE — 2026-10-24, later same day (from the astroglide-repo session). READ BEFORE §3

New facts supersede parts of this document. In order of impact:

1. **`redux-injectable-middleware` is an org-owned package** (Mulletware,
   same maintainer), with an agent already assigned to it — so §5's
   "archaeology?" question is answered: **no**. **Solution 1 is the primary
   fix, not "queued."** The §3 recommendation ("Solution 3 now") is rescinded.
   Solution 3 is also an _astroglide-repo_ change — it cannot be executed from
   the middleware repo at all — and survives only as a same-day stopgap if
   the middleware release slips. Do not implement it by default.
2. **§5's direct-usage question is answered**: nothing in the org imports the
   middleware except astroglide. The consumer's only references are a
   hand-written type stub (`web/src/types/vendor.d.ts:12`) and a config
   comment. Solution 2's dedupe concern is therefore moot (Solution 2 remains
   unchosen regardless).
3. **Additional rerelease requirements** (latest-standards pass, all
   verified against the installed 1.0.5 this session):
   - Preserve the export names `injectMiddleware` /
     `injectableMiddleware` exactly, and the `next`-wrapping compose
     semantics — astroglide re-exports `injectMiddleware` in its public API
     (`configure()` result), so both are load-bearing. The entire middleware
     is 24 lines (`src/index.js`); its only runtime dep is one `compose`
     import from `redux`.
   - **Ship types (`.d.ts`)** with `exports` `types` conditions. Two
     hand-rolled stubs exist _because_ 1.0.5 ships none:
     `redux-astroglide/src/types/redux-injectable-middleware.d.ts` and the
     consumer's `web/src/types/vendor.d.ts`. This release should delete both.
   - Fix `module: "src/index.js"` → point at built ESM (answers §5 bullet 3:
     yes, fix it).
   - Add `engines`, and a CI step running the §4.1 native-import one-liner so
     lexer-detectability never regresses.
   - Consider dropping the `redux` runtime dependency (inline `compose` or
     peer-dep redux) — a hard dep on all of redux for one function is not
     current practice.
4. **§4 DoD caveat**: the astroglide-side smoke test in DoD #1 still fails
   natively on RTK 1.x trees _regardless of the middleware_ — verified:
   `@reduxjs/toolkit` 1.9.7 (CJS, no `exports` map) named imports are also
   lexer-opaque (`SyntaxError: … does not provide an export named
'bindActionCreators'`). Not the middleware's fault. Scope DoD #1 to
   RTK 2+ consumer trees (the boilerplate is on 2.13.0); astroglide's peer
   range (`>=1`) is being addressed separately as part of its own
   modernization pass.
5. **Post-publish follow-ups (astroglide and consumer repos — NOT the
   middleware agent's)**: bump astroglide's `^1.0.5` to the new range; delete
   both type stubs; remove `'redux-astroglide'` from the consumer's
   `server.deps.inline`; then run DoD #1–#3.

---

## 1. The consumer symptom (why this matters)

Consumer: `/home/dustin/projects/sellario-ui-boilerplate` (the web-app
boilerplate this org's apps start from).

- `web/vitest.config.ts` carries:
  ```ts
  server: {
    deps: {
      inline: [/@reduxjs/, 'redux-astroglide', 'react-redux', 'react-transition-group', /@mui/],
    },
  },
  ```
  `server.deps.inline` tells Vite to run a package through Vite's own
  transform (which supplies CommonJS↔ESM interop) instead of letting Node's
  native ESM loader import it. Without the `redux-astroglide` entry, the web
  test suite fails to boot.
- The package is genuinely used: `web/package.json:44` pins
  `"redux-astroglide": "1.1.0"`, and `web/src/app/store.ts:2-5` imports
  `configure`, `{ addPlugins }` and three subpaths
  (`/plugins/persist`, `/plugins/set`, `/plugins/type`).
- The installed tree was verified directly:
  `node_modules/redux-astroglide/dist` is byte-identical (`diff -rq`) to this
  repo's `dist/`, and both copies of `redux-injectable-middleware` (this
  repo's and the consumer's) are version 1.0.5, byte-identical.
- Note: no lockfile was found at the consumer's root or `web/` (no
  package-lock.json / yarn.lock / pnpm-lock.yaml), so resolution evidence is
  from the installed `node_modules`, not a lockfile.

## 2. The mechanism (evidence)

### 2.1 Astroglide's packaging is otherwise modern

`package.json` (repo root): no `"type"` field; a full `exports` map with dual
conditions for `.` and five subpaths (`./plugins`, `./plugins/set`,
`./plugins/type`, `./plugins/persist`, `./selectors`):

```json
".": { "import": "./dist/index.mjs", "require": "./dist/index.js" }
```

plus `main`/`module`/`browser`/`types`. Dependencies:
`redux-injectable-middleware ^1.0.5`, `check-prop-types`, `lodash`.

### 2.2 The middleware is externalized, not bundled

`internals/utils/rollup.js` (used by `rollup.config.js` →
`makeExportedPackages`) builds every bundle with:

```js
external: [...Object.keys(dependencies), ...Object.keys(peerDependencies)];
```

So `redux-injectable-middleware` is **not** bundled into `dist/` — it remains
a runtime bare specifier, resolved by whatever imports astroglide.

### 2.3 The middleware's only artifact is lexer-opaque CommonJS

Installed `redux-injectable-middleware@1.0.5` (both copies verified
byte-identical):

- **No `exports` field, no `"type"` field.**
- `main: "dist/index.js"`, `module: "src/index.js"`.
  - `main` is a **webpack 5 production IIFE**: the file begins
    `(()=>{"use strict";var e={...}` and ends `...;module.exports=r})();`.
    Its named exports are registered at runtime through webpack's helper —
    `e.r(r),e.d(r,{injectMiddleware:()=>o,injectableMiddleware:()=>i})` —
    a shape `cjs-module-lexer` (which Node uses to sniff named exports of CJS
    modules imported from ESM) **cannot statically resolve**.
  - `module` points at **untranspiled source ESM** (`src/index.js`). Node
    ignores `module` without an `import` condition; only bundlers honor it.
    (Flagging separately: shipping raw source as `module` is its own smell.)
- Net effect: from Node's point of view the middleware is a CJS module whose
  _default_ export is knowable but whose _named_ exports are not.

### 2.4 Astroglide's ESM entry makes named imports of it

`dist/index.mjs:3`:

```js
import {
  injectableMiddleware,
  injectMiddleware,
} from "redux-injectable-middleware";
```

This is the **only** affected entry — the plugin/selector `.mjs` chunks do not
import the middleware. Named-import syntax against a CJS module requires Node
to know the CJS named exports statically, which §2.3 shows it cannot.

### 2.5 Empirical reproduction

From this repo (Node v24.22.0):

```
$ node --input-type=module -e "import { injectMiddleware } from 'redux-injectable-middleware'"
SyntaxError: Named export 'injectMiddleware' not found. The requested module
'redux-injectable-middleware' is a CommonJS module, which may not support all
module.exports as named exports.
```

A **default** import works — it resolves with keys `[ 'default',
'module.exports' ]`. So the failure is specifically the _named-import syntax_
in astroglide's ESM. Vite's SSR transform rewrites/interops that import — but
only for packages listed in `server.deps.inline`. That is the entire story of
the consumer's workaround.

---

## 3. Candidate fixes (any ONE retires the consumer exception)

### Solution 1 — fix `redux-injectable-middleware` (the proper upstream fix)

Publish a Node-loadable dual package:

- Real ESM output (e.g. `dist/index.mjs`) **plus** an `exports` map:
  ```json
  { ".": { "import": "./dist/index.mjs", "require": "./dist/index.js" } }
  ```
- Or, minimally, a lexer-friendly CJS build — replace the webpack `e.d()`
  helper pattern with statically detectable exports
  (`exports.injectMiddleware = …` / `Object.defineProperty(exports, 'injectMiddleware', { value })`).

Then release, and bump astroglide's `^1.0.5` range.

**Trade-offs.** Touches the most packages' published artifacts; needs the
middleware's build pipeline understood (it is the webpack-IIFE-producing one).
Fixes the ecosystem problem at its root: every consumer of the middleware
gains working named imports, not just astroglide.

### Solution 2 — make astroglide self-contained

Remove `redux-injectable-middleware` from the rollup `external` derivation
(`internals/utils/rollup.js`, currently
`external: [...Object.keys(dependencies), ...Object.keys(peerDependencies)]`),
so the middleware is bundled into `dist/index.mjs` / `dist/index.js`, and drop
it from `dependencies`.

**Trade-offs.** No consumer action needed beyond a version bump; the dual
builds become self-contained. Costs: bundle size grows by the middleware;
duplicate copies if consumers also use the middleware directly; semantics of
the injected middleware can no longer be deduped across packages.

### Solution 3 — change the import style in astroglide's source (cheapest)

In astroglide's source, replace the named import with a default import plus
destructure:

```js
import rIM from "redux-injectable-middleware";
const { injectableMiddleware, injectMiddleware } = rIM;
```

Proven safe: default interop works (§2.5 — keys
`[ 'default', 'module.exports' ]`), and destructuring off the default reads
the same runtime object the webpack helper populated. Ship as `1.2.0`
(minor: no API change), bump the consumer to it, then delete the consumer's
inline entry.

**Trade-offs.** Smallest possible diff; no build changes; works against the
middleware exactly as it is today. It papers over the middleware's packaging
rather than fixing it, and the destructured names are no longer verifiable at
compile time (they come off `module.exports` at runtime).

> **[SUPERSEDED by the UPDATE above — Solution 1 is primary; the middleware is
> > org-owned with an agent assigned. Solution 3 is a stopgap only, and only if
> > the middleware release slips. Retained for provenance.]**

### Recommendation

Ship **Solution 3** now to retire the consumer workaround, and queue
**Solution 1** as the real fix when the middleware's build gets attention.
Solution 2 is the right call only if the org wants astroglide dependency-free
of the middleware entirely.

---

## 4. Definition of done

Whichever solution is taken, done means ALL of:

1. Native named import works from Node:
   ```bash
   node --input-type=module -e "import { injectMiddleware } from 'redux-injectable-middleware'"
   ```
   (for Solution 1) — or, for Solutions 2/3, the same smoke test against
   `redux-astroglide`:
   ```bash
   node --input-type=module -e "import { configure, addPlugins } from 'redux-astroglide'"
   ```
2. `require` still resolves (no break for CJS consumers):
   `node -e "require('redux-astroglide')"` exits 0.
3. Consumer verification: bump/republish, then in
   `/home/dustin/projects/sellario-ui-boilerplate` remove `'redux-astroglide'`
   from `web/vitest.config.ts` `server.deps.inline`, and run the full web test
   suite (`npx vitest run --project web` from the repo root, or the gate).
   Green with the entry gone is the finish line.
4. Release hygiene: both repos release via conventional commits +
   semantic-release (see the `chore(release): … [skip ci]` tags pattern in the
   sibling `formality` repo), so the fix commit message must follow the
   convention that triggers the release (`fix:` for a patch).

## 5. Open questions for the investigating agent

- ~~Does anything in the org import `redux-injectable-middleware` **directly**
  (not through astroglide)?~~ **[ANSWERED — see UPDATE #2: no. Only astroglide
  imports it; the consumer's references are a type stub and a comment.]**
- ~~Is the middleware's webpack build pipeline still maintained, or is
  republishing it (Solution 1) archaeology?~~ **[ANSWERED — see UPDATE #1:
  org-owned, agent assigned; Solution 1 is primary.]**
- `module: "src/index.js"` points at untranspiled source. Node ignores it,
  but some bundler configurations consume `module` — worth fixing (point it
  at built ESM) in the same release that touches packaging.
- Semantic-release versioning: dropping a dependency or adding an exports map
  is a minor, not a patch — make sure the commit messages produce the intended
  bump.
