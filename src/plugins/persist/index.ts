import type { PluginClass, sliceConfig } from "../plugins";
import type { Storage } from "./types";

const localStorage = (typeof window !== 'undefined' ? window : {} as any).localStorage as Storage | undefined;
const isLocalStorageAvailable = !!localStorage;

const PERSISTENCE_KEY = `astroglide-persist`;

let defaultStorageType: Storage = localStorage as Storage;

export const getPersistedStore = (storage: Storage = defaultStorageType): Record<string, any> =>
  JSON.parse(storage.getItem(PERSISTENCE_KEY) || "{}");

export const storePersistedValue = (
  key: string,
  namespace?: string,
  value?: any,
  storage: Storage = localStorage as Storage
): void => {
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
): any => {
  const storage = _storage || defaultStorageType;
  let scope = getPersistedStore(storage);

  if (namespace) {
    scope = scope?.[namespace];
  }

  return scope?.[key];
};

interface PersistPlugin {
  storageType: Storage;
  setup(plugin: PluginClass, context: { sliceConfig: sliceConfig }): { namespace: string; storageType: Storage };
  getInitialValue(value: any, context: { sliceConfig: sliceConfig; key: string }): any;
  update(value: any, context: { key: string; sliceConfig: sliceConfig }): any;
}

export default ({
  storageType = defaultStorageType,
}: { storageType?: Storage } = {}): PersistPlugin => {
  if (!isLocalStorageAvailable && !storageType) {
    console.warn(
      "localStorage is not available! You must provide your own storage to persist"
    ); // eslint-disable-line no-console
  }

  defaultStorageType = storageType;

  return {
    storageType,

    setup(plugin: PluginClass, { sliceConfig }: { sliceConfig: sliceConfig }) {
      return {
        namespace: sliceConfig.name,
        storageType: storageType,
      };
    },

    getInitialValue(value: any, { sliceConfig, key }: { sliceConfig: sliceConfig; key: string }) {
      const existingPersistedValue = getPersistedValue(
        key,
        sliceConfig.name,
        storageType
      );

      if (existingPersistedValue !== undefined) {
        return existingPersistedValue;
      }

      // Store initial value to localStorage for consistency across sessions
      storePersistedValue(key, sliceConfig.name, value, storageType);
      return value;
    },

    update(value: any, { key, sliceConfig }: { key: string; sliceConfig: sliceConfig }) {
      storePersistedValue(
        key,
        sliceConfig.name,
        value,
        storageType !== undefined
          ? storageType
          : this.storageType || defaultStorageType
      );

      return value;
    },
  };
};
