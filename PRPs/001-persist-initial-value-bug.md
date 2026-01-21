# PRP: Persist Plugin Initial Value Storage Bug

## Goal

### Feature Goal

Fix the persist plugin's `getInitialValue` function to store initial values to localStorage on first load, ensuring consistent persistence behavior across sessions.

### Deliverable

1. Modified `src/plugins/persist/index.ts` - `getInitialValue` function stores initial value when no persisted value exists
2. Jest + React Testing Library test infrastructure setup
3. Test suite for persist plugin covering initial value storage, retrieval, and updates

### Success Definition

- On first page load with `persist("default")`, the value `"default"` is immediately stored to localStorage
- Subsequent page loads retrieve the stored value correctly
- All tests pass with `npm test`
- Build succeeds with `npm run build`

---

## Context

### Relevant Files

```yaml
primary:
  - path: src/plugins/persist/index.ts
    reason: Contains the bug in getInitialValue function (lines 70-82)
    patterns:
      - getPersistedValue for retrieval
      - storePersistedValue for storage
      - Storage type abstraction for localStorage/custom storage
      - Namespace-based key organization (sliceConfig.name)

  - path: src/astroglide.ts
    reason: Orchestrates plugin lifecycle - calls getInitialValue at lines 101-108
    patterns:
      - Plugin iteration with while loop (lines 83-97)
      - getInitialValue called for each active plugin (lines 101-108)
      - Final value assignment at line 110

secondary:
  - path: src/plugins/service.ts
    reason: Plugin base class definition, shows plugin interface contract
    patterns:
      - plugin() factory function
      - PluginClass interface with setup/getInitialValue/update methods

  - path: src/plugins/plugins.d.ts
    reason: TypeScript types for plugin system
    patterns:
      - getInitialValueConfig type definition
      - PluginConfig and PluginClass types

  - path: src/reducers.ts
    reason: Shows how update() is called via setters (line 43-50)
    patterns:
      - makeSetterReducersFromInitialState creates setter reducers
      - plugin.update() called within reducer (line 44)

  - path: package.json
    reason: Dependencies and scripts configuration
    patterns:
      - devDependencies structure
      - scripts object for test commands
```

### External References

```yaml
documentation:
  - url: https://jestjs.io/docs/getting-started
    topic: Jest configuration basics

  - url: https://kulshekhar.github.io/ts-jest/docs/getting-started/presets
    topic: ts-jest preset configuration for TypeScript

  - url: https://testing-library.com/docs/react-testing-library/api#renderhook
    topic: Testing React hooks with renderHook

  - url: https://redux.js.org/usage/writing-tests
    topic: Redux testing best practices

  - url: https://github.com/clarkbw/jest-localstorage-mock
    topic: jest-localstorage-mock for mocking localStorage
```

### Gotchas & Pitfalls

```yaml
- issue: The persist plugin accesses window.localStorage at module load time (line 4)
  mitigation: Jest's jsdom environment provides window.localStorage, but ensure setupTests.ts runs before any plugin imports

- issue: storePersistedValue catches errors silently (lines 29-33)
  mitigation: Tests should verify localStorage.setItem was called, not just check absence of errors

- issue: Plugin uses `this.config` in update() but getInitialValue doesn't have access to instance
  mitigation: Use the storageType passed via closure, not this.config, in getInitialValue fix

- issue: getPersistedValue returns undefined for missing keys vs null
  mitigation: Use strict undefined check (value !== undefined) not falsy check

- issue: Jest resetMocks option can break localStorage mock state
  mitigation: Set resetMocks: false in jest.config.js
```

---

## Implementation Tasks

### Task 1: Install Test Dependencies

**Depends on:** None
**Files:** `package.json`
**Action:**

```bash
pnpm add -D jest ts-jest @types/jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-localstorage-mock jest-environment-jsdom identity-obj-proxy
```

Add to package.json scripts:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**Verification:** `pnpm test` runs (may fail with no tests yet)

---

### Task 2: Create Jest Configuration

