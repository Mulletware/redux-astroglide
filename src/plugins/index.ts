export { default as set } from "./set";
export { default as type } from "./type";
export { default as persist } from "./persist";

export { plugins, addPlugin, addPlugins } from "./service";

export type {
  AstroglidePluginValue,
  UnwrapPluginValue,
  PluginFactoryBrand,
  PluginFactoryFor,
  DefaultPluginFactory,
} from "./plugins";
