import { combineReducers, configureStore, createSlice } from "@reduxjs/toolkit";
import map from "lodash/map";
import reduce from "lodash/reduce";
import upperFirst from "lodash/upperFirst";
import { useSelector } from "react-redux";
import {
  injectableMiddleware,
  injectMiddleware,
} from "redux-injectable-middleware";
import { useAction } from "./actions";

import {
  injectReducer as _injectReducer,
  injectSlice as _injectSlice,
  makeSetterReducersFromInitialState,
} from "./reducers";

import { plugins } from "./plugins/service";
import { configure as configureSelectors } from "./selectors";

import type {
  Slice,
  Reducer,
  Action,
  Dispatch,
  Store,
  CaseReducer,
  PayloadAction,
} from "@reduxjs/toolkit";

// ============================================================================
// Utility Types
// ============================================================================

/** Capitalize first letter of a string type */
type Capitalize<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S;

// ============================================================================
// Hook Types
// ============================================================================

/** Return type for hooks - [value, setter, extras] */
type HookReturn<T> = [
  T,
  (value: T | ((prev: T) => T)) => void,
  { dispatch: Dispatch; toggle?: T extends boolean ? () => void : never }
];

/** A hook with static methods for non-component usage */
interface SliceHook<T> {
  (setterCb?: (value: T) => T): [T, (value: T | ((prev: T) => T)) => void];
  select: (state: any) => T;
  update: (value: T | ((prev: T) => T)) => Action;
}

/** Generate hook types from initial state - creates useFieldName for each field */
type GeneratedHooks<S> = {
  [K in keyof S as `use${Capitalize<string & K>}`]: SliceHook<S[K]>;
};

/** Domain hook for the entire slice state */
interface SliceDomainHook<S> {
  (): [S, (value: Partial<S> | ((prev: S) => Partial<S>)) => void, (value: S) => void];
  select: (state: any) => S;
  update: (value: Partial<S> | ((prev: S) => Partial<S>)) => Action;
}

// ============================================================================
// Selector Types
// ============================================================================

/** Generate selector types from initial state - creates selectFieldName for each field */
type GeneratedSelectors<S> = {
  [K in keyof S as `select${Capitalize<string & K>}`]: (state: any) => S[K];
} & {
  selectDomain: (state: any) => S;
};

// ============================================================================
// Action Types
// ============================================================================

/** Generate setter action types from initial state - creates setFieldName for each field */
type GeneratedSetterActions<S> = {
  [K in keyof S as `set${Capitalize<string & K>}`]: (payload: S[K]) => PayloadAction<S[K]>;
};

/** Slice-level setter action */
type SliceSetterAction<S> = (payload: Partial<S>) => PayloadAction<Partial<S>>;

/** Extract action types from custom reducers */
type CustomReducerActions<R> = {
  [K in keyof R]: R[K] extends CaseReducer<any, infer A>
    ? A extends PayloadAction<infer P>
      ? (payload: P) => PayloadAction<P>
      : () => Action<string>
    : never;
};

// ============================================================================
// Extended Slice Type
// ============================================================================

/** Extended slice with hooks, selectors, and properly typed actions */
interface ExtendedSlice<
  S extends Record<string, any> = Record<string, any>,
  CustomReducers extends Record<string, CaseReducer<S, any>> = {}
> extends Omit<Slice<S>, 'actions'> {
  name: string;
  reducer: Reducer<S>;
  actions: GeneratedSetterActions<S> &
    CustomReducerActions<CustomReducers> &
    { setSlice: SliceSetterAction<S>; __override__slice__caution: (payload: S) => PayloadAction<S> };
  selectors: GeneratedSelectors<S>;
  hooks: GeneratedHooks<S> & { useSlice: SliceDomainHook<S> };
  getInitialState: () => S;
}

// ============================================================================
// Configure Options Types
// ============================================================================

/** Configuration options for the store - reducer is NOT required */
interface AstroglideConfigureOptions {
  middleware?: any;
  devTools?: boolean;
  preloadedState?: any;
  enhancers?: any;
  [key: string]: any; // Allow static reducers to be passed
}

// ============================================================================
// RTK Config Types
// ============================================================================

/** RTK-compatible configuration for custom reducers */
interface RtkConfig<S, R extends Record<string, CaseReducer<S, any>> = {}> {
  reducers?: R;
  extraReducers?: any;
  selectors?: Record<string, (state: S) => any>;
}

/** Astroglide-specific configuration overrides */
interface AstroglideConfig {
  // Add any astroglide-specific config options here
}

