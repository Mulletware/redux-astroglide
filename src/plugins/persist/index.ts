import type { PluginClass, sliceConfig } from "../plugins.d";
import type { Storage } from "./types.d";

const localStorage = (window || {}).localStorage;
const isLocalStorageAvaialble = !!localStorage;

const PERSISTENCE_KEY = `astroglide-persist`;

let defaultStorageType: Storage = localStorage;

export const getPersistedStore = (storage: Storage = defaultStorageType) =>
  JSON.parse(storage.getItem(PERSISTENCE_KEY) || "{}");

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
      const existingPersistedValue = getPersistedValue(
        key,
        sliceConfig.name,
        storageType
      );

      if (existingPersistedValue !== undefined) {
        return existingPersistedValue;
      }

      return value;
    },

    update(value, { key, sliceConfig }) {
      // debugger;
      storePersistedValue(
        key,
        sliceConfig.name,
        value,
        storageType !== undefined
          ? storageType
          : this.config.storageType || defaultStorageType
      );

      return value;
    },
  };
};
