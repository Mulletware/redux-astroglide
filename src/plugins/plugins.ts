import type { Draft } from "@reduxjs/toolkit";

export type sliceConfig = {
  name: string;
  initialState: object;
};

export type setupConfig = {
  key: string;
  sliceConfig: sliceConfig;
};

export type setup = (item: any, { key, sliceConfig }: setupConfig) => any;

export type getInitialValueConfig = {
  sliceConfig: sliceConfig;
  key: string;
  plugin: any;
  config: object;
};

export type getInitialValue = (
  value: any,
  { sliceConfig, key, plugin }: getInitialValueConfig
) => any;

export type updateConfig = {
  key: string;
  sliceConfig: sliceConfig;
  plugin: any;
  draft: Draft<(...args: any[]) => any>;
};

export type update = (value: any, { key, sliceConfig }: updateConfig) => any;

export type PluginConfig = {
  setup?: setup;
  getInitialValue?: getInitialValue;
  update?: update;
  constructor?: Function | ((value: any) => void) | any;
  config?: object;
};

// ============================================================================
// Type-level plumbing — none of this exists at runtime
// ============================================================================

/**
 * Phantom brand carried by the values returned from plugin factories
 * (e.g. `type(PropTypes.string, "")`). `V` is the runtime value type the
 * plugin resolves to once `createSlice` unwraps it. The symbol property is
 * declaration-only; plugin instances never have it at runtime.
 */
declare const astroglideValueType: unique symbol;

export interface AstroglidePluginValue<V> {
  readonly [astroglideValueType]: V;
}

/** Unwrap one level of plugin container; pass plain values through (widened). */
export type UnwrapPluginValue<T> = T extends AstroglidePluginValue<infer V>
  ? V
  : WidenLiteral<T>;

/** Widen literal inference (`false` -> boolean) to match plain-value specs. */
type WidenLiteral<T> = T extends string
  ? string
  : T extends number
  ? number
  : T extends boolean
  ? boolean
  : T;

/**
 * Phantom brand a plugin's `PluginConfig` can carry to describe the
 * consumer-facing factory produced by `addPlugin`/`addPlugins`. Optional and
 * declaration-only, so plain configs (and untyped custom plugins) still work.
 */
declare const astroglideFactoryType: unique symbol;

export interface PluginFactoryBrand<F> {
  readonly [astroglideFactoryType]?: F;
}

/** Fallback factory shape for unbranded plugin configs (previous behavior). */
export type DefaultPluginFactory = (...args: any[]) => any;

/** Resolve the consumer-facing factory type for a plugin config. */
export type PluginFactoryFor<C> = C extends PluginFactoryBrand<infer F>
  ? unknown extends F
    ? DefaultPluginFactory
    : NonNullable<F>
  : DefaultPluginFactory;

export type PluginClass = {
  value: any; // either the initial state value or the next plugin
  config: object;

  setValue(value: any): void;
  setConfig: (config: object) => void;

  setup(item: PluginClass, {}): any;
  getInitialValue(value: any, {}): any;
  update(value: any, {}): any;
};
