import { checkProp } from "./types";

import type { Validator } from "prop-types";
import type { AstroglidePluginValue, PluginFactoryBrand } from "../plugins";

type PropType = any;

interface TypePluginConfig {
  preventUpdate: boolean;
}

/** Value type carried by a PropTypes validator (`Requireable<T>` -> `T | null | undefined`). */
export type InferValidatorType<V> = V extends Validator<infer T> ? T : any;

/** Spec container produced by the consumer-facing `type(...)` factory. Type-level only. */
export interface TypePluginValue<V> extends AstroglidePluginValue<V> {}

/**
 * Consumer-facing factory signature for the type plugin.
 * - `type(validator)` -> value is the validator's inferred type (incl. null/undefined
 *   for non-required validators, since the state genuinely starts undefined).
 * - `type(validator, defaultValue)` -> null/undefined are stripped from the
 *   validator's inference and unioned with the default value's type.
 */
export interface TypePluginFactory {
  <V extends Validator<any>>(propType: V): TypePluginValue<
    InferValidatorType<V>
  >;
  <V extends Validator<any>, D>(
    propType: V,
    value: D,
    config?: Partial<TypePluginConfig>
  ): TypePluginValue<D | NonNullable<InferValidatorType<V>>>;
}

interface TypePlugin extends PluginFactoryBrand<TypePluginFactory> {
  value: any;
  propType: PropType;
  config: TypePluginConfig;
  constructor(propType: PropType, value: any, config?: Partial<TypePluginConfig>): void;
  getInitialValue(value: any, context: { key: string; plugin: TypePlugin }): any;
  update(value: any, context: { key: string; plugin: TypePlugin }): any;
}

export default (
  { preventUpdate }: { preventUpdate: boolean } = { preventUpdate: false }
): TypePlugin => ({
  value: undefined as any,
  propType: undefined as PropType,
  config: { preventUpdate: false },

  constructor(propType: PropType, value: any, config: Partial<TypePluginConfig> = {}) {
    this.value = value; // value set here because constructor signature is different
    this.propType = propType;
    this.config = { ...this.config, ...config };
  },

  getInitialValue(value: any, { key, plugin }: { key: string; plugin: TypePlugin }) {
    const { propType } = plugin;

    checkProp(propType, value, key);

    return value;
  },

  update(value: any, { key, plugin }: { key: string; plugin: TypePlugin }) {
    const { propType } = plugin;

    checkProp(
      propType,
      value,
      key,
      plugin.config.preventUpdate !== undefined
        ? plugin.config.preventUpdate
        : preventUpdate
    );

    return value;
  },
});
