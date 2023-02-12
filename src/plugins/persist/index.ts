import type { PluginClass, sliceConfig } from "../plugins.d";
import type { Storage } from "./types.d";

const PERSISTENCE_KEY = `astroglide-persist`;

export const getPersistedStore = (storage: Storage = localStorage) => {
  const result = storage.getItem(PERSISTENCE_KEY);
  return JSON.parse(result || "{}");
};

export const storePersistedValue = (
  key: string,
  namespace?: string,
  value?: any,
  storage: Storage = localStorage
) => {
  const store = getPersistedStore(storage);

  if (namespace) {
    store[namespace] = store[namespace] || {};
    store[namespace][key] = value;
  } else {
    store[key] = value;
  }

  try {
    storage.setItem(PERSISTENCE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error(e);
  }
};

export const getPersistedValue = (
  key: string,
  namespace?: string,
  storage: Storage = localStorage
) => {
  let scope = getPersistedStore(storage);

  if (namespace) {
    scope = scope?.[namespace];
  }

  return scope?.[key];
};

export default ({
  storageType = localStorage,
}: { storageType?: Storage } = {}) => {
  return {
    setup(plugin: PluginClass, { sliceConfig }: { sliceConfig: sliceConfig }) {
      return {
        namespace: sliceConfig.name,
        storageType: storageType,
      };
    },

    getInitialValue(value, { sliceConfig, key }) {
      const existingPersistedValue = getPersistedValue(key, sliceConfig.name);

      if (existingPersistedValue !== undefined) {
        return existingPersistedValue;
      }

      return value;
    },

    update(value, { key, sliceConfig }) {
      storePersistedValue(
        key,
        sliceConfig.name,
        value,
        this.config.storageType !== undefined
          ? this.config.storageType
          : storageType
      );
      return value;
    },
  };
};
