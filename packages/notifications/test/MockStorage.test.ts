/* eslint-disable unicorn/no-null */
/* eslint-disable no-magic-numbers */
import { MockStorage } from './MockStorage';

describe('MockStorage', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  describe('constructor', () => {
    test('should initialize with empty storage when no userId is provided', () => {
      const emptyStorage = new MockStorage();

      expect(emptyStorage.keys()).toEqual([]);
      expect(emptyStorage.getStore().size).toBe(0);
    });

    test('should initialize with userId when provided', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const storageWithUserId = new MockStorage(userId);

      const storedUserId = await storageWithUserId.getItem<string>('notifications:userId');
      expect(storedUserId).toBe(userId);
      expect(storageWithUserId.keys()).toContain('notifications:userId');
    });

    test('should not set userId when undefined is passed', () => {
      const storageWithUndefined = new MockStorage(undefined);

      expect(storageWithUndefined.keys()).toEqual([]);
      expect(storageWithUndefined.getStore().size).toBe(0);
    });
  });

  describe('getItem', () => {
    test('should return undefined for non-existent key', async () => {
      const result = await storage.getItem('non-existent');

      expect(result).toBeUndefined();
    });

    test('should return stored string value', async () => {
      await storage.setItem('key1', 'value1');
      const result = await storage.getItem<string>('key1');

      expect(result).toBe('value1');
    });

    test('should return stored number value', async () => {
      await storage.setItem('key2', 123);
      const result = await storage.getItem<number>('key2');

      expect(result).toBe(123);
    });

    test('should return stored boolean value', async () => {
      await storage.setItem('key3', true);
      const result = await storage.getItem<boolean>('key3');

      expect(result).toBe(true);
    });

    test('should return stored object value', async () => {
      const obj = { name: 'test', count: 42 };
      await storage.setItem('key4', obj);
      const result = await storage.getItem<typeof obj>('key4');

      expect(result).toEqual(obj);
    });

    test('should return stored array value', async () => {
      const arr = [1, 2, 3];
      await storage.setItem('key5', arr);
      const result = await storage.getItem<number[]>('key5');

      expect(result).toEqual(arr);
    });

    test('should return null if stored value is null', async () => {
      await storage.setItem('key6', null);
      const result = await storage.getItem<null>('key6');

      expect(result).toBeNull();
    });

    test('should return different values for different keys', async () => {
      await storage.setItem('key7', 'value7');
      await storage.setItem('key8', 'value8');

      const result1 = await storage.getItem<string>('key7');
      const result2 = await storage.getItem<string>('key8');

      expect(result1).toBe('value7');
      expect(result2).toBe('value8');
    });
  });

  describe('setItem', () => {
    test('should store string value', async () => {
      await storage.setItem('test-key', 'test-value');
      const result = await storage.getItem<string>('test-key');

      expect(result).toBe('test-value');
    });

    test('should overwrite existing value', async () => {
      await storage.setItem('test-key', 'old-value');
      await storage.setItem('test-key', 'new-value');
      const result = await storage.getItem<string>('test-key');

      expect(result).toBe('new-value');
    });

    test('should store number value', async () => {
      await storage.setItem('number-key', 42);
      const result = await storage.getItem<number>('number-key');

      expect(result).toBe(42);
    });

    test('should store boolean value', async () => {
      await storage.setItem('bool-key', false);
      const result = await storage.getItem<boolean>('bool-key');

      expect(result).toBe(false);
    });

    test('should store object value', async () => {
      const obj = { id: 1, name: 'test' };
      await storage.setItem('obj-key', obj);
      const result = await storage.getItem<typeof obj>('obj-key');

      expect(result).toEqual(obj);
    });

    test('should store array value', async () => {
      const arr = ['a', 'b', 'c'];
      await storage.setItem('arr-key', arr);
      const result = await storage.getItem<string[]>('arr-key');

      expect(result).toEqual(arr);
    });

    test('should store null value', async () => {
      await storage.setItem('null-key', null);
      const result = await storage.getItem<null>('null-key');

      expect(result).toBeNull();
    });

    test('should store multiple different values', async () => {
      await storage.setItem('key1', 'value1');
      await storage.setItem('key2', 123);
      await storage.setItem('key3', true);

      expect(await storage.getItem<string>('key1')).toBe('value1');
      expect(await storage.getItem<number>('key2')).toBe(123);
      expect(await storage.getItem<boolean>('key3')).toBe(true);
    });

    test('should return a promise that resolves', async () => {
      const promise = storage.setItem('test-key', 'test-value');

      expect(promise).toBeInstanceOf(Promise);
      await promise; // Should resolve without error
    });
  });

  describe('removeItem', () => {
    test('should remove existing item', async () => {
      await storage.setItem('key-to-remove', 'value');
      await storage.removeItem('key-to-remove');

      const result = await storage.getItem('key-to-remove');
      expect(result).toBeUndefined();
    });

    test('should not throw error when removing non-existent key', async () => {
      await expect(storage.removeItem('non-existent')).resolves.toBeUndefined();
    });

    test('should only remove specified key', async () => {
      await storage.setItem('key1', 'value1');
      await storage.setItem('key2', 'value2');
      await storage.removeItem('key1');

      expect(await storage.getItem('key1')).toBeUndefined();
      expect(await storage.getItem('key2')).toBe('value2');
    });

    test('should return a promise that resolves', async () => {
      const promise = storage.removeItem('test-key');

      expect(promise).toBeInstanceOf(Promise);
      await promise; // Should resolve without error
    });
  });

  describe('clear', () => {
    test('should remove all items', async () => {
      await storage.setItem('key1', 'value1');
      await storage.setItem('key2', 'value2');
      await storage.setItem('key3', 'value3');

      storage.clear();

      expect(await storage.getItem('key1')).toBeUndefined();
      expect(await storage.getItem('key2')).toBeUndefined();
      expect(await storage.getItem('key3')).toBeUndefined();
    });

    test('should work on empty storage', () => {
      expect(() => storage.clear()).not.toThrow();
    });

    test('should clear storage after adding items', async () => {
      await storage.setItem('key1', 'value1');
      storage.clear();
      await storage.setItem('key2', 'value2');

      expect(await storage.getItem('key1')).toBeUndefined();
      expect(await storage.getItem('key2')).toBe('value2');
    });
  });

  describe('keys', () => {
    test('should return empty array for empty storage', () => {
      const keys = storage.keys();

      expect(keys).toEqual([]);
    });

    test('should return all stored keys', async () => {
      await storage.setItem('key1', 'value1');
      await storage.setItem('key2', 'value2');
      await storage.setItem('key3', 'value3');

      const keys = storage.keys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    test('should return updated keys after removal', async () => {
      await storage.setItem('key1', 'value1');
      await storage.setItem('key2', 'value2');
      await storage.removeItem('key1');

      const keys = storage.keys();

      expect(keys).toHaveLength(1);
      expect(keys).toContain('key2');
      expect(keys).not.toContain('key1');
    });

    test('should return updated keys after clear', async () => {
      await storage.setItem('key1', 'value1');
      await storage.setItem('key2', 'value2');
      storage.clear();

      const keys = storage.keys();

      expect(keys).toEqual([]);
    });

    test('should return a new array each time', async () => {
      await storage.setItem('key1', 'value1');

      const keys1 = storage.keys();
      const keys2 = storage.keys();

      expect(keys1).toEqual(keys2);
      expect(keys1).not.toBe(keys2); // Different array instances
    });
  });

  describe('getStore', () => {
    test('should return a Map with stored values', async () => {
      await storage.setItem('key1', 'value1');
      await storage.setItem('key2', 123);

      const store = storage.getStore();

      expect(store).toBeInstanceOf(Map);
      expect(store.get('key1')).toBe('value1');
      expect(store.get('key2')).toBe(123);
    });

    test('should return a copy of the store, not the original', async () => {
      await storage.setItem('key1', 'value1');

      const store1 = storage.getStore();
      await storage.setItem('key2', 'value2');
      const store2 = storage.getStore();

      expect(store1).not.toBe(store2); // Different Map instances
      expect(store1.get('key2')).toBeUndefined(); // store1 is a snapshot
      expect(store2.get('key2')).toBe('value2'); // store2 has the new value
    });

    test('should return empty Map for empty storage', () => {
      const store = storage.getStore();

      expect(store).toBeInstanceOf(Map);
      expect(store.size).toBe(0);
    });

    test('should return a new Map instance each time', async () => {
      await storage.setItem('key1', 'value1');

      const store1 = storage.getStore();
      const store2 = storage.getStore();

      expect(store1).not.toBe(store2); // Different instances
      expect(store1.size).toBe(store2.size);
    });

    test('should not affect original store when modifying returned Map', async () => {
      await storage.setItem('key1', 'value1');

      const store = storage.getStore();
      store.set('key2', 'value2'); // Modify the returned Map

      // Original storage should not be affected
      expect(await storage.getItem('key2')).toBeUndefined();
      expect(await storage.getItem('key1')).toBe('value1');
    });
  });

  describe('integration', () => {
    test('should handle full storage lifecycle', async () => {
      // Set multiple items
      await storage.setItem('item1', 'value1');
      await storage.setItem('item2', 'value2');
      await storage.setItem('item3', 'value3');

      // Verify all items are stored
      expect(await storage.getItem('item1')).toBe('value1');
      expect(await storage.getItem('item2')).toBe('value2');
      expect(await storage.getItem('item3')).toBe('value3');
      expect(storage.keys()).toHaveLength(3);

      // Remove one item
      await storage.removeItem('item2');
      expect(await storage.getItem('item2')).toBeUndefined();
      expect(storage.keys()).toHaveLength(2);

      // Update an item
      await storage.setItem('item1', 'updated-value');
      expect(await storage.getItem('item1')).toBe('updated-value');

      // Clear all
      storage.clear();
      expect(storage.keys()).toHaveLength(0);
      expect(await storage.getItem('item1')).toBeUndefined();
      expect(await storage.getItem('item3')).toBeUndefined();
    });

    test('should handle complex nested objects', async () => {
      const complexObject = {
        id: 1,
        name: 'test',
        metadata: {
          tags: ['tag1', 'tag2'],
          settings: {
            enabled: true,
            count: 42
          }
        }
      };

      await storage.setItem('complex', complexObject);
      const result = await storage.getItem<typeof complexObject>('complex');

      expect(result).toEqual(complexObject);
      expect(result?.metadata.tags).toEqual(['tag1', 'tag2']);
      expect(result?.metadata.settings.enabled).toBe(true);
    });

    test('should handle concurrent operations', async () => {
      const promises = [
        storage.setItem('key1', 'value1'),
        storage.setItem('key2', 'value2'),
        storage.setItem('key3', 'value3')
      ];

      await Promise.all(promises);

      expect(storage.keys()).toHaveLength(3);
      expect(await storage.getItem('key1')).toBe('value1');
      expect(await storage.getItem('key2')).toBe('value2');
      expect(await storage.getItem('key3')).toBe('value3');
    });
  });
});