**Depends on:** Task 1
**Files:** Create `jest.config.js`
**Action:**
Create `jest.config.js` in project root:

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  resetMocks: false,
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts", "!src/index.ts"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
};
```

**Verification:** `pnpm test` runs without configuration errors

---

### Task 3: Create Test Setup File

**Depends on:** Task 2
**Files:** Create `src/setupTests.ts`
**Action:**
Create `src/setupTests.ts`:

```typescript
import "@testing-library/jest-dom";
import "jest-localstorage-mock";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  jest.clearAllMocks();
});
```

**Verification:** Test setup loads without errors

---

### Task 4: Fix the getInitialValue Bug

**Depends on:** None (can be done in parallel with Tasks 1-3)
**Files:** `src/plugins/persist/index.ts`
**Action:**

Locate the `getInitialValue` function (lines 70-82). Current code:

```typescript
getInitialValue(value, { sliceConfig, key }) {
  const existingPersistedValue = getPersistedValue(
    key,
    sliceConfig.name,
    storageType
  );

  if (existingPersistedValue !== undefined) {
    return existingPersistedValue;
  }

  return value;
},
```

Change to:

```typescript
getInitialValue(value, { sliceConfig, key }) {
  const existingPersistedValue = getPersistedValue(
    key,
    sliceConfig.name,
    storageType
  );

  if (existingPersistedValue !== undefined) {
    return existingPersistedValue;
  }

  // Store initial value to localStorage for consistency across sessions
  storePersistedValue(key, sliceConfig.name, value, storageType);
  return value;
},
```

**Verification:**

1. Build succeeds: `pnpm run build`
2. Manual test: Clear localStorage, create slice with `persist("test")`, check localStorage contains the value

---

### Task 5: Create Persist Plugin Test Suite

**Depends on:** Tasks 1-4
**Files:** Create `src/plugins/persist/__tests__/persist.test.ts`
**Action:**

Create test file with comprehensive coverage:

```typescript
import {
  getPersistedValue,
  storePersistedValue,
  getPersistedStore,
} from "../index";

// Import the default export to test the plugin factory
import createPersistPlugin from "../index";

const PERSISTENCE_KEY = "astroglide-persist";

