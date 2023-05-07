import { createDraftSafeSelector as createSelector } from "@reduxjs/toolkit";
import { shallowEqual, useSelector } from "react-redux";

export const makeSelectorHook = (selector) => () =>
  useSelector(selector, shallowEqual);

export default (...args) => {
  // creates a redux selector and a react hook that produce identical results
  const selector = createSelector(...args);
  const hook = makeSelectorHook(selector);

  hook.select = selector;

  return hook;
};
