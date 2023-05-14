import { useSelector, shallowEqual } from "react-redux";
import { createDraftSafeSelector as createSelector } from "@reduxjs/toolkit";
import { useAction } from "../actions";
import { getSetterActionName } from "../reducers";
import get from "lodash/get";
import upperFirst from "lodash/upperFirst";
import type { Action, Selector } from "@reduxjs/toolkit";

export const makeSelectorHook = (selector) => () =>
  useSelector(selector, shallowEqual);

export const makeSelectorFactoryHook = (selectorFactory) => (args) =>
  // a selector factory is used when the selector requires args
  //  this factory produces a function that accepts those arguments
  useSelector(selectorFactory(args), shallowEqual);

export const createSelectorUpdateHook =
  (selector: Selector, action: Action) => () =>
    [useSelector(selector), useAction(action, undefined)];

export const createSelectorHook = (...args: [any]) => {
  // creates a redux selector and a react hook that produce identical results
  const selector: any = createSelector(...args);
  const hook: any = makeSelectorHook(selector);

  hook.select = selector;

  return hook;
};

export const makeQuerySelectors = (endpoint, defaultValue) => {
  // a data selector is used when loading state is irrelevant
  const selector = endpoint.select();
  const dataSelector = createSelector(
    selector,
    ({ data, ...rest }) => data || defaultValue
  );

  return [selector, dataSelector];
};

export const dataSelector = ({ data }) => data;

export const configure = (store) => {
  const makeDomainSelector = (name, initialState) => (state) =>
    state?.[name] || initialState;

  const makeDomainSelectorFromSlice = (slice) =>
    makeDomainSelector(slice.name, slice.getInitialState());

  const selectProp = (name: string, defaultValue?: any) => (substate) =>
    get(substate, name, defaultValue);

  const makePropertySelectorHookFactory = (baseSelector, slice) => (names) => {
    // to be used in conjunction with singlePropReducer to mimic the useState api,
    //  but for individual pieces of redux state rather than component state
    // usage:
    //  selector.js:
    //   const selectDomain = state => state?.[domain] || initialState;
    //   const createUseState = makePropertySelectorHookFactory(baseSelector, slice);
    //   const [selectMyData, useMyData] = createUseState("myData");
    //  index.js:
    //   const [data, setData] = useMyData();
    if (Array.isArray(names)) {
      return names.map((name) => makeReduxStateHook(name, baseSelector, slice));
    }
    names = [names];
    return makeReduxStateHook(names, baseSelector, slice);
  };

  const makeReduxStateHook = (name, baseSelector, slice) => {
    const selector = createSelector(baseSelector, selectProp(name));
    const actionName = getSetterActionName(name);
    const updateAction = (...args) => {
      let params = args;

      if (args.length === 1 && typeof args[0] === "function") {
        params = [args[0](selector(store.getState()))];
      }

      return slice.actions[actionName](...params);
    };

    updateAction.toString = () => slice.actions[actionName].toString();

    if (!updateAction) {
      throw Error(`Action ${slice.name}/${actionName} not defined`);
    }

    const useState = (setterCb = (value) => value) => [
      useSelector(selector),
      useAction((value) => updateAction(setterCb(value)), undefined),
    ];

    useState.select = selector;
    useState.update = updateAction;

    return useState;
  };

  const getHookName = (key) => `use${upperFirst(key)}`;

  const makePropertySelectorHooksFromInitialState = (
    baseSelector,
    slice,
    initialState
  ) => {
    const selectorHooksFactory = makePropertySelectorHookFactory(
      baseSelector,
      slice
    );
    const selectorHooksObject = {};

    Object.keys(initialState).forEach((key, i) => {
      selectorHooksObject[getHookName(key)] = selectorHooksFactory(key);
    });

    return selectorHooksObject;
  };

  const makePropertySelectorsFromSlice = (slice) => {
    const selectDomain = makeDomainSelectorFromSlice(slice);
    return {
      selectDomain,
      ...makePropertySelectorHooksFromInitialState(
        selectDomain,
        slice,
        slice.getInitialState()
      ),
    };
  };

  return { makePropertySelectorsFromSlice };
};
