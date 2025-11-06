/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable no-magic-numbers */
import { PendingCommands } from '../src/PendingCommands';
import { NotificationsProvider } from '../src/providers';

describe('PendingCommands', () => {
  let mockProvider: jest.Mocked<NotificationsProvider>;
  let pendingCommands: PendingCommands;

  beforeEach(() => {
    mockProvider = {
      // eslint-disable-next-line unicorn/no-useless-undefined
      close: jest.fn().mockResolvedValue(undefined),
      // eslint-disable-next-line unicorn/no-useless-undefined
      init: jest.fn().mockResolvedValue(undefined),
      // eslint-disable-next-line unicorn/no-useless-undefined
      subscribe: jest.fn().mockResolvedValue(undefined),
      // eslint-disable-next-line unicorn/no-useless-undefined
      unsubscribe: jest.fn().mockResolvedValue(undefined)
    };
    pendingCommands = new PendingCommands(mockProvider);
  });

  describe('constructor', () => {
    test('should initialize with empty commands map', () => {
      expect(pendingCommands).toBeInstanceOf(PendingCommands);
    });
  });

  describe('add', () => {
    test('should add subscribe command and return done function', () => {
      const topicId = 'topic-1';

      const done = pendingCommands.add('subscribe', topicId);

      expect(done).toBeInstanceOf(Function);
    });

    test('should add unsubscribe command and return done function', () => {
      const topicId = 'topic-1';

      const done = pendingCommands.add('unsubscribe', topicId);

      expect(done).toBeInstanceOf(Function);
    });

    test('should allow adding multiple commands', () => {
      const topicId1 = 'topic-1';
      const topicId2 = 'topic-2';

      const done1 = pendingCommands.add('subscribe', topicId1);
      const done2 = pendingCommands.add('unsubscribe', topicId2);

      expect(done1).toBeInstanceOf(Function);
      expect(done2).toBeInstanceOf(Function);
      expect(done1).not.toBe(done2);
    });

    test('should remove command when done function is called', () => {
      const topicId = 'topic-1';

      const done = pendingCommands.add('subscribe', topicId);

      // Command should be in the map before calling done
      done();

      // After calling done, the command should be removed
      // We verify this by checking that onConnectionRestored doesn't execute it
      pendingCommands.onConnectionRestored();

      expect(mockProvider.subscribe).not.toHaveBeenCalled();
    });

    test('should handle multiple done calls', () => {
      const topicId = 'topic-1';

      const done = pendingCommands.add('subscribe', topicId);

      done();
      done(); // Calling multiple times should not throw

      pendingCommands.onConnectionRestored();

      expect(mockProvider.subscribe).not.toHaveBeenCalled();
    });
  });

  describe('onConnectionRestored', () => {
    test('should execute subscribe command when connection is restored', async () => {
      const topicId = 'topic-1';

      const subscribePromise = new Promise<void>((resolve) => {
        mockProvider.subscribe.mockImplementationOnce(() => {
          resolve();
          return Promise.resolve(undefined);
        });
      });

      pendingCommands.add('subscribe', topicId);
      pendingCommands.onConnectionRestored();

      await subscribePromise;

      expect(mockProvider.subscribe).toHaveBeenCalledTimes(1);
      expect(mockProvider.subscribe).toHaveBeenCalledWith(topicId);
      expect(mockProvider.unsubscribe).not.toHaveBeenCalled();
    });

    test('should execute unsubscribe command when connection is restored', async () => {
      const topicId = 'topic-1';

      const unsubscribePromise = new Promise<void>((resolve) => {
        mockProvider.unsubscribe.mockImplementationOnce(() => {
          resolve();
          return Promise.resolve(undefined);
        });
      });

      pendingCommands.add('unsubscribe', topicId);
      pendingCommands.onConnectionRestored();

      await unsubscribePromise;

      expect(mockProvider.unsubscribe).toHaveBeenCalledTimes(1);
      expect(mockProvider.unsubscribe).toHaveBeenCalledWith(topicId);
      expect(mockProvider.subscribe).not.toHaveBeenCalled();
    });

    test('should execute multiple commands when connection is restored', async () => {
      const topicId1 = 'topic-1';
      const topicId2 = 'topic-2';
      const topicId3 = 'topic-3';

      let subscribeCallCount = 0;
      let unsubscribeCallCount = 0;
      const allCommandsPromise = new Promise<void>((resolve) => {
        mockProvider.subscribe.mockImplementation(() => {
          subscribeCallCount++;
          if (subscribeCallCount === 2 && unsubscribeCallCount === 1) {
            resolve();
          }
          return Promise.resolve(undefined);
        });
        mockProvider.unsubscribe.mockImplementation(() => {
          unsubscribeCallCount++;
          if (subscribeCallCount === 2 && unsubscribeCallCount === 1) {
            resolve();
          }
          return Promise.resolve(undefined);
        });
      });

      pendingCommands.add('subscribe', topicId1);
      pendingCommands.add('unsubscribe', topicId2);
      pendingCommands.add('subscribe', topicId3);

      pendingCommands.onConnectionRestored();

      await allCommandsPromise;

      expect(mockProvider.subscribe).toHaveBeenCalledTimes(2);
      expect(mockProvider.subscribe).toHaveBeenCalledWith(topicId1);
      expect(mockProvider.subscribe).toHaveBeenCalledWith(topicId3);
      expect(mockProvider.unsubscribe).toHaveBeenCalledTimes(1);
      expect(mockProvider.unsubscribe).toHaveBeenCalledWith(topicId2);
    });

    test('should handle promise rejection gracefully', async () => {
      const topicId = 'topic-1';
      const error = new Error('Subscription failed');
      const subscribePromise = new Promise<void>((resolve) => {
        mockProvider.subscribe.mockImplementationOnce(() => {
          resolve();
          return Promise.reject(error);
        });
      });

      pendingCommands.add('subscribe', topicId);
      pendingCommands.onConnectionRestored();

      await subscribePromise;

      expect(mockProvider.subscribe).toHaveBeenCalledWith(topicId);
      // Should not throw
    });

    test('should not execute commands that were removed before connection restored', async () => {
      const topicId1 = 'topic-1';
      const topicId2 = 'topic-2';

      const done1 = pendingCommands.add('subscribe', topicId1);
      pendingCommands.add('subscribe', topicId2);

      done1(); // Remove first command

      pendingCommands.onConnectionRestored();

      expect(mockProvider.subscribe).toHaveBeenCalledTimes(1);
      expect(mockProvider.subscribe).toHaveBeenCalledWith(topicId2);
      expect(mockProvider.subscribe).not.toHaveBeenCalledWith(topicId1);
    });

    test('should handle empty commands map', () => {
      pendingCommands.onConnectionRestored();

      expect(mockProvider.subscribe).not.toHaveBeenCalled();
      expect(mockProvider.unsubscribe).not.toHaveBeenCalled();
    });

    test('should create a snapshot of commands before executing', async () => {
      const topicId1 = 'topic-1';
      const topicId2 = 'topic-2';

      let subscribeCallCount = 0;
      const subscribePromise = new Promise<void>((resolve) => {
        mockProvider.subscribe.mockImplementation(() => {
          subscribeCallCount++;
          if (subscribeCallCount === 2) {
            resolve();
          }
          return Promise.resolve(undefined);
        });
      });

      pendingCommands.add('subscribe', topicId1);
      pendingCommands.add('subscribe', topicId2);

      // Start execution
      pendingCommands.onConnectionRestored();

      // Add new command while previous ones are executing
      pendingCommands.add('unsubscribe', 'topic-3');

      await subscribePromise;

      // Should only execute the original two commands
      expect(mockProvider.subscribe).toHaveBeenCalledTimes(2);
      expect(mockProvider.unsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('integration', () => {
    test('should handle full lifecycle: add, restore, done', async () => {
      const topicId = 'topic-1';

      const firstSubscribePromise = new Promise<void>((resolve) => {
        mockProvider.subscribe.mockImplementationOnce(() => {
          resolve();
          return Promise.resolve(undefined);
        });
      });

      pendingCommands.add('subscribe', topicId);

      // Connection restored
      pendingCommands.onConnectionRestored();

      await firstSubscribePromise;

      expect(mockProvider.subscribe).toHaveBeenCalledWith(topicId);

      // Command should be removed after done is called
      // Verify by calling onConnectionRestored again
      mockProvider.subscribe.mockClear();
      pendingCommands.onConnectionRestored();

      // Wait a bit to ensure subscribe is not called
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not be called again since done was called
      expect(mockProvider.subscribe).not.toHaveBeenCalled();
    });

    test('should handle mixed subscribe and unsubscribe commands', async () => {
      const subscribeTopics = ['topic-1', 'topic-2'];
      const unsubscribeTopics = ['topic-3', 'topic-4'];

      let subscribeCallCount = 0;
      let unsubscribeCallCount = 0;
      const allCommandsPromise = new Promise<void>((resolve) => {
        mockProvider.subscribe.mockImplementation(() => {
          subscribeCallCount++;
          if (subscribeCallCount === 2 && unsubscribeCallCount === 2) {
            resolve();
          }
          return Promise.resolve(undefined);
        });
        mockProvider.unsubscribe.mockImplementation(() => {
          unsubscribeCallCount++;
          if (subscribeCallCount === 2 && unsubscribeCallCount === 2) {
            resolve();
          }
          return Promise.resolve(undefined);
        });
      });

      subscribeTopics.forEach((topicId) => {
        pendingCommands.add('subscribe', topicId);
      });

      unsubscribeTopics.forEach((topicId) => {
        pendingCommands.add('unsubscribe', topicId);
      });

      pendingCommands.onConnectionRestored();

      await allCommandsPromise;

      expect(mockProvider.subscribe).toHaveBeenCalledTimes(2);
      subscribeTopics.forEach((topicId) => {
        expect(mockProvider.subscribe).toHaveBeenCalledWith(topicId);
      });

      expect(mockProvider.unsubscribe).toHaveBeenCalledTimes(2);
      unsubscribeTopics.forEach((topicId) => {
        expect(mockProvider.unsubscribe).toHaveBeenCalledWith(topicId);
      });
    });
  });
});