describe("persist plugin", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe("storePersistedValue", () => {
    it("stores value with namespace", () => {
      storePersistedValue("theme", "settings", "dark");

      const stored = JSON.parse(localStorage.getItem(PERSISTENCE_KEY) || "{}");
      expect(stored.settings.theme).toBe("dark");
    });

    it("stores value without namespace", () => {
      storePersistedValue("globalKey", undefined, "globalValue");

      const stored = JSON.parse(localStorage.getItem(PERSISTENCE_KEY) || "{}");
      expect(stored.globalKey).toBe("globalValue");
    });

    it("preserves existing values when adding new ones", () => {
      storePersistedValue("key1", "ns", "value1");
      storePersistedValue("key2", "ns", "value2");

      const stored = JSON.parse(localStorage.getItem(PERSISTENCE_KEY) || "{}");
      expect(stored.ns.key1).toBe("value1");
      expect(stored.ns.key2).toBe("value2");
    });
  });

  describe("getPersistedValue", () => {
    it("returns undefined for non-existent key", () => {
      expect(getPersistedValue("missing", "ns")).toBeUndefined();
    });

    it("returns stored value with namespace", () => {
      storePersistedValue("key", "ns", "value");
      expect(getPersistedValue("key", "ns")).toBe("value");
    });

    it("returns undefined for non-existent namespace", () => {
      storePersistedValue("key", "ns1", "value");
      expect(getPersistedValue("key", "ns2")).toBeUndefined();
    });
  });

  describe("getPersistedStore", () => {
    it("returns empty object when localStorage is empty", () => {
      expect(getPersistedStore()).toEqual({});
    });

    it("returns parsed store from localStorage", () => {
      localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({ test: "data" }));
      expect(getPersistedStore()).toEqual({ test: "data" });
    });
  });

  describe("plugin getInitialValue", () => {
    it("returns existing persisted value when present", () => {
      storePersistedValue("mode", "theme", "dark");

      const plugin = createPersistPlugin();
      const result = plugin.getInitialValue("light", {
        sliceConfig: { name: "theme", initialState: {} },
        key: "mode",
      });

      expect(result).toBe("dark");
    });

    it("stores and returns initial value when no persisted value exists", () => {
      const plugin = createPersistPlugin();
      const result = plugin.getInitialValue("system", {
        sliceConfig: { name: "theme", initialState: {} },
        key: "mode",
      });

      expect(result).toBe("system");
      expect(getPersistedValue("mode", "theme")).toBe("system");
    });

    it("stores initial value to localStorage on first access", () => {
      const plugin = createPersistPlugin();

      // Before: localStorage should be empty
      expect(getPersistedValue("setting", "mySlice")).toBeUndefined();

      // Call getInitialValue
      plugin.getInitialValue("default", {
        sliceConfig: { name: "mySlice", initialState: {} },
        key: "setting",
      });

      // After: localStorage should contain the initial value
      expect(getPersistedValue("setting", "mySlice")).toBe("default");
    });
  });

  describe("plugin update", () => {
    it("stores updated value to localStorage", () => {
      const plugin = createPersistPlugin();

      plugin.update("newValue", {
        key: "testKey",
        sliceConfig: { name: "testSlice", initialState: {} },
      });

      expect(getPersistedValue("testKey", "testSlice")).toBe("newValue");
    });

    it("returns the value unchanged", () => {
      const plugin = createPersistPlugin();

      const result = plugin.update("testValue", {
        key: "key",
        sliceConfig: { name: "slice", initialState: {} },
      });

      expect(result).toBe("testValue");
    });
  });

  describe("plugin with custom storage", () => {
    it("uses provided storage type", () => {
      const customStorage = {
        getItem: jest.fn().mockReturnValue("{}"),
        setItem: jest.fn(),
      };

      const plugin = createPersistPlugin({ storageType: customStorage });

      plugin.getInitialValue("value", {
        sliceConfig: { name: "test", initialState: {} },
        key: "key",
      });

      expect(customStorage.setItem).toHaveBeenCalled();
    });
  });
});
```

**Verification:** `pnpm test` passes all tests

---

### Task 6: Verify Build and All Tests Pass

**Depends on:** Tasks 1-5
**Files:** None (verification only)
**Action:**

```bash
pnpm run build
pnpm test
pnpm test:coverage
```

**Verification:**

- Build completes without errors
- All tests pass
- Coverage report shows persist plugin is covered

---

## Validation Gates

### Pre-Implementation

- [ ] Understand the plugin lifecycle in `astroglide.ts` (lines 70-112)
- [ ] Understand the current `getInitialValue` behavior (lines 70-82 in persist/index.ts)
- [ ] Understand how `storePersistedValue` works (lines 14-34)

### During Implementation

- [ ] Test dependencies install successfully
- [ ] Jest configuration works with TypeScript
- [ ] localStorage mock functions correctly in tests
- [ ] Bug fix compiles without TypeScript errors

### Post-Implementation

- [ ] `pnpm run build` succeeds
- [ ] `pnpm test` passes all tests
- [ ] Manual verification: clear localStorage, create slice with persist(), verify value stored
- [ ] Existing functionality not broken (slice creation, hooks, updates)

### Test Commands

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Run tests in watch mode during development
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Build the library
pnpm run build
```

---

## Final Validation Checklist

- [ ] Bug fixed: `getInitialValue` stores initial value when no persisted value exists
- [ ] Test infrastructure: Jest + RTL + localStorage mock configured
- [ ] Test coverage: persist plugin has comprehensive test suite
- [ ] Build passes: `pnpm run build` succeeds
- [ ] All tests pass: `pnpm test` reports no failures
- [ ] No regressions: existing slice creation and hook functionality works
- [ ] Documentation: README doesn't need updates (persist behavior is now as documented)

---

## Confidence Score

**Implementation Success Likelihood:** 9/10

**Reasoning:**

- The bug fix is a single-line addition with clear before/after state
- The fix location is precisely identified (line 81 in persist/index.ts)
- Jest + RTL setup is well-documented with standard patterns
- localStorage mocking is straightforward with jest-localstorage-mock
- All file paths, line numbers, and code patterns are explicitly provided
- Test cases cover the exact behavior change being made

**Risk factors:**

- Minor: May need to adjust jest.config.js for specific project quirks
- Minor: TypeScript version (4.7) may need ts-jest configuration tweaks