// ============================================================================
// Configure Result Type
// ============================================================================

/** Result returned from configure() */
interface ConfigureResult {
  store: Store;

  /** Create a slice with simple form: createSlice("name", initialState) */
  createSlice<S extends Record<string, any>>(
    name: string,
    initialState: S
  ): ExtendedSlice<S>;

  /** Create a slice with RTK config: createSlice("name", initialState, { reducers }) */
  createSlice<S extends Record<string, any>, R extends Record<string, CaseReducer<S, any>>>(
    name: string,
    initialState: S,
    rtkConfig: RtkConfig<S, R>
  ): ExtendedSlice<S, R>;

  /** Create a slice with RTK-compatible object form: createSlice({ name, initialState }) */
  createSlice<S extends Record<string, any>>(
    config: { name: string; initialState: S }
  ): ExtendedSlice<S>;

  /** Create a slice with RTK-compatible object form and reducers: createSlice({ name, initialState }, {}, { reducers }) */
  createSlice<S extends Record<string, any>, R extends Record<string, CaseReducer<S, any>>>(
    config: { name: string; initialState: S },
    _unused: any,
    rtkConfig: RtkConfig<S, R>
  ): ExtendedSlice<S, R>;

  /** Alias for createSlice */
  astroglide: ConfigureResult['createSlice'];

  injectReducer: (key: string, reducer: Reducer) => void;
  injectSlice: (slice: Slice | ExtendedSlice<any>) => void;
  injectMiddleware: typeof injectMiddleware;
}

