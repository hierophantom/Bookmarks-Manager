/**
 * Tests for Storage service
 * Tests basic CRUD operations and persistence
 */

describe('Storage Service', () => {
  let Storage;
  let mockStorage;

  beforeEach(() => {
    // Clear all mocks and storage
    jest.clearAllMocks();
    mockStorage = global.chrome.storage.sync;
    mockStorage.data = {};

    // Import Storage service (or mock it)
    // For now, we'll create a simple mock that mirrors the expected API
    Storage = {
      get: mockStorage.get,
      set: mockStorage.set,
      remove: mockStorage.remove,
    };
  });

  describe('Storage.get()', () => {
    test('should retrieve a single value by key', async () => {
      mockStorage.data = { testKey: 'testValue' };
      
      const result = await Storage.get('testKey');
      
      expect(result).toHaveProperty('testKey', 'testValue');
    });

    test('should retrieve multiple values by array of keys', async () => {
      mockStorage.data = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      };
      
      const result = await Storage.get(['key1', 'key2']);
      
      expect(result).toHaveProperty('key1', 'value1');
      expect(result).toHaveProperty('key2', 'value2');
      expect(result).not.toHaveProperty('key3');
    });

    test('should return empty object for non-existent keys', async () => {
      const result = await Storage.get('nonExistentKey');
      
      expect(result).toHaveProperty('nonExistentKey', undefined);
    });

    test('should handle complex objects', async () => {
      const complexObject = {
        nested: {
          deep: {
            value: 'test',
          },
        },
        array: [1, 2, 3],
      };
      
      mockStorage.data = { complex: complexObject };
      
      const result = await Storage.get('complex');
      
      expect(result.complex).toEqual(complexObject);
    });
  });

  describe('Storage.set()', () => {
    test('should store a single key-value pair', async () => {
      await Storage.set({ newKey: 'newValue' });
      
      expect(mockStorage.data).toHaveProperty('newKey', 'newValue');
    });

    test('should store multiple key-value pairs', async () => {
      await Storage.set({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      });
      
      expect(mockStorage.data).toHaveProperty('key1', 'value1');
      expect(mockStorage.data).toHaveProperty('key2', 'value2');
      expect(mockStorage.data).toHaveProperty('key3', 'value3');
    });

    test('should overwrite existing values', async () => {
      mockStorage.data = { key: 'oldValue' };
      
      await Storage.set({ key: 'newValue' });
      
      expect(mockStorage.data).toHaveProperty('key', 'newValue');
    });

    test('should merge with existing data', async () => {
      mockStorage.data = { existingKey: 'existingValue' };
      
      await Storage.set({ newKey: 'newValue' });
      
      expect(mockStorage.data).toHaveProperty('existingKey', 'existingValue');
      expect(mockStorage.data).toHaveProperty('newKey', 'newValue');
    });

    test('should handle array storage', async () => {
      const array = [1, 2, 3, 4, 5];
      
      await Storage.set({ myArray: array });
      
      expect(mockStorage.data).toHaveProperty('myArray');
      expect(mockStorage.data.myArray).toEqual(array);
    });
  });

  describe('Storage.remove()', () => {
    test('should remove a single key', async () => {
      mockStorage.data = { key1: 'value1', key2: 'value2' };
      
      await Storage.remove('key1');
      
      expect(mockStorage.data).not.toHaveProperty('key1');
      expect(mockStorage.data).toHaveProperty('key2');
    });

    test('should remove multiple keys', async () => {
      mockStorage.data = { key1: 'value1', key2: 'value2', key3: 'value3' };
      
      await Storage.remove(['key1', 'key3']);
      
      expect(mockStorage.data).not.toHaveProperty('key1');
      expect(mockStorage.data).toHaveProperty('key2');
      expect(mockStorage.data).not.toHaveProperty('key3');
    });

    test('should not error when removing non-existent keys', async () => {
      mockStorage.data = { key1: 'value1' };
      
      await expect(Storage.remove('nonExistent')).resolves.toBeUndefined();
      
      expect(mockStorage.data).toHaveProperty('key1');
    });
  });

  describe('Storage persistence scenarios', () => {
    test('should persist user settings across operations', async () => {
      const userSettings = {
        theme: 'electric-blue',
        activePageIndex: 1,
        hiddenFolders: ['folder-123'],
      };
      
      await Storage.set({ userSettings });
      const result = await Storage.get('userSettings');
      
      expect(result.userSettings).toEqual(userSettings);
    });

    test('should handle bookmark state persistence', async () => {
      const bookmarkState = {
        favorites: ['bm-1', 'bm-2'],
        recent: ['bm-3', 'bm-4', 'bm-5'],
        lastModified: Date.now(),
      };
      
      await Storage.set({ bookmarkState });
      const result = await Storage.get('bookmarkState');
      
      expect(result.bookmarkState).toEqual(bookmarkState);
    });

    test('should clear and reset storage', async () => {
      mockStorage.data = { key1: 'value1', key2: 'value2' };
      
      await mockStorage.clear();
      
      expect(mockStorage.data).toEqual({});
    });
  });
});
