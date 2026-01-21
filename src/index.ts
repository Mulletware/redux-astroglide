import { configure } from "./astroglide";

export { createSelectorHook, createSelectorUpdateHook } from "./selectors";
export { configure };
export { plugins, addPlugin, addPlugins } from "./plugins/service";

// Re-export types for consumer usage
export type {
  ExtendedSlice,
  ConfigureResult,
  AstroglideConfigureOptions,
  RtkConfig,
  AstroglideConfig,
  SliceHook,
  SliceDomainHook,
  GeneratedHooks,
  GeneratedSelectors,
  GeneratedSetterActions,
  HookReturn,
} from "./astroglide";

export default configure;