export const configure = ({
  middleware,
  devTools,
  preloadedState,
  enhancers,
  ...staticReducers
}: AstroglideConfigureOptions = {}): ConfigureResult => {
  // Add a placeholder reducer if no static reducers provided
  // This prevents combineReducers({}) from throwing an error
  const hasStaticReducers = Object.keys(staticReducers).length > 0;
  const initialReducers = hasStaticReducers
    ? staticReducers
    : { __astroglide_init__: (state: any = {}) => state };

  const store = configureStore({
    // @ts-ignore-next-line
    reducer: combineReducers(initialReducers),
    middleware: (getDefaultMiddleware) => [
      ...(typeof middleware === "function"
        ? middleware(getDefaultMiddleware)
        : middleware || []),
      injectableMiddleware,
    ],
    devTools,
    preloadedState,
    enhancers,
  });

  const { makePropertySelectorsFromSlice } = configureSelectors(store);

  const injectSlice = (slice: Slice | ExtendedSlice<any>) => _injectSlice(store, initialReducers, slice);

  const injectReducer = (key: string, asyncReducer: Reducer) => {
    return _injectReducer(store, initialReducers, key, asyncReducer);
  };

  type PluginData = {
    data: any;
    plugin: any;
  };

  const createAutomatedSlice = (sliceConfig: { name: string; initialState: Record<string, any>; reducers?: Record<string, any> }, rtkConfig: Record<string, any> = {}) => {
    const pluginData: Record<string, PluginData[]> = {};

    map(sliceConfig.initialState, (_item: any, key: string) => {
      let item: any = _item; // cache it here to pull item -> value -> value -> value if multiple plugins are used...

      let foundIndex;

      const findPlugin = () => {
        foundIndex = plugins.findIndex((type: any) => item instanceof type);
      };

      findPlugin();

      const activePlugins: PluginData[] = [];

      while (foundIndex != -1) {
        activePlugins.push({
          data: {
            sliceConfig,
            key,
            plugin: item,
            ...item.setup(item, { key, sliceConfig, config: item.config }),
          },
          plugin: item,
        });

        item = item.value; // pull the next value or plugin off the stack

        findPlugin();
      }

      let value = item;

      for (const { data, plugin } of activePlugins) {
        value = plugin.getInitialValue(value, {
          config: plugin.config,
          plugin,
          key,
          ...data,
        });
      }

      sliceConfig.initialState[key] = value;
      pluginData[key] = activePlugins;
    });

    const setterReducers = makeSetterReducersFromInitialState(
      sliceConfig.initialState,
      rtkConfig,
      pluginData
    );

    let sliceSetterKey = "setSlice";
    while (setterReducers[sliceSetterKey]) {
      // avoid naming conflicts if initialState has a "slice" property
      sliceSetterKey = `_${sliceSetterKey}`;
    }

    const slice = createSlice({
      ...sliceConfig,
      reducers: {
        ...setterReducers,
        __override__slice__caution: (state: any, action: PayloadAction<any>) => action.payload,
        [sliceSetterKey]: (state: Record<string, any>, action: PayloadAction<Record<string, any>>) => {
          for (const key in action.payload) {
            const actionType = `set${upperFirst(key)}`;
            const setter =
              (setterReducers as Record<string, any>)[actionType] ||
              ((_state: Record<string, any>, _action: PayloadAction<any>) => {
                _state[key] = _action.payload;
              });

            setter(state, { type: actionType, payload: action.payload[key] });
          }
        },
        ...(sliceConfig.reducers || {}),
      },
    }) as unknown as ExtendedSlice;

    const { selectDomain, ...hooks } = makePropertySelectorsFromSlice(slice) as { selectDomain: (state: any) => any } & Record<string, any>;

    let domainHookKey = "useSlice";
    while (!!(hooks as Record<string, any>)[domainHookKey]) {
      // avoid naming conflicts in case initialState contains a "domain" property
      domainHookKey = domainHookKey.replace(/(^use)(.*)(Slice$)/, "$1$2_$3");
    }

    const getParams = (...args: any[]) => {
      let params = args;

      if (args.length === 1 && typeof args[0] === "function") {
        // if the first and only arg is a function, call it with the current state
        params = [args[0](selectDomain(store.getState()))];
      }

      return params;
    };

    const updateFn = (...args: any[]) =>
      (slice.actions as Record<string, any>)[sliceSetterKey](
        // call the modifier fn here
        // @ts-ignore
        ...getParams(...args)
      );

    updateFn.toString = () => (slice.actions as Record<string, any>)[sliceSetterKey].toString();

    /* eslint-disable react-hooks/rules-of-hooks */
    (hooks as Record<string, any>)[domainHookKey] = () => {
      return [
        useSelector(selectDomain),
        useAction((slice.actions as Record<string, any>)[sliceSetterKey], undefined)(...getParams()), // prop updater
        useAction(slice.actions.__override__slice__caution, undefined), // state overwriter
      ];
    };

    (hooks as Record<string, any>)[domainHookKey].select = selectDomain;
    (hooks as Record<string, any>)[domainHookKey].update = updateFn;
    /* eslint-enable react-hooks/rules-of-hooks */

    slice.hooks = hooks as any;

    slice.selectors = {
      ...reduce(
        map(slice.hooks, (hook: any, key: string) => ({
          [key.replace(/^use/, "select")]: hook.select,
        })),
        (a, b) => ({ ...a, ...b })
      ),
      selectDomain,
      ...(slice.selectors || {}), // RTK implemented selectors after astroglide was created, some people may not have them
    } as any;

    injectSlice(slice);

    return slice;
  };

  // Overload signatures for the astroglide/createSlice function
  function astroglide<S extends Record<string, any>>(
    name: string,
    initialState: S
  ): ExtendedSlice<S>;
  function astroglide<S extends Record<string, any>, R extends Record<string, CaseReducer<S, any>>>(
    name: string,
    initialState: S,
    rtkConfig: RtkConfig<S, R>
  ): ExtendedSlice<S, R>;
  function astroglide<S extends Record<string, any>>(
    config: { name: string; initialState: S }
  ): ExtendedSlice<S>;
  function astroglide<S extends Record<string, any>, R extends Record<string, CaseReducer<S, any>>>(
    config: { name: string; initialState: S },
    _unused: any,
    rtkConfig: RtkConfig<S, R>
  ): ExtendedSlice<S, R>;
  function astroglide(
    name: string | { name: string; initialState: any },
    initialState: any = {},
    rtkConfig: any = {},
    astroglideConfigOverrides: any = {}
  ): ExtendedSlice<any, any> {
    const shorthandParams = typeof name === "object";

    // Restore original parameter passing logic exactly
    const params = [
      // @ts-ignore
      ...(shorthandParams
        ? [name, initialState, rtkConfig]
        : [{ ...rtkConfig, name, initialState }]),

      shorthandParams ? astroglideConfigOverrides : initialState,
    ];

    // @ts-ignore - params is dynamically constructed based on shorthand vs normal call
    return createAutomatedSlice(...params);
  }

  return {
    createSlice: astroglide,
    astroglide,
    injectReducer,
    injectSlice,
    injectMiddleware,
    store,
  } as ConfigureResult;
};

// Export types for consumer usage
export type {
  ExtendedSlice,
  ConfigureResult,
  AstroglideConfigureOptions,
  RtkConfig,
  AstroglideConfig,
  SliceHook,
  SliceDomainHook,
  GeneratedHooks,
  GeneratedSelectors,
  GeneratedSetterActions,
  HookReturn,
};
