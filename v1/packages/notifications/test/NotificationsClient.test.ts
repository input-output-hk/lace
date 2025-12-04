/* eslint-disable max-statements */
/* eslint-disable no-new */
/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unicorn/no-useless-undefined */
import { NotificationsClient } from '../src/NotificationsClient';
import { MockStorage } from './MockStorage';
import { PubNubProvider } from '../src/providers/PubNub/PubNubProvider';
import type { NotificationsLogger, Topic } from '../src/types';
import type { NotificationsProvider, ProviderInitOptions } from '../src/providers';
import { ConnectionStatus } from '../src/ConnectionStatus';
// Mock uuid v4 to return a fixed value for testing
jest.mock('uuid', () => ({
  ...jest.requireActual('uuid'),
  v4: jest.fn(() => 'test-user')
}));
// Mock PubNub to avoid loading it (it requires TextEncoder)
// We don't use this mock in tests, we only mock PubNubProvider
jest.mock('pubnub', () =>
  jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    objects: { getAllChannelMetadata: jest.fn() },
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    unsubscribeAll: jest.fn(),
    stop: jest.fn()
  }))
);

// Mock only PubNubProvider
jest.mock('../src/providers/PubNub/PubNubProvider');

const createTopic = (id: string, autoSubscribe = false): Topic => ({
  id,
  name: `Topic ${id}`,
  autoSubscribe,
  chain: 'mainnet',
  isSubscribed: false,
  publisher: `Test Publisher ${id}`
});

