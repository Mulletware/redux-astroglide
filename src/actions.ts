// source: https://react-redux.js.org/api/hooks#recipe-useactions

import { bindActionCreators, ActionCreatorsMapObject, ActionCreator } from "@reduxjs/toolkit";
import { useDispatch } from "react-redux";
import { useMemo, DependencyList } from "react";

type ActionCreatorOrMap = ActionCreator<any> | ActionCreatorsMapObject<any>;

// Bound action creators keep the same call signatures, so the input type is
// reused as the return type instead of collapsing to `any`.
export const useAction = <A extends ActionCreatorOrMap>(
  action: A,
  deps?: DependencyList
): A => {
  return useActions([action], deps)[0];
};

export function useActions<A extends ActionCreatorOrMap[]>(
  actions: [...A],
  deps?: DependencyList
): A;
export function useActions<A extends ActionCreatorOrMap>(
  actions: A,
  deps?: DependencyList
): A;
export function useActions(
  actions: ActionCreatorOrMap | ActionCreatorOrMap[],
  deps?: DependencyList
): any {
  const dispatch = useDispatch();
  return useMemo(
    () => {
      if (Array.isArray(actions)) {
        return actions.map((a) => bindActionCreators(a as ActionCreatorsMapObject<any>, dispatch));
      }
      return bindActionCreators(actions as ActionCreatorsMapObject<any>, dispatch);
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    deps ? [dispatch, ...deps] : [dispatch]
  );
}

export const makeUseActions = <A extends ActionCreatorOrMap | ActionCreatorOrMap[]>(
  actions: A
) => (deps?: DependencyList): A => useActions(actions as any, deps);
