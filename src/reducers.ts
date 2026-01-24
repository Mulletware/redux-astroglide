/* eslint-disable react/forbid-foreign-prop-types */
import upperFirst from "lodash/upperFirst";

import { combineReducers, Store, Reducer, PayloadAction } from "@reduxjs/toolkit";

type ReducersMapObject = Record<string, Reducer>;
type PluginData = {
  data: Record<string, any>;
  plugin: {
    update: (value: any, context: Record<string, any>) => any;
    config?: Record<string, any>;
  };
};
type PluginsDataMap = Record<string, PluginData[]>;

const asyncReducers: ReducersMapObject = {}; // placeholder for injected reducers

export const injectReducer = (
  store: Store,
  staticReducers: ReducersMapObject = {},
  key: string,
  asyncReducer: Reducer
): void => {
  if (!asyncReducers[key]) {
    asyncReducers[key] = asyncReducer;

    store.replaceReducer(
      combineReducers({
        ...staticReducers,
        ...asyncReducers,
      })
    );
  }
};

type SliceLike = { name: string; reducer: Reducer };

export const injectSlice = (store: Store, staticReducers: ReducersMapObject, slice: SliceLike): void =>
  injectReducer(store, staticReducers, slice.name, slice.reducer);

export const getSetterActionName = (name: string): string => `set${upperFirst(name)}`;

export const makeSetterReducersFromInitialState = (
  initialState: Record<string, any>,
  _config: Record<string, any>,
  pluginsData: PluginsDataMap
): Record<string, (state: Record<string, any>, action: PayloadAction<any>) => void> => {
  const reducer: Record<string, (state: Record<string, any>, action: PayloadAction<any>) => void> = {};

  Object.keys(initialState).forEach((name) => {
    const key = getSetterActionName(name);
    reducer[key] = (state: Record<string, any>, action: PayloadAction<any>) => {
      let value = action.payload;

      pluginsData[name].forEach(({ data, plugin }: PluginData) => {
        value = plugin.update(value, {
          state,
          config: plugin.config,
          draft: state,
          ...data,
        }); // provide both state. and draft. apis so fewer users complain
      });

      state[name] = value;
    };
  });

  return reducer;
};

/* eslint-enable react/forbid-foreign-prop-types */