describe('NotificationsClient', () => {
  let mockLogger: jest.Mocked<NotificationsLogger>;
  let mockStorage: MockStorage;
  let mockProvider: jest.Mocked<NotificationsProvider>;
  let mockOnNotification: jest.Mock;
  let mockOnTopics: jest.Mock;
  let client: NotificationsClient;
  let connectionStatus: ConnectionStatus;
  let initPromise: Promise<Topic[]>;
  let initShouldThrow: boolean;
  let initTopics: Topic[];
  let onConnectionStatusChange: (error?: Error) => void;
  let onConnectionStatusChangePromise: Promise<unknown>;

  const subscribeKey = 'test-subscribe-key';

  /**
   * Helper function to wait for storage.setItem to be called.
   * Used to wait for updateTopics to complete.
   */
  const waitForSetItem = (): Promise<void> =>
    new Promise<void>((resolve) => {
      const originalSetItem = mockStorage.setItem.bind(mockStorage);
      jest.spyOn(mockStorage, 'setItem').mockImplementationOnce(async (key: string, value: unknown) => {
        const result = await originalSetItem(key, value);
        resolve();
        return result;
      });
    });

  /**
   * Helper function to wait for provider.subscribe to be called.
   * Used to wait for subscribe operations to complete.
   */
  const waitForSubscribe = (): Promise<void> =>
    new Promise<void>((resolve) => {
      mockProvider.subscribe.mockImplementationOnce(() => {
        resolve();
        return Promise.resolve(undefined);
      });
    });

  /**
   * Helper function to wait for client initialization to complete.
   * Waits for the init promise to resolve.
   */
  const waitForClientInit = async (): Promise<void> => {
    // Wait for init to be called
    await initPromise;

    let err;
    do {
      err = undefined;
      try {
        client.ensureIsOperational();
      } catch (error) {
        err = error;
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    } while (err);
  };

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    mockStorage = new MockStorage();
    mockOnNotification = jest.fn();
    mockOnTopics = jest.fn();
    initShouldThrow = false;
    initTopics = [];

    initPromise = new Promise<Topic[]>((resolve, reject) => {
      mockProvider = {
        close: jest.fn().mockResolvedValue(undefined),
        init: jest.fn().mockImplementation((options: ProviderInitOptions) => {
          connectionStatus = options.connectionStatus;
          initShouldThrow ? reject(new Error('Init failed')) : resolve(initTopics);
          return initPromise;
        }),
        subscribe: jest.fn().mockResolvedValue(undefined),
        unsubscribe: jest.fn().mockResolvedValue(undefined)
      };
    });

    (PubNubProvider as jest.Mock).mockClear();
    (PubNubProvider as jest.Mock).mockImplementation(() => mockProvider);

    onConnectionStatusChangePromise = new Promise((resolve) => {
      onConnectionStatusChange = resolve;
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();

    // Clean up client if it exists
    if (client) {
      try {
        await client.close();
      } catch {
        // Ignore errors during cleanup
      }
    }
  });

  describe('constructor', () => {
    test('should initialize with valid options', async () => {
      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      expect(client).toBeInstanceOf(NotificationsClient);
      expect(PubNubProvider).toHaveBeenCalled();

      // Wait for init to complete
      await waitForClientInit();

      expect(mockProvider.init).toHaveBeenCalled();
    });

    test('should use default logger when not provided', async () => {
      const originalConsole = console;
      const mockConsole = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };
      global.console = mockConsole as any;

      client = new NotificationsClient({
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      expect(client).toBeInstanceOf(NotificationsClient);
      expect(PubNubProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          logger: mockConsole
        })
      );

      global.console = originalConsole;
    });

    test('should use default storageKeysPrefix when not provided', async () => {
      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      expect(client).toBeInstanceOf(NotificationsClient);
    });

    test('should use custom storageKeysPrefix when provided', async () => {
      const customPrefix = 'custom:prefix:';
      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        storageKeysPrefix: customPrefix,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      expect(client).toBeInstanceOf(NotificationsClient);
    });

    test('should use default heartbeatInterval when not provided', async () => {
      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      expect(PubNubProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          heartbeatInterval: 0
        })
      );
      await Promise.resolve();
    });

    test('should use custom heartbeatInterval when provided', async () => {
      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey,
            heartbeatInterval: 30
          }
        }
      });

      expect(PubNubProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          heartbeatInterval: 30
        })
      );
      await Promise.resolve();
    });

    test('should throw error when options is not an object', () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        // eslint-disable-next-line unicorn/no-null
        new NotificationsClient(null);
      }).toThrow('options must be an object');
    });

    test('should throw error when provider is null', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          storage: mockStorage,
          // @ts-expect-error Testing invalid input
          // eslint-disable-next-line unicorn/no-null
          provider: null
        });
      }).toThrow('provider must be an object');
    });

    test('should throw error when provider is not an object', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          storage: mockStorage,
          // @ts-expect-error Testing invalid input
          provider: 'invalid'
        });
      }).toThrow('provider must be an object');
    });

    test('should throw error when provider.configuration is not an object', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          storage: mockStorage,
          provider: {
            name: 'PubNub',
            // @ts-expect-error Testing invalid input
            configuration: 'invalid'
          }
        });
      }).toThrow('provider.configuration must be an object');
    });

    test('should throw error when logger is not an object', () => {
      expect(() => {
        new NotificationsClient({
          // @ts-expect-error Testing invalid input
          logger: 'invalid',
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          storage: mockStorage,
          provider: {
            name: 'PubNub',
            configuration: {
              subscribeKey
            }
          }
        });
      }).toThrow('logger must be an object');
    });

    test('should throw error when logger.info is not a function', () => {
      expect(() => {
        new NotificationsClient({
          // @ts-expect-error Testing invalid input
          logger: { warn: jest.fn(), error: jest.fn() },
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          storage: mockStorage,
          provider: {
            name: 'PubNub',
            configuration: {
              subscribeKey
            }
          }
        });
      }).toThrow('logger.info must be a function');
    });

    test('should throw error when logger.warn is not a function', () => {
      expect(() => {
        new NotificationsClient({
          // @ts-expect-error Testing invalid input
          logger: { info: jest.fn(), error: jest.fn() },
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          storage: mockStorage,
          provider: {
            name: 'PubNub',
            configuration: {
              subscribeKey
            }
          }
        });
      }).toThrow('logger.warn must be a function');
    });

    test('should throw error when logger.error is not a function', () => {
      expect(() => {
        new NotificationsClient({
          // @ts-expect-error Testing invalid input
          logger: { info: jest.fn(), warn: jest.fn() },
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          storage: mockStorage,
          provider: {
            name: 'PubNub',
            configuration: {
              subscribeKey
            }
          }
        });
      }).toThrow('logger.error must be a function');
    });

    test('should throw error when provider.name is not a string', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          provider: {
            // @ts-expect-error Testing invalid input
            name: 123,
            configuration: {
              subscribeKey
            }
          },
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          storage: mockStorage
        });
      }).toThrow('provider.name must be a string');
    });

    test('should throw error when provider.name is invalid', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          provider: {
            // @ts-expect-error Testing invalid input
            name: 'InvalidProvider',
            configuration: {
              usePollingMode: false,
              subscribeKey
            }
          },
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          storage: mockStorage
        });
      }).toThrow('provider.name must be one of the following: PubNub');
    });

    test('should throw error when onConnectionStatusChange is not a function', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          // @ts-expect-error Testing invalid input
          onConnectionStatusChange: 'invalid',
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          storage: mockStorage,
          provider: {
            name: 'PubNub',
            configuration: {
              usePollingMode: false,
              subscribeKey
            }
          }
        });
      }).toThrow('onConnectionStatusChange must be a function');
    });

    test('should throw error when onNotification is not a function', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          // @ts-expect-error Testing invalid input
          onNotification: 'invalid',
          onTopics: mockOnTopics,
          storage: mockStorage,
          provider: {
            name: 'PubNub',
            configuration: {
              usePollingMode: false,
              subscribeKey
            }
          }
        });
      }).toThrow('onNotification must be a function');
    });

    test('should throw error when onTopics is not a function', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          onNotification: mockOnNotification,
          // @ts-expect-error Testing invalid input
          onTopics: 'invalid',
          storage: mockStorage,
          provider: {
            name: 'PubNub',
            configuration: {
              usePollingMode: false,
              subscribeKey
            }
          }
        });
      }).toThrow('onTopics must be a function');
    });

    test('should throw error when storage is not an object', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          // @ts-expect-error Testing invalid input
          storage: 'invalid',
          provider: {
            name: 'PubNub',
            configuration: {
              usePollingMode: false,
              subscribeKey
            }
          }
        });
      }).toThrow('storage must be an object');
    });

    test('should throw error when storage.getItem is not a function', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          // @ts-expect-error Testing invalid input
          storage: { setItem: jest.fn(), removeItem: jest.fn() },
          provider: {
            name: 'PubNub',
            configuration: {
              usePollingMode: false,
              subscribeKey
            }
          }
        });
      }).toThrow('storage.getItem must be a function');
    });

    test('should throw error when storage.setItem is not a function', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          // @ts-expect-error Testing invalid input
          storage: { getItem: jest.fn(), removeItem: jest.fn() },
          provider: {
            name: 'PubNub',
            configuration: {
              usePollingMode: false,
              subscribeKey
            }
          }
        });
      }).toThrow('storage.setItem must be a function');
    });

    test('should throw error when storage.removeItem is not a function', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          // @ts-expect-error Testing invalid input
          storage: { getItem: jest.fn(), setItem: jest.fn() },
          provider: {
            name: 'PubNub',
            configuration: {
              usePollingMode: false,
              subscribeKey
            }
          }
        });
      }).toThrow('storage.removeItem must be a function');
    });

    test('should throw error when storageKeysPrefix is not a string', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          storage: mockStorage,
          // @ts-expect-error Testing invalid input
          storageKeysPrefix: 123,
          provider: {
            name: 'PubNub',
            configuration: {
              usePollingMode: false,
              subscribeKey
            }
          }
        });
      }).toThrow('storageKeysPrefix must be a string');
    });

    test('should throw error when heartbeatInterval is not a number', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          storage: mockStorage,
          provider: {
            name: 'PubNub',
            configuration: {
              usePollingMode: false,
              subscribeKey,
              // @ts-expect-error Testing invalid input
              heartbeatInterval: 'invalid'
            }
          }
        });
      }).toThrow('provider.configuration.heartbeatInterval must be a number');
    });

    test('should throw error when skipAuthentication is not a boolean', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          storage: mockStorage,
          provider: {
            name: 'PubNub',
            configuration: {
              usePollingMode: false,
              subscribeKey,
              // @ts-expect-error Testing invalid input
              skipAuthentication: 'invalid'
            }
          }
        });
      }).toThrow('provider.configuration.skipAuthentication must be a boolean');
    });

    test('should throw error when subscribeKey is not a string', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          storage: mockStorage,
          provider: {
            name: 'PubNub',
            configuration: {
              usePollingMode: false,
              // @ts-expect-error Testing invalid input
              subscribeKey: 123
            }
          }
        });
      }).toThrow('provider.configuration.subscribeKey must be a string');
    });

    test('should throw error when tokenEndpoint is not a string', () => {
      expect(() => {
        new NotificationsClient({
          logger: mockLogger,
          onNotification: mockOnNotification,
          onTopics: mockOnTopics,
          storage: mockStorage,
          provider: {
            name: 'PubNub',
            configuration: {
              usePollingMode: false,
              subscribeKey,
              // @ts-expect-error Testing invalid input
              tokenEndpoint: 123
            }
          }
        });
      }).toThrow('provider.configuration.tokenEndpoint must be a string');
    });

    test('should handle init error gracefully', async () => {
      initShouldThrow = true;

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      try {
        await waitForClientInit();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Init failed');
      }

      expect.assertions(2);
    });
  });

  describe('close', () => {
    beforeEach(async () => {
      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      await waitForClientInit();
    });

    test('should close the provider', async () => {
      await client.close();

      expect(mockProvider.close).toHaveBeenCalledTimes(1);
    });

    test('should not close multiple times', async () => {
      await client.close();
      await client.close();

      expect(mockProvider.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('ensureIsOperational', () => {
    test('should throw error when not initialized', () => {
      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      expect(() => {
        client.ensureIsOperational();
      }).toThrow('NotificationsClient is not initialized');
    });

    test('should throw error when closed', async () => {
      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      await waitForClientInit();

      await client.close();

      expect(() => {
        client.ensureIsOperational();
      }).toThrow('NotificationsClient is closed');
    });
  });

  describe('subscribe', () => {
    const topic1 = createTopic('topic-1');
    const topic2 = createTopic('topic-2');

    beforeEach(async () => {
      initTopics = [topic1, topic2];

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      // Wait for initialization
      await waitForClientInit();
    });

    test('should subscribe to a topic', async () => {
      await client.subscribe('topic-1');

      expect(mockProvider.subscribe).toHaveBeenCalledWith('topic-1');
    });

    test('should throw error when topic is already subscribed', async () => {
      await client.subscribe('topic-1');

      await expect(client.subscribe('topic-1')).rejects.toThrow('Topic already subscribed topic-1');
    });

    test('should throw error when topic is unknown', async () => {
      await expect(client.subscribe('unknown-topic')).rejects.toThrow('Unknown topic unknown-topic');
    });

    test('should update storage with subscribed topics', async () => {
      await client.subscribe('topic-1');

      const subscribedTopics = await mockStorage.getItem<string[]>('notifications:subscribedTopics');
      expect(subscribedTopics).toContain('topic-1');
    });
  });

  describe('unsubscribe', () => {
    const topic1 = createTopic('topic-1');
    const topic2 = createTopic('topic-2');

    beforeEach(async () => {
      initTopics = [topic1, topic2];

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      // Wait for initialization
      await waitForClientInit();

      // First subscribe to topic-1
      await client.subscribe('topic-1');
    });

    test('should unsubscribe from a topic', async () => {
      await client.unsubscribe('topic-1');

      expect(mockProvider.unsubscribe).toHaveBeenCalledWith('topic-1');
    });

    test('should throw error when topic is already unsubscribed', async () => {
      await client.unsubscribe('topic-1');

      await expect(client.unsubscribe('topic-1')).rejects.toThrow('Topic already unsubscribed topic-1');
    });

    test('should throw error when topic is unknown', async () => {
      await expect(client.unsubscribe('unknown-topic')).rejects.toThrow('Unknown topic unknown-topic');
    });

    test('should update storage with unsubscribed topics', async () => {
      await client.unsubscribe('topic-1');

      const unsubscribedTopics = await mockStorage.getItem<string[]>('notifications:unsubscribedTopics');
      expect(unsubscribedTopics).toContain('topic-1');
    });
  });

  describe('init', () => {
    test('should initialize with topics from provider', async () => {
      const topics = [createTopic('topic-1'), createTopic('topic-2')];
      initTopics = topics;

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      await waitForClientInit();

      expect(mockProvider.init).toHaveBeenCalled();
      expect(mockOnTopics).toHaveBeenCalled();
    });

    test('should restore subscribed topics from storage', async () => {
      const topics = [createTopic('topic-1'), createTopic('topic-2')];
      initTopics = topics;
      await mockStorage.setItem('notifications:subscribedTopics', ['topic-1']);
      await mockStorage.setItem('notifications:unsubscribedTopics', []);

      const subscribePromise = waitForSubscribe();

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      await waitForClientInit();
      await subscribePromise;

      expect(mockProvider.subscribe).toHaveBeenCalledWith('topic-1');
    });

    test('should auto-subscribe to topics with autoSubscribe flag', async () => {
      const topics = [createTopic('topic-1', true), createTopic('topic-2', false)];
      initTopics = topics;

      const subscribePromise = waitForSubscribe();

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      await waitForClientInit();
      await subscribePromise;

      expect(mockProvider.subscribe).toHaveBeenCalledWith('topic-1');
      expect(mockProvider.subscribe).not.toHaveBeenCalledWith('topic-2');
    });

    test('should handle invalid subscribed topics from storage', async () => {
      const topics = [createTopic('topic-1')];
      initTopics = topics;
      await mockStorage.setItem('notifications:subscribedTopics', 'invalid' as any);
      await mockStorage.setItem('notifications:unsubscribedTopics', []);

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      await waitForClientInit();

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    test('should handle invalid unsubscribed topics from storage', async () => {
      const topics = [createTopic('topic-1')];
      initTopics = topics;
      await mockStorage.setItem('notifications:subscribedTopics', []);
      await mockStorage.setItem('notifications:unsubscribedTopics', 123 as any);

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      await waitForClientInit();

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should retry init when it fails', async () => {
      const init = jest
        .spyOn(NotificationsClient.prototype as any, 'init')
        .mockRejectedValueOnce(new Error('Init failed'))
        .mockResolvedValueOnce(undefined);
      jest.spyOn(NotificationsClient.prototype as any, 'initRetryPause').mockResolvedValueOnce(undefined);

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(init).toHaveBeenCalledTimes(2);
    });

    it('should log init retry error', async () => {
      jest
        .spyOn(NotificationsClient.prototype as any, 'initTillSuccess')
        .mockRejectedValueOnce(new Error('Init failed'));

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'NotificationsClient: Failed while retrying to initialize notifications client',
        expect.any(Error)
      );
    });
  });

  describe('trackTopics', () => {
    test('should handle new topics with autoSubscribe', async () => {
      const initialTopics = [createTopic('topic-1')];
      initTopics = initialTopics;

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      await waitForClientInit();

      // Simulate new topic with autoSubscribe via trackTopics callback
      const initCall = mockProvider.init.mock.calls[0][0] as ProviderInitOptions;
      const newTopics = [...initialTopics, createTopic('new-topic', true)];

      const subscribePromise = waitForSubscribe();

      initCall.onTopics(newTopics);

      await subscribePromise;
      expect(mockProvider.subscribe).toHaveBeenCalledWith('new-topic');
    });

    test('should filter out removed topics', async () => {
      const initialTopics = [createTopic('topic-1'), createTopic('topic-2')];
      initTopics = initialTopics;

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      await waitForClientInit();

      // Subscribe to both topics
      await client.subscribe('topic-1');
      await client.subscribe('topic-2');

      // Simulate topic removal via trackTopics callback
      const initCall = mockProvider.init.mock.calls[0][0] as ProviderInitOptions;
      const updatedTopics = [createTopic('topic-1')]; // topic-2 removed

      // Wait for updateTopics to complete (trackTopics calls updateTopics)
      const updatePromise = waitForSetItem();

      initCall.onTopics(updatedTopics);

      await updatePromise;
    });

    test('should retry subscribe when connection is restored after error', async () => {
      const initialTopics = [createTopic('topic-1')];
      initTopics = initialTopics;

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      await waitForClientInit();

      // Clear mocks to count only subsequent calls
      mockProvider.subscribe.mockClear();

      // Get the onTopics callback from the provider init call
      const initCall = mockProvider.init.mock.calls[0][0] as ProviderInitOptions;
      const newTopics = [...initialTopics, createTopic('new-topic', true)];

      // First subscribe call should throw an error
      const subscribeError = new Error('Subscribe failed');
      mockProvider.subscribe.mockRejectedValueOnce(subscribeError);

      // Wait for error to be logged
      const errorPromise = new Promise<unknown[]>((resolve) => {
        mockLogger.error.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      // Emit new topics with autoSubscribe topic
      initCall.onTopics(newTopics);

      // Wait for subscribe to be called and error to be logged
      const errorArgs = await errorPromise;

      // Verify subscribe was called once and failed
      expect(mockProvider.subscribe).toHaveBeenCalledTimes(1);
      expect(mockProvider.subscribe).toHaveBeenCalledWith('new-topic');
      expect(errorArgs).toEqual(['NotificationsClient: Failed to subscribe to topic', 'new-topic', subscribeError]);

      // Clear error mock to count only new calls
      mockLogger.error.mockClear();

      // Now make subscribe succeed
      const retrySubscribePromise = waitForSubscribe();

      // Get connectionStatus from the init call
      const testConnectionStatus = initCall.connectionStatus;

      // Restore connection - this should trigger retry
      // ConnectionStatus uses setTimeout, so we need to wait for the callback
      testConnectionStatus.setOk();

      // Wait for retry subscribe to be called
      await retrySubscribePromise;

      // Verify subscribe was called again (retry)
      expect(mockProvider.subscribe).toHaveBeenCalledTimes(2);
      expect(mockProvider.subscribe).toHaveBeenCalledWith('new-topic');
    });

    test('should catch and log error when storage fails during updateTopics', async () => {
      const initialTopics = [createTopic('topic-1')];
      initTopics = initialTopics;

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      await waitForClientInit();

      // Get the onTopics callback from the provider init call
      const initCall = mockProvider.init.mock.calls[0][0] as ProviderInitOptions;
      const newTopics = [...initialTopics, createTopic('new-topic')];

      // Make storage.setItem throw an error
      // updateTopics calls setItem twice (for subscribedTopics and unsubscribedTopics)
      const storageError = new Error('Storage failed');
      jest.spyOn(mockStorage, 'setItem').mockRejectedValueOnce(storageError);

      const logErrorPromise = new Promise((resolve) => {
        mockLogger.error.mockImplementation((...args) => resolve(args));
      });

      // Emit new topics - this will trigger updateTopics which will fail
      initCall.onTopics(newTopics);

      expect(await logErrorPromise).toEqual(['NotificationsClient: Failed to update topics', storageError]);
    });
  });

  describe('notifyTopics', () => {
    test('should notify topics when they change', async () => {
      const topics = [createTopic('topic-1')];
      initTopics = topics;

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      // Wait for init to complete
      await waitForClientInit();

      expect(mockOnTopics).toHaveBeenCalled();
    });

    test('should handle error in onTopics callback', async () => {
      const topics = [createTopic('topic-1')];
      initTopics = topics;

      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: errorCallback,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      // Wait for init to complete
      await waitForClientInit();

      expect(mockLogger.error).toHaveBeenCalledWith('NotificationsClient: Failed to notify topics', expect.any(Error));
    });

    test('should not notify when provider calls onTopics twice with same value', async () => {
      const initialTopics = [createTopic('topic-1')];
      initTopics = initialTopics;

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      // Wait for init to complete
      await waitForClientInit();

      // Clear the mock to count only subsequent calls
      mockOnTopics.mockClear();

      // Get the onTopics callback from the provider init call
      const initCall = mockProvider.init.mock.calls[0][0] as ProviderInitOptions;
      // Use different topics from initial ones
      const newTopics = [createTopic('topic-3'), createTopic('topic-4')];

      // First call with new topics - should notify
      const firstNotifyPromise = new Promise<unknown[]>((resolve) => {
        mockOnTopics.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      initCall.onTopics(newTopics);

      // Wait for notifyTopics to be called
      const firstNotifyArgs = await firstNotifyPromise;

      // Should have been called once with the new topics
      expect(mockOnTopics).toHaveBeenCalledTimes(1);
      expect(firstNotifyArgs[0]).toEqual(newTopics);

      // Clear to count only the second call
      mockOnTopics.mockClear();

      // Second call with the same topics - should NOT notify
      // Wait for updateTopics to complete (if notifyTopics is not called, updateTopics still completes)
      const secondUpdatePromise = waitForSetItem();

      initCall.onTopics([createTopic('topic-3'), createTopic('topic-4')]);

      await secondUpdatePromise;

      // The callback should not be called again (because topics didn't change)
      expect(mockOnTopics).toHaveBeenCalledTimes(0);
    });
  });

  describe('connection status', () => {
    test('should call onConnectionStatusChange on successful connection', async () => {
      client = new NotificationsClient({
        logger: mockLogger,
        onConnectionStatusChange,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      await waitForClientInit();

      connectionStatus.setOk();

      await expect(onConnectionStatusChangePromise).resolves.toBeUndefined();
    });

    test('should call onConnectionStatusChange on connection error', async () => {
      const connectionError = new Error('Connection error');

      client = new NotificationsClient({
        logger: mockLogger,
        onConnectionStatusChange,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      await waitForClientInit();

      connectionStatus.setError(connectionError);

      await expect(onConnectionStatusChangePromise).resolves.toBe(connectionError);
    });
  });

  describe('getUserId', () => {
    test('should throw error when userId in storage is not a string', async () => {
      await mockStorage.setItem('notifications:userId', 123 as any);

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      // Wait for init to complete (it will fail)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'NotificationsClient: User ID got from storage is not a string',
        123
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'NotificationsClient: Failed to initialize notifications client',
        expect.any(TypeError)
      );
    });

    test('should throw error when userId in storage is not a valid UUID', async () => {
      await mockStorage.setItem('notifications:userId', 'invalid-uuid');

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      // Wait for init to complete (it will fail)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'NotificationsClient: Failed to initialize notifications client',
        expect.any(Error)
      );
      const errorCall = mockLogger.error.mock.calls.find(
        (call) => call[0] === 'NotificationsClient: Failed to initialize notifications client'
      );
      expect(errorCall).toBeDefined();
      if (errorCall) {
        expect(errorCall[1]).toBeInstanceOf(Error);
        expect((errorCall[1] as Error).message).toBe(
          'NotificationsClient: User ID got from storage is not a valid UUID: invalid-uuid'
        );
      }
    });

    test('should not fail when userId in storage is a valid UUID', async () => {
      const validUserId = '550e8400-e29b-41d4-a716-446655440000';
      await mockStorage.setItem('notifications:userId', validUserId);

      client = new NotificationsClient({
        logger: mockLogger,
        onNotification: mockOnNotification,
        onTopics: mockOnTopics,
        storage: mockStorage,
        provider: {
          name: 'PubNub',
          configuration: {
            usePollingMode: false,
            subscribeKey
          }
        }
      });

      // Wait for init to complete
      await waitForClientInit();

      // Verify no errors were logged
      expect(mockLogger.error).not.toHaveBeenCalledWith(
        'NotificationsClient: User ID got from storage is not a string',
        expect.anything()
      );
      expect(mockLogger.error).not.toHaveBeenCalledWith(
        'NotificationsClient: Failed to initialize notifications client',
        expect.any(Error)
      );

      // Verify init was called successfully
      expect(mockProvider.init).toHaveBeenCalled();
      const initCall = mockProvider.init.mock.calls[0][0] as ProviderInitOptions;
      expect(initCall.userId).toBe(validUserId);
    });
  });
});
