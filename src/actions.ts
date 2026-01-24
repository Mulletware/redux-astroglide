// source: https://react-redux.js.org/api/hooks#recipe-useactions

import { bindActionCreators, ActionCreatorsMapObject, ActionCreator } from "@reduxjs/toolkit";
import { useDispatch } from "react-redux";
import { useMemo, DependencyList } from "react";

type ActionCreatorOrMap = ActionCreator<any> | ActionCreatorsMapObject<any>;

export const useAction = (action: ActionCreatorOrMap, deps?: DependencyList) => {
  return useActions([action], deps)[0];
};

export const useActions = (actions: ActionCreatorOrMap | ActionCreatorOrMap[], deps?: DependencyList) => {
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
};

export const makeUseActions = (actions: ActionCreatorOrMap | ActionCreatorOrMap[]) => (deps?: DependencyList) => useActions(actions, deps);
