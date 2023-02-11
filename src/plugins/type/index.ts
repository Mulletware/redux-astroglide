import { checkProp } from "./types";

export default (
  { preventUpdate }: { preventUpdate: boolean } = { preventUpdate: false }
) => ({
  constructor(propType, value, config = {}) {
    this.value = value; // value set here because constructor signature is different
    this.propType = propType;
    this.config = { ...this.config, ...config };
  },

  getInitialValue(value, { key, plugin }) {
    const { propType } = plugin;

    checkProp(propType, value, key);

    return value;
  },

  update(value, { key, plugin }) {
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
  config: { preventUpdate: false },
});
