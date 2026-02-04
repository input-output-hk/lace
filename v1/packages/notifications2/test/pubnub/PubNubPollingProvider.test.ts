/* eslint-disable no-magic-numbers */
import { TestScheduler } from 'rxjs/testing';
import { PubNubPollingProvider } from '../../src/PubNubProviders/PubNubPollingProvider';
import { PubNubPollingConfig } from '../../src/PubNubProviders/types';
import { PubNubRxWrapper } from '../../src/PubNubProviders/PubNubRxWrapper';
import { NotificationsLogger, StorageAdapter, Topic } from '../../src/types';
import { Observable, of, Subject } from 'rxjs';
import { NotificationsAuthProvider } from '../../src/provider.interface';
import { StorageKeys } from '../../src/StorageKeys';

// Helper to create mock logger
const createMockLogger = () =>
  ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  } as unknown as NotificationsLogger);

// Helper to create mock storage keys
const createMockStorageKeys = () =>
  ({
    getTopics: jest.fn(() => 'topics-key'),
    getSubscribedTopics: jest.fn(() => 'legacy-subscribed-key'),
    getLastSync: jest.fn((topicId: string) => `notifications:lastSync:${topicId}`)
  } as unknown as StorageKeys);

// Helper to create mock wrapper
const createMockWrapper = () =>
  ({
    fetchTopics: jest.fn(() => of([]))
  } as unknown as jest.Mocked<PubNubRxWrapper>);

// Helper to create mock storage with custom getItem behavior
const createMockStorage = (
  getItemFn: (key: string) => Observable<unknown>,
  setItemFn: jest.Mock = jest.fn(() => of(void 0)),
  removeItemFn: jest.Mock = jest.fn(() => of(void 0))
) =>
  ({
    getItem: jest.fn(getItemFn),
    setItem: setItemFn,
    removeItem: removeItemFn
  } as unknown as StorageAdapter);

// Helper to create mock storage for migration tests with standard key pattern
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMigrationMockStorage = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cold: (marbles: string, values?: any, error?: any) => any,
  cachedTopics: unknown,
  legacySubscribedTopics?: string[],
  setItemFn: jest.Mock = jest.fn(() => of(void 0)),
  removeItemFn: jest.Mock = jest.fn(() => of(void 0))
) => {
  const mocks = {
    setItemMock: setItemFn,
    removeItemMock: removeItemFn
  };

  const storage = createMockStorage(
    (key: string) => {
      if (key === 'topics-key') return cold('a|', { a: cachedTopics });
      if (key === 'legacy-subscribed-key') return cold('a|', { a: legacySubscribedTopics });
      return cold('a|', { a: void 0 });
    },
    mocks.setItemMock,
    mocks.removeItemMock
  );

  return { storage, ...mocks };
};

// Helper to create provider config and provider
const createProvider = (mockStorage: StorageAdapter, mockLogger: NotificationsLogger) => {
  const mockConfig: PubNubPollingConfig = {
    authProvider: {} as NotificationsAuthProvider,
    notificationSync$: new Subject(),
    topicSync$: new Subject(),
    storage: mockStorage,
    storageKeys: createMockStorageKeys(),
    wrapper: createMockWrapper(),
    logger: mockLogger
  };
  return new PubNubPollingProvider(mockConfig);
};

