// source: https://react-redux.js.org/api/hooks#recipe-useactions

import { bindActionCreators } from "@reduxjs/toolkit";
import { useDispatch } from "react-redux";
import { useMemo } from "react";

export const useAction = (action, deps) => {
  return useActions([action], deps)[0];
};

export const useActions = (actions, deps) => {
  const dispatch = useDispatch();
  return useMemo(
    () => {
      if (Array.isArray(actions)) {
        return actions.map((a) => bindActionCreators(a, dispatch));
      }
      return bindActionCreators(actions, dispatch);
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    deps ? [dispatch, ...deps] : [dispatch]
  );
};

export const makeUseActions = (actions) => (deps) => useActions(actions, deps);
