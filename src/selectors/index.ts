import { useSelector, shallowEqual } from "react-redux";
import { createDraftSafeSelector as createSelector, Store } from "@reduxjs/toolkit";
import { useAction } from "../actions";
import { getSetterActionName } from "../reducers";
import get from "lodash/get";
import upperFirst from "lodash/upperFirst";
import type { Selector } from "@reduxjs/toolkit";

type SelectorFunction<T = any> = (state: any) => T;
type SelectorFactory<T = any> = (args: any) => SelectorFunction<T>;
type EndpointLike = { select: () => SelectorFunction };
type SliceLike = { name: string; getInitialState: () => any; actions: Record<string, any> };

export const makeSelectorHook = <T>(selector: SelectorFunction<T>) => () =>
  useSelector(selector, shallowEqual);

export const makeSelectorFactoryHook = <T>(selectorFactory: SelectorFactory<T>) => (args: any) =>
  // a selector factory is used when the selector requires args
  //  this factory produces a function that accepts those arguments
  useSelector(selectorFactory(args), shallowEqual);

export const createSelectorUpdateHook =
  (selector: Selector, action: any) => () =>
    [useSelector(selector), useAction(action, undefined)];

export const createSelectorHook = (...args: [any]) => {
  // creates a redux selector and a react hook that produce identical results
  const selector: any = createSelector(...args);
  const hook: any = makeSelectorHook(selector);

  hook.select = selector;

  return hook;
};

export const makeQuerySelectors = <T>(endpoint: EndpointLike, defaultValue: T) => {
  // a data selector is used when loading state is irrelevant
  const selector = endpoint.select();
  const dataSelector = createSelector(
    selector,
    ({ data }: { data?: T }) => data || defaultValue
  );

  return [selector, dataSelector];
};

export const dataSelector = ({ data }: { data: any }) => data;

export const configure = (store: Store) => {
  const makeDomainSelector = <T>(name: string, initialState: T) => (state: Record<string, any>): T =>
    state?.[name] || initialState;

  const makeDomainSelectorFromSlice = (slice: SliceLike) =>
    makeDomainSelector(slice.name, slice.getInitialState());

  const selectProp = (name: string, defaultValue?: any) => (substate: any) =>
    get(substate, name, defaultValue);

  const makePropertySelectorHookFactory = (baseSelector: SelectorFunction, slice: SliceLike) => (names: string | string[]) => {
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
      return names.map((name: string) => makeReduxStateHook(name, baseSelector, slice));
    }
    return makeReduxStateHook(names, baseSelector, slice);
  };

  const makeReduxStateHook = (name: string | string[], baseSelector: SelectorFunction, slice: SliceLike) => {
    const selector = createSelector(baseSelector, selectProp(Array.isArray(name) ? name[0] : name));
    const actionName = getSetterActionName(Array.isArray(name) ? name[0] : name);
    const updateAction = (...args: any[]) => {
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

    const useState: any = (setterCb: (value: any) => any = (value) => value) => [
      useSelector(selector),
      useAction((value: any) => updateAction(setterCb(value)), undefined),
    ];

    useState.select = selector;
    useState.update = updateAction;

    return useState;
  };

  const getHookName = (key: string) => `use${upperFirst(key)}`;

  const makePropertySelectorHooksFromInitialState = (
    baseSelector: SelectorFunction,
    slice: SliceLike,
    initialState: Record<string, any>
  ) => {
    const selectorHooksFactory = makePropertySelectorHookFactory(
      baseSelector,
      slice
    );
    const selectorHooksObject: Record<string, any> = {};

    Object.keys(initialState).forEach((key) => {
      selectorHooksObject[getHookName(key)] = selectorHooksFactory(key);
    });

    return selectorHooksObject;
  };

  const makePropertySelectorsFromSlice = (slice: SliceLike) => {
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
