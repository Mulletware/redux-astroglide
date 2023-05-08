import { configure } from "./astroglide";

export { createSelectorHook, createSelectorUpdateHook } from "./selectors";
export { configure };
export { plugins, addPlugin, addPlugins } from "./plugins/service";

export default configure;
