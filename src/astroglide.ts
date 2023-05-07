import { configureStore } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
import map from "lodash/map";
import reduce from "lodash/reduce";
import upperFirst from "lodash/upperFirst";
import {
  injectableMiddleware,
  injectMiddleware,
} from "redux-injectable-middleware";
import { useAction } from "./actions";

import {
  injectSlice as _injectSlice,
  injectReducer as _injectReducer,
  makeSetterReducersFromInitialState,
} from "./reducers";

import { configure as configureSelectors } from "./selectors";
import { plugins } from "./plugins/service";

import type { ConfigureStoreOptions, Slice } from "@reduxjs/toolkit";

type ExtendedSlice = Slice & {
  hooks: object;
  selectors: object;
};

export const configure = ({
  middleware,
  reducer,
  devTools,
  preloadedState,
  enhancers,
  ...staticReducers
}: ConfigureStoreOptions) => {
  const store = configureStore({
    ...(Object.keys(staticReducers).length
      ? staticReducers
      : { reducer: reducer || ((state = {}) => state) }),
    // @ts-ignore
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

  const injectSlice = (slice) => _injectSlice(store, staticReducers, slice);

  const injectReducer = (key, asyncReducer) => {
    return _injectReducer(store, staticReducers, key, asyncReducer);
  };

  type PluginData = {
    data: any;
    plugin: any;
  };

  const createAutomatedSlice = (sliceConfig, rtkConfig) => {
    const pluginData: object = {};

    map(sliceConfig.initialState, (_item, key) => {
      let item = _item; // cache it here to pull item -> value -> value -> value if multiple plugins are used...

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
        __override__slice__caution: (state, action) => action.payload,
        [sliceSetterKey]: (state, action) => {
          for (const key in action.payload) {
            const actionType = `set${upperFirst(key)}`;
            const setter =
              setterReducers[actionType] ||
              ((_state, _action) => {
                _state[key] = _action.payload;
              });

            setter(state, { type: actionType, payload: action.payload[key] });
          }
        },
        ...(sliceConfig.reducers || {}),
      },
    }) as ExtendedSlice;

    const { selectDomain, ...hooks } = makePropertySelectorsFromSlice(slice);

    let domainHookKey = "useSlice";
    while (!!hooks[domainHookKey]) {
      // avoid naming conflicts in case initialState contains a "domain" property
      domainHookKey = domainHookKey.replace(/(^use)(.*)(Slice$)/, "$1$2_$3");
    }

    const getParams = (...args) => {
      let params = args;

      if (args.length === 1 && typeof args[0] === "function") {
        // if the first and only arg is a function, call it with the current state
        params = [args[0](selectDomain(store.getState()))];
      }

      return params;
    };

    const updateFn = (...args: any[]) =>
      slice.actions[sliceSetterKey](
        // call the modifier fn here
        // @ts-ignore
        ...getParams(...args)
      );

    updateFn.toString = () => slice.actions[sliceSetterKey].toString();

    /* eslint-disable react-hooks/rules-of-hooks */
    hooks[domainHookKey] = () => {
      return [
        useAction(slice.actions[sliceSetterKey], undefined)(...getParams()), // prop updater
        useAction(slice.actions.__override__slice__caution, undefined), // state overwriter
      ];
    };

    hooks[domainHookKey].select = selectDomain;
    hooks[domainHookKey].update = updateFn;
    /* eslint-enable react-hooks/rules-of-hooks */

    slice.hooks = hooks;

    slice.selectors = {
      selectDomain,
      ...reduce(
        map(slice.hooks, (hook: any, key) => ({
          [key.replace(/^use/, "select")]: hook.select,
        })),
        (a, b) => ({ ...a, ...b })
      ),
    };

    injectSlice(slice);

    return slice;
  };

  const astroglide = (
    name: string | { name: string; initialState: object },
    initialState: object,
    rtkConfig: {} = {},
    astroglideConfigOverrides = {}
  ) => {
    const shorthandParams = typeof name === "object";

    const params = [
      // @ts-ignore
      ...(shorthandParams
        ? [name, initialState, rtkConfig]
        : [{ ...rtkConfig, name, initialState }]),

      shorthandParams ? astroglideConfigOverrides : initialState,
    ];

    return createAutomatedSlice(...params);
  };

  return {
    createSlice: astroglide,
    astroglide,
    injectReducer,
    injectSlice,
    injectMiddleware,
    store,
  };
};