describe('PubNubPollingProvider', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  describe('setupTopicSync', () => {
    it('should automatically fetch topics when storage is empty (initial fetch)', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        // Mock channel metadata from PubNub
        const mockChannels: Topic[] = [
          {
            id: 'topic-1',
            name: 'Topic One',
            autoSubscribe: true,
            chain: 'mainnet',
            publisher: 'Publisher One'
          },
          {
            id: 'topic-2',
            name: 'Topic Two',
            autoSubscribe: false,
            chain: 'testnet',
            publisher: 'Publisher Two'
          }
        ];

        // Expected topics after transformation (lastSync is now stored separately)
        const expectedTopics: Topic[] = [
          {
            id: 'topic-1',
            name: 'Topic One',
            autoSubscribe: true,
            isSubscribed: true,
            chain: 'mainnet',
            publisher: 'Publisher One'
          },
          {
            id: 'topic-2',
            name: 'Topic Two',
            autoSubscribe: false,
            isSubscribed: false,
            chain: 'testnet',
            publisher: 'Publisher Two'
          }
        ];

        // Create mock wrapper with marble-testable fetchTopics
        const mockWrapper = {
          fetchTopics: jest.fn(() => cold('--a|', { a: mockChannels }))
        } as unknown as jest.Mocked<PubNubRxWrapper>;

        // Create topicSync$ subject that we control
        const topicSync$ = new Subject<void>();

        // Mock storage that returns empty topics on load
        const mockStorage = {
          getItem: jest.fn(() => of(void 0)),
          setItem: jest.fn(() => of(void 0))
        } as unknown as StorageAdapter;

        // Mock logger
        const mockLogger = {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        } as unknown as NotificationsLogger;

        // Mock storage keys
        const mockStorageKeys = {
          getTopics: jest.fn(() => 'topics-key')
        } as unknown as StorageKeys;

        // Mock config
        const mockConfig: PubNubPollingConfig = {
          authProvider: {} as NotificationsAuthProvider,
          notificationSync$: new Subject(),
          topicSync$,
          storage: mockStorage,
          storageKeys: mockStorageKeys,
          wrapper: mockWrapper,
          logger: mockLogger
        };

        // Create provider (now lazy - doesn't load until topics$ is subscribed)
        const provider = new PubNubPollingProvider(mockConfig);

        // Get the topics$ observable (no parentheses - it's a getter)
        const topics$ = provider.topics$;

        // Library should automatically fetch when storage is empty (initial fetch)
        // No manual trigger needed - the provider detects empty storage and fetches automatically

        // Expect: frame 0 = empty array, frame 2 = topics (after 2 frames for '--a|')
        expectObservable(topics$).toBe('i-a', { i: [], a: expectedTopics });
      });
    });

    it('should initialize lastSync for auto-subscribed topics', () => {
      testScheduler.run(({ cold }) => {
        // Mock channel metadata with auto-subscribe topic
        const mockChannels: Topic[] = [
          {
            id: 'auto-topic',
            name: 'Auto Topic',
            autoSubscribe: true,
            chain: 'mainnet',
            publisher: 'Publisher'
          }
        ];

        // Create mock wrapper
        const mockWrapper = {
          fetchTopics: jest.fn(() => cold('--a|', { a: mockChannels }))
        } as unknown as jest.Mocked<PubNubRxWrapper>;

        // Track storage operations
        const setItemCalls: Array<{ key: string; value: unknown }> = [];
        const mockStorage = {
          getItem: jest.fn(() => of(void 0)),
          setItem: jest.fn((key: string, value: unknown) => {
            setItemCalls.push({ key, value });
            return of(void 0);
          })
        } as unknown as StorageAdapter;

        const mockLogger = {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        } as unknown as NotificationsLogger;

        const mockStorageKeys = {
          getTopics: jest.fn(() => 'notifications:topics'),
          getLastSync: jest.fn((topicId: string) => `notifications:lastSync:${topicId}`)
        } as unknown as StorageKeys;

        const topicSync$ = new Subject<void>();

        const mockConfig: PubNubPollingConfig = {
          authProvider: {} as NotificationsAuthProvider,
          notificationSync$: new Subject(),
          topicSync$,
          storage: mockStorage,
          storageKeys: mockStorageKeys,
          wrapper: mockWrapper,
          logger: mockLogger
        };

        const provider = new PubNubPollingProvider(mockConfig);

        // Subscribe to topics$ to activate
        provider.topics$.subscribe();

        // Trigger topic sync
        cold('----------a', { a: undefined }).subscribe(() => topicSync$.next());

        // Fast-forward to allow async operations
        testScheduler.flush();

        // Verify lastSync was set for the auto-subscribed topic
        const lastSyncCall = setItemCalls.find((call) => call.key === 'notifications:lastSync:auto-topic');

        expect(lastSyncCall).toBeDefined();
        expect(typeof lastSyncCall?.value).toBe('string');
        expect(lastSyncCall?.value).toMatch(/^\d+$/); // Should be a timetoken (numeric string)
      });
    });

    it('should clear lastSync when unsubscribing from a topic', () => {
      testScheduler.run(() => {
        const removeItemMock = jest.fn(() => of(void 0));
        const mockStorage = {
          getItem: jest.fn(() => of(void 0)),
          setItem: jest.fn(() => of(void 0)),
          removeItem: removeItemMock
        } as unknown as StorageAdapter;

        const mockLogger = {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        } as unknown as NotificationsLogger;

        const mockStorageKeys = {
          getTopics: jest.fn(() => 'notifications:topics'),
          getLastSync: jest.fn((topicId: string) => `notifications:lastSync:${topicId}`)
        } as unknown as StorageKeys;

        const mockConfig: PubNubPollingConfig = {
          authProvider: {} as NotificationsAuthProvider,
          notificationSync$: new Subject(),
          topicSync$: new Subject(),
          storage: mockStorage,
          storageKeys: mockStorageKeys,
          wrapper: {} as PubNubRxWrapper,
          logger: mockLogger
        };

        const provider = new PubNubPollingProvider(mockConfig);

        // Add a topic to state (accessing private property for testing)
        // eslint-disable-next-line @typescript-eslint/dot-notation, dot-notation
        provider['topicsState$'].next(
          new Map([
            [
              'test-topic',
              {
                id: 'test-topic',
                name: 'Test Topic',
                autoSubscribe: false,
                isSubscribed: true,
                chain: 'mainnet',
                publisher: 'Publisher'
              }
            ]
          ])
        );

        // Unsubscribe and verify lastSync is cleared
        provider.unsubscribe('test-topic').subscribe();
        testScheduler.flush();

        expect(removeItemMock).toHaveBeenCalledWith('notifications:lastSync:test-topic');
      });
    });
  });

  // eslint-disable-next-line sonarjs/cognitive-complexity
  describe('migrateLegacySubscribedTopics', () => {
    it('should migrate legacy subscribedTopics and set isSubscribed=true for matching topics', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        // Mock cached topics from new storage format (without isSubscribed set)
        const cachedTopics = {
          lastFetch: Date.now(),
          topics: [
            {
              id: 'topic-1',
              name: 'Topic One',
              autoSubscribe: false,
              isSubscribed: false,
              chain: 'mainnet',
              publisher: 'Publisher One'
            },
            {
              id: 'topic-2',
              name: 'Topic Two',
              autoSubscribe: false,
              isSubscribed: false,
              chain: 'testnet',
              publisher: 'Publisher Two'
            },
            {
              id: 'topic-3',
              name: 'Topic Three',
              autoSubscribe: false,
              isSubscribed: false,
              chain: 'mainnet',
              publisher: 'Publisher Three'
            }
          ]
        };

        // Legacy subscribed topics (only topic-1 and topic-3 are subscribed)
        const legacySubscribedTopics = ['topic-1', 'topic-3'];

        // Expected result after migration
        const expectedMigratedTopics = {
          lastFetch: cachedTopics.lastFetch,
          topics: [
            { ...cachedTopics.topics[0], isSubscribed: true }, // Migrated from legacy
            cachedTopics.topics[1], // Not in legacy, stays false
            { ...cachedTopics.topics[2], isSubscribed: true } // Migrated from legacy
          ]
        };

        const {
          storage: mockStorage,
          setItemMock,
          removeItemMock
        } = createMigrationMockStorage(cold, cachedTopics, legacySubscribedTopics);

        const mockLogger = createMockLogger();
        const provider = createProvider(mockStorage, mockLogger);

        // Subscribe to topics$ to trigger migration
        expectObservable(provider.topics$).toBe('a', { a: expectedMigratedTopics.topics });

        testScheduler.flush();

        // Verify migration happened
        expect(setItemMock).toHaveBeenCalledWith('topics-key', expectedMigratedTopics);
        expect(removeItemMock).toHaveBeenCalledWith('legacy-subscribed-key');
        expect(mockLogger.info).toHaveBeenCalledWith('Migrating 2 legacy subscribed topics');
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Successfully migrated legacy subscribedTopics to isSubscribed field'
        );
      });
    });

    it('should ignore legacy topics that do not exist in new storage', () => {
      testScheduler.run(({ cold }) => {
        const cachedTopics = {
          lastFetch: Date.now(),
          topics: [
            {
              id: 'topic-1',
              name: 'Topic One',
              autoSubscribe: false,
              isSubscribed: false,
              chain: 'mainnet',
              publisher: 'Publisher One'
            }
          ]
        };

        // Legacy subscribed topics includes non-existent topics
        const legacySubscribedTopics = ['topic-1', 'non-existent-topic', 'another-missing-topic'];

        // Expected result - only topic-1 is updated, others are ignored
        const expectedMigratedTopics = {
          lastFetch: cachedTopics.lastFetch,
          topics: [{ ...cachedTopics.topics[0], isSubscribed: true }]
        };

        const setItemMock = jest.fn(() => of(void 0));
        const removeItemMock = jest.fn(() => of(void 0));
        const mockStorage = createMigrationMockStorage(
          cold,
          cachedTopics,
          legacySubscribedTopics,
          setItemMock,
          removeItemMock
        ).storage;

        const mockLogger = createMockLogger();
        const provider = createProvider(mockStorage, mockLogger);
        provider.topics$.subscribe();

        testScheduler.flush();

        // Verify migration saved correct data (only existing topic updated)
        expect(setItemMock).toHaveBeenCalledWith('topics-key', expectedMigratedTopics);
        expect(removeItemMock).toHaveBeenCalledWith('legacy-subscribed-key');
      });
    });

    it('should skip migration when no legacy key exists', () => {
      testScheduler.run(({ cold }) => {
        const cachedTopics = {
          lastFetch: Date.now(),
          topics: [
            {
              id: 'topic-1',
              name: 'Topic One',
              autoSubscribe: false,
              isSubscribed: false,
              chain: 'mainnet',
              publisher: 'Publisher One'
            }
          ]
        };

        const setItemMock = jest.fn(() => of(void 0));
        const removeItemMock = jest.fn(() => of(void 0));
        const mockStorage = createMockStorage(
          (key: string) => {
            if (key === 'topics-key') return cold('a|', { a: cachedTopics });
            // Return undefined for legacy key (doesn't exist)
            return cold('a|', { a: void 0 });
          },
          setItemMock,
          removeItemMock
        );

        const mockLogger = createMockLogger();
        const provider = createProvider(mockStorage, mockLogger);
        provider.topics$.subscribe();

        testScheduler.flush();

        // Verify NO migration happened
        expect(mockLogger.info).not.toHaveBeenCalledWith(expect.stringContaining('Migrating'));
        expect(removeItemMock).not.toHaveBeenCalledWith('legacy-subscribed-key');
      });
    });

    it('should handle migration errors gracefully and continue with unmigrated data', () => {
      testScheduler.run(({ cold }) => {
        const cachedTopics = {
          lastFetch: Date.now(),
          topics: [
            {
              id: 'topic-1',
              name: 'Topic One',
              autoSubscribe: false,
              isSubscribed: false,
              chain: 'mainnet',
              publisher: 'Publisher One'
            }
          ]
        };

        // Mock storage that throws error on setItem (migration fails)
        const setItemMock = jest.fn(() => cold('#', {}, new Error('Storage write failed')));
        const mockStorage = createMockStorage((key: string) => {
          if (key === 'topics-key') return cold('a|', { a: cachedTopics });
          if (key === 'legacy-subscribed-key') return cold('a|', { a: ['topic-1'] });
          return cold('a|', { a: void 0 });
        }, setItemMock);

        const mockLogger = createMockLogger();
        const provider = createProvider(mockStorage, mockLogger);
        provider.topics$.subscribe();

        testScheduler.flush();

        // Verify error was logged and migration continued with unmigrated data
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Failed to migrate legacy subscribedTopics, continuing with current data:',
          expect.any(Error)
        );
        // Should still load the unmigrated topics
        expect(mockLogger.info).toHaveBeenCalledWith('Loaded 1 topics from storage');
      });
    });
  });
});
