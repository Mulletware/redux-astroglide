import {
  getPersistedValue,
  storePersistedValue,
  getPersistedStore,
} from '../index';

// Import the default export to test the plugin factory
import createPersistPlugin from '../index';

const PERSISTENCE_KEY = 'astroglide-persist';

describe('persist plugin', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('storePersistedValue', () => {
    it('stores value with namespace', () => {
      storePersistedValue('theme', 'settings', 'dark');

      const stored = JSON.parse(localStorage.getItem(PERSISTENCE_KEY) || '{}');
      expect(stored.settings.theme).toBe('dark');
    });

    it('stores value without namespace', () => {
      storePersistedValue('globalKey', undefined, 'globalValue');

      const stored = JSON.parse(localStorage.getItem(PERSISTENCE_KEY) || '{}');
      expect(stored.globalKey).toBe('globalValue');
    });

    it('preserves existing values when adding new ones', () => {
      storePersistedValue('key1', 'ns', 'value1');
      storePersistedValue('key2', 'ns', 'value2');

      const stored = JSON.parse(localStorage.getItem(PERSISTENCE_KEY) || '{}');
      expect(stored.ns.key1).toBe('value1');
      expect(stored.ns.key2).toBe('value2');
    });
  });

  describe('getPersistedValue', () => {
    it('returns undefined for non-existent key', () => {
      expect(getPersistedValue('missing', 'ns')).toBeUndefined();
    });

    it('returns stored value with namespace', () => {
      storePersistedValue('key', 'ns', 'value');
      expect(getPersistedValue('key', 'ns')).toBe('value');
    });

    it('returns undefined for non-existent namespace', () => {
      storePersistedValue('key', 'ns1', 'value');
      expect(getPersistedValue('key', 'ns2')).toBeUndefined();
    });
  });

  describe('getPersistedStore', () => {
    it('returns empty object when localStorage is empty', () => {
      expect(getPersistedStore()).toEqual({});
    });

    it('returns parsed store from localStorage', () => {
      localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({ test: 'data' }));
      expect(getPersistedStore()).toEqual({ test: 'data' });
    });
  });

  describe('plugin getInitialValue', () => {
    it('returns existing persisted value when present', () => {
      storePersistedValue('mode', 'theme', 'dark');

      const plugin = createPersistPlugin();
      const result = plugin.getInitialValue('light', {
        sliceConfig: { name: 'theme', initialState: {} },
        key: 'mode',
      });

      expect(result).toBe('dark');
    });

    it('stores and returns initial value when no persisted value exists', () => {
      const plugin = createPersistPlugin();
      const result = plugin.getInitialValue('system', {
        sliceConfig: { name: 'theme', initialState: {} },
        key: 'mode',
      });

      expect(result).toBe('system');
      expect(getPersistedValue('mode', 'theme')).toBe('system');
    });

    it('stores initial value to localStorage on first access', () => {
      const plugin = createPersistPlugin();

      // Before: localStorage should be empty
      expect(getPersistedValue('setting', 'mySlice')).toBeUndefined();

      // Call getInitialValue
      plugin.getInitialValue('default', {
        sliceConfig: { name: 'mySlice', initialState: {} },
        key: 'setting',
      });

      // After: localStorage should contain the initial value
      expect(getPersistedValue('setting', 'mySlice')).toBe('default');
    });
  });

  describe('plugin update', () => {
    it('stores updated value to localStorage', () => {
      const plugin = createPersistPlugin();

      plugin.update('newValue', {
        key: 'testKey',
        sliceConfig: { name: 'testSlice', initialState: {} },
      });

      expect(getPersistedValue('testKey', 'testSlice')).toBe('newValue');
    });

    it('returns the value unchanged', () => {
      const plugin = createPersistPlugin();

      const result = plugin.update('testValue', {
        key: 'key',
        sliceConfig: { name: 'slice', initialState: {} },
      });

      expect(result).toBe('testValue');
    });
  });

  describe('plugin with custom storage', () => {
    it('uses provided storage type', () => {
      const customStorage = {
        getItem: jest.fn().mockReturnValue('{}'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };

      const plugin = createPersistPlugin({ storageType: customStorage });

      plugin.getInitialValue('value', {
        sliceConfig: { name: 'test', initialState: {} },
        key: 'key',
      });

      expect(customStorage.setItem).toHaveBeenCalled();
    });
  });
});
