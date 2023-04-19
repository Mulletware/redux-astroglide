import type { PluginClass, sliceConfig } from "../plugins.d";
import type { Storage } from "./types.d";

const localStorage = (window || {}).localStorage;
const isLocalStorageAvaialble = !!localStorage;

const PERSISTENCE_KEY = `astroglide-persist`;

let defaultStorageType: Storage = localStorage;

export const getPersistedStore = async (
  storage: Storage = defaultStorageType
) => {
  const result = await storage.getItem(PERSISTENCE_KEY);
  return JSON.parse(result || "{}");
};

export const storePersistedValue = async (
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
    await storage.setItem(PERSISTENCE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error(e);
  }
};

export const getPersistedValue = (
  key: string,
  namespace?: string,
  _storage?: Storage
) => {
  const storage = _storage || defaultStorageType;
  let scope = getPersistedStore(storage);

  if (namespace) {
    scope = scope?.[namespace];
  }

  return scope?.[key];
};

export default ({
  storageType = defaultStorageType,
}: { storageType?: Storage } = {}) => {
  if (!isLocalStorageAvaialble && !storageType) {
    console.warn(
      "localStorage is not available! You must provide your own storage to persist"
    ); // eslint-disable-line no-console
  }

  defaultStorageType = storageType;

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
