import { checkProp } from "./types";

type PropType = any;

interface TypePluginConfig {
  preventUpdate: boolean;
}

interface TypePlugin {
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
