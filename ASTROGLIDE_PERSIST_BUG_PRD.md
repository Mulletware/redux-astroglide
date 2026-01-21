# Astroglide PersistType Unwrapping Bug

## Summary

The `astroglide` utility in `src/utils/state.js` has a bug where values wrapped with `persist()` are not properly unwrapped before being stored in the Redux slice's initial state. This causes hooks like `useMode()` to return a `PersistType` object instead of the expected primitive value.

## Affected File

`src/utils/state.js` - `createAutomatedSlice` function, lines 18-44

## Bug Description

When a slice is created with a persisted initial value:

```javascript
const themeSlice = astroglide("theme", {
  mode: persist("system"),
});
```

The `useMode()` hook returns a `PersistType` object instead of the string `"system"`.

## Root Cause Analysis

In `createAutomatedSlice`, the code iterates over `sliceConfig.initialState` and checks if each value is a `PersistType`. When it finds one:

```javascript
map(sliceConfig.initialState, (item, key) => {
  let isPersisted = item instanceof PersistType;

  if (isPersisted) {
    item.namespace = sliceConfig.name;
    persistKeys[key] = item;
    item = item.value; // Line 24: Unwraps locally, but doesn't update initialState
  }

  if (item instanceof ReducerType) {
    propTypes[key] = item.propType;
    sliceConfig.initialState[key] = item.value; // Line 29: Only updates if ReducerType
  }

  if (isPersisted) {
    const existingPersistedValue = getPersistedValue(key, sliceConfig.name);

    if (existingPersistedValue !== undefined) {
      sliceConfig.initialState[key] = existingPersistedValue; // Line 36: Only if persisted value exists
    } else {
      storePersistedValue(key, sliceConfig.name, item.value); // Line 38: BUG - item.value is undefined
    }
  }
});
```

### Problem 1: Initial State Never Updated

At line 24, `item` is reassigned to `item.value` (the unwrapped primitive), but `sliceConfig.initialState[key]` is **never updated** with this unwrapped value unless:

1. The value is also a `ReducerType` (line 29) - rare case
2. An existing persisted value exists in localStorage (line 36) - only on subsequent loads

On first load with no localStorage data, `sliceConfig.initialState[key]` retains the `PersistType` object.

### Problem 2: Incorrect Value Stored to localStorage

At line 38, `storePersistedValue` is called with `item.value`, but at this point `item` has already been reassigned to the unwrapped string value. So `item.value` is `undefined`, and `undefined` gets stored to localStorage.

## Reproduction Steps

1. Create a new slice with a persisted value:

   ```javascript
   const mySlice = astroglide("mySlice", {
     setting: persist("default"),
   });
   ```

2. Clear localStorage (or use fresh browser)

3. Use the generated hook:
   ```javascript
   const [setting] = useSetting();
   console.log(setting); // Logs: PersistType { value: "default", ... }
   console.log(typeof setting); // Logs: "object" (expected: "string")
   ```

## Expected Behavior

- `useSetting()` should return `"default"` (the primitive value)
- localStorage should store `"default"` under the appropriate key

## Actual Behavior

- `useSetting()` returns `PersistType { value: "default", namespace: "mySlice", ... }`
- localStorage stores `undefined`

## Applied Fix

Two changes were made to `src/utils/state.js`:

### Fix 1: Update initialState after unwrapping (line 25-26)

```javascript
if (isPersisted) {
  item.namespace = sliceConfig.name;
  persistKeys[key] = item;
  item = item.value;
  sliceConfig.initialState[key] = item; // ADD THIS LINE
}
```

### Fix 2: Use correct value for localStorage (line 41)

```javascript
} else {
  storePersistedValue(key, sliceConfig.name, item);  // Changed from item.value
}
```

## Test Cases

The fix should satisfy these test cases:

1. **First load (no localStorage)**

   - Hook returns unwrapped primitive value
   - localStorage contains the primitive value

2. **Subsequent load (with localStorage)**

   - Hook returns value from localStorage
   - Behavior unchanged from before

3. **Persisted + ReducerType combo**

   - Both wrappers unwrapped correctly
   - PropTypes extracted correctly
   - Value persisted correctly

4. **Multiple persisted values in same slice**
   - All values unwrapped independently
   - All values persisted correctly

## Impact Assessment

Any slice using `persist()` without an existing localStorage value would be affected. The bug causes:

1. Type errors when code expects a primitive but receives an object
2. Incorrect boolean/equality checks (`mode === "system"` fails when mode is `PersistType`)
3. localStorage pollution with `undefined` values

## Recommended Testing

After applying the fix:

1. Clear localStorage completely
2. Verify all slices using `persist()` return correct primitive values
3. Verify localStorage contains correct values after first load
4. Verify subsequent page loads still work correctly
