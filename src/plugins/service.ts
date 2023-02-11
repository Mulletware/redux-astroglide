import type {
  PluginClass,
  PluginConfig,
  setupConfig,
  getInitialValueConfig,
  updateConfig,
} from "./plugins.d";

export const plugin = ({
  constructor: constructorFn,
  setup,
  getInitialValue,
  update,
  config = {},
}: PluginConfig): any => {
  return class implements PluginClass {
    constructor(value: any, ...args: any[]) {
      this.value = value;

      this.setup = setup || this.setup;
      this.getInitialValue = getInitialValue || this.getInitialValue;
      this.update = update || this.update;
      this.config = config;

      constructorFn?.call(this, value, ...args);
    }

    value: any; // either the initial state value or the next plugin
    config: object;

    getValue(): any {
      return this.value;
    }

    setValue(value: any): void {
      this.value = value;
    }

    setConfig(config: object): void {
      this.config = { ...this.config, ...config };
    }

    setup(item: any, {}: setupConfig): any {
      return { plugin: item };
    }

    getInitialValue(value: any, {}: getInitialValueConfig): any {
      return value;
    }

    update(value: any, {}: updateConfig): any {
      return value;
    }
  };
};

export const addPlugin = (config: PluginConfig) => {
  const Class = plugin(config);
  plugins.push(Class);

  return (...args: any[]) => new Class(...args);
};

export const addPlugins = (...configs: PluginConfig[]) =>
  configs.map(addPlugin);

export const plugins: PluginClass[] = [];

export const getPlugins = () => plugins;
