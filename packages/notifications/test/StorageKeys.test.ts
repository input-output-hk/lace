import { StorageKeys } from '../src/StorageKeys';

describe('StorageKeys', () => {
  const testPrefix = 'test-prefix';
  let storageKeys: StorageKeys;

  beforeEach(() => {
    storageKeys = new StorageKeys(testPrefix);
  });

  describe('constructor', () => {
    test('should initialize with the provided prefix', () => {
      const prefix = 'my-prefix';
      const keys = new StorageKeys(prefix);

      expect(keys.getToken()).toBe(`${prefix}:token`);
      expect(keys.getSubscribedTopics()).toBe(`${prefix}:subscribedTopics`);
      expect(keys.getUnsubscribedTopics()).toBe(`${prefix}:unsubscribedTopics`);
      expect(keys.getUserId()).toBe(`${prefix}:userId`);
    });

    test('should handle empty prefix', () => {
      const keys = new StorageKeys('');

      expect(keys.getToken()).toBe(':token');
      expect(keys.getSubscribedTopics()).toBe(':subscribedTopics');
      expect(keys.getUnsubscribedTopics()).toBe(':unsubscribedTopics');
      expect(keys.getUserId()).toBe(':userId');
    });

    test('should handle prefix with special characters', () => {
      const prefix = 'prefix-with-special-chars_123';
      const keys = new StorageKeys(prefix);

      expect(keys.getToken()).toBe(`${prefix}:token`);
      expect(keys.getSubscribedTopics()).toBe(`${prefix}:subscribedTopics`);
      expect(keys.getUnsubscribedTopics()).toBe(`${prefix}:unsubscribedTopics`);
      expect(keys.getUserId()).toBe(`${prefix}:userId`);
    });
  });

  describe('getToken', () => {
    test('should return token key with prefix', () => {
      const result = storageKeys.getToken();

      expect(result).toBe(`${testPrefix}:token`);
    });

    test('should return consistent token key', () => {
      const firstCall = storageKeys.getToken();
      const secondCall = storageKeys.getToken();

      expect(firstCall).toBe(secondCall);
      expect(firstCall).toBe(`${testPrefix}:token`);
    });
  });

  describe('getSubscribedTopics', () => {
    test('should return subscribedTopics key with prefix', () => {
      const result = storageKeys.getSubscribedTopics();

      expect(result).toBe(`${testPrefix}:subscribedTopics`);
    });

    test('should return consistent subscribedTopics key', () => {
      const firstCall = storageKeys.getSubscribedTopics();
      const secondCall = storageKeys.getSubscribedTopics();

      expect(firstCall).toBe(secondCall);
      expect(firstCall).toBe(`${testPrefix}:subscribedTopics`);
    });
  });

  describe('getUnsubscribedTopics', () => {
    test('should return unsubscribedTopics key with prefix', () => {
      const result = storageKeys.getUnsubscribedTopics();

      expect(result).toBe(`${testPrefix}:unsubscribedTopics`);
    });

    test('should return consistent unsubscribedTopics key', () => {
      const firstCall = storageKeys.getUnsubscribedTopics();
      const secondCall = storageKeys.getUnsubscribedTopics();

      expect(firstCall).toBe(secondCall);
      expect(firstCall).toBe(`${testPrefix}:unsubscribedTopics`);
    });
  });

  describe('getUserId', () => {
    test('should return userId key with prefix', () => {
      const result = storageKeys.getUserId();

      expect(result).toBe(`${testPrefix}:userId`);
    });

    test('should return consistent userId key', () => {
      const firstCall = storageKeys.getUserId();
      const secondCall = storageKeys.getUserId();

      expect(firstCall).toBe(secondCall);
      expect(firstCall).toBe(`${testPrefix}:userId`);
    });
  });

  describe('getLastSync', () => {
    test('should return lastSync key with prefix and topic', () => {
      const topic = 'my-topic';
      const result = storageKeys.getLastSync(topic);

      expect(result).toBe(`${testPrefix}:lastSync:${topic}`);
    });

    test('should handle different topics', () => {
      const topic1 = 'topic-1';
      const topic2 = 'topic-2';

      const result1 = storageKeys.getLastSync(topic1);
      const result2 = storageKeys.getLastSync(topic2);

      expect(result1).toBe(`${testPrefix}:lastSync:${topic1}`);
      expect(result2).toBe(`${testPrefix}:lastSync:${topic2}`);
      expect(result1).not.toBe(result2);
    });

    test('should handle empty topic', () => {
      const result = storageKeys.getLastSync('');

      expect(result).toBe(`${testPrefix}:lastSync:`);
    });

    test('should handle topic with special characters', () => {
      const topic = 'topic-with-special-chars_123';
      const result = storageKeys.getLastSync(topic);

      expect(result).toBe(`${testPrefix}:lastSync:${topic}`);
    });

    test('should return consistent key for same topic', () => {
      const topic = 'consistent-topic';
      const firstCall = storageKeys.getLastSync(topic);
      const secondCall = storageKeys.getLastSync(topic);

      expect(firstCall).toBe(secondCall);
      expect(firstCall).toBe(`${testPrefix}:lastSync:${topic}`);
    });
  });

  describe('integration', () => {
    test('should work correctly with all methods together', () => {
      const prefix = 'integration-test';
      const keys = new StorageKeys(prefix);
      const topic = 'test-topic';

      const token = keys.getToken();
      const subscribedTopics = keys.getSubscribedTopics();
      const unsubscribedTopics = keys.getUnsubscribedTopics();
      const userId = keys.getUserId();
      const lastSync = keys.getLastSync(topic);

      expect(token).toBe(`${prefix}:token`);
      expect(subscribedTopics).toBe(`${prefix}:subscribedTopics`);
      expect(unsubscribedTopics).toBe(`${prefix}:unsubscribedTopics`);
      expect(userId).toBe(`${prefix}:userId`);
      expect(lastSync).toBe(`${prefix}:lastSync:${topic}`);
      expect(token).not.toBe(subscribedTopics);
      expect(subscribedTopics).not.toBe(unsubscribedTopics);
      expect(unsubscribedTopics).not.toBe(userId);
      expect(userId).not.toBe(lastSync);
      expect(token).not.toBe(lastSync);
    });

    test('should handle multiple instances with different prefixes', () => {
      const prefix1 = 'prefix-1';
      const prefix2 = 'prefix-2';
      const keys1 = new StorageKeys(prefix1);
      const keys2 = new StorageKeys(prefix2);
      const topic = 'same-topic';

      expect(keys1.getToken()).toBe(`${prefix1}:token`);
      expect(keys2.getToken()).toBe(`${prefix2}:token`);
      expect(keys1.getSubscribedTopics()).toBe(`${prefix1}:subscribedTopics`);
      expect(keys2.getSubscribedTopics()).toBe(`${prefix2}:subscribedTopics`);
      expect(keys1.getUnsubscribedTopics()).toBe(`${prefix1}:unsubscribedTopics`);
      expect(keys2.getUnsubscribedTopics()).toBe(`${prefix2}:unsubscribedTopics`);
      expect(keys1.getUserId()).toBe(`${prefix1}:userId`);
      expect(keys2.getUserId()).toBe(`${prefix2}:userId`);
      expect(keys1.getLastSync(topic)).toBe(`${prefix1}:lastSync:${topic}`);
      expect(keys2.getLastSync(topic)).toBe(`${prefix2}:lastSync:${topic}`);
    });
  });
});
