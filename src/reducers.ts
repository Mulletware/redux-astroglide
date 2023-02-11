/* eslint-disable react/forbid-foreign-prop-types */
import upperFirst from "lodash/upperFirst";

import { combineReducers } from "@reduxjs/toolkit";

const asyncReducers = {}; // placeholder for injected reducers

export const injectReducer = (
  store,
  staticReducers = {},
  key,
  asyncReducer
) => {
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

export const injectSlice = (store, staticReducers, slice) =>
  injectReducer(store, staticReducers, slice.name, slice.reducer);

export const getSetterActionName = (name) => `set${upperFirst(name)}`;

export const makeSetterReducersFromInitialState = (
  initialState,
  config,
  pluginsData
) => {
  const reducer = {};

  Object.keys(initialState).forEach((name) => {
    const key = getSetterActionName(name);
    reducer[key] = (state, action) => {
      let value = action.payload;

      pluginsData[name].forEach(({ data, plugin }) => {
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
