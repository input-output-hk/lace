/* eslint-disable no-magic-numbers */
import { TestScheduler } from 'rxjs/testing';
import { of, Subject } from 'rxjs';
import { PubNubPollingProvider } from '../../src/PubNubProviders/PubNubPollingProvider';
import { PubNubPollingConfig } from '../../src/PubNubProviders/types';
import { PubNubRxWrapper } from '../../src/PubNubProviders/PubNubRxWrapper';
import { StorageAdapter, StoredTopic, CachedTopics, AuthToken } from '../../src/types';
import { NotificationsAuthProvider } from '../../src/provider.interface';
import { makeStoredTopic, createMockLogger, createMockStorageKeys } from './testUtils';

const MOCK_TOKEN: AuthToken = { token: 'token-1', expiresAt: 9_999_999_999, refreshMargin: 60 };

describe('PubNubPollingProvider', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  describe('topics$ wiring', () => {
    it('loads topics from storage via createTopics$', () => {
      scheduler.run(({ expectObservable }) => {
        const stored: StoredTopic[] = [makeStoredTopic('a', { isSubscribed: true })];
        const cached: CachedTopics = { lastFetch: 0, topics: stored };
        const storage = {
          getItem: jest.fn((key: string) => {
            if (key === 'notifications:topics') return of(cached);
            if (key === 'notifications:subscribedTopics') return of(void 0);
            return of(void 0);
          }),
          setItem: jest.fn(() => of(void 0))
        } as unknown as StorageAdapter;

        const config: PubNubPollingConfig = {
          authProvider: {} as NotificationsAuthProvider,
          notificationSync$: new Subject(),
          topicSync$: new Subject(),
          storage,
          storageKeys: createMockStorageKeys(),
          wrapper: { fetchTopics: jest.fn() } as unknown as PubNubRxWrapper,
          logger: createMockLogger()
        };

        const provider = new PubNubPollingProvider(config);

        expectObservable(provider.topics$).toBe('a', { a: stored });
      });
    });
  });

  describe('notifications$ wiring', () => {
    it('emits notifications via createNotifications$', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const stored: StoredTopic[] = [makeStoredTopic('a', { isSubscribed: true })];
        const cached: CachedTopics = { lastFetch: 0, topics: stored };
        const LAST_SYNC = '17064720000000000';
        const TIMESTAMP = '17064720000010000';

        const response = {
          channels: { a: [{ message: { id: 'n1', title: 'T', body: 'B' }, timetoken: '17064720000005000' }] }
        };

        const storage = {
          getItem: jest.fn((key: string) => {
            if (key === 'notifications:topics') return of(cached);
            if (key === 'notifications:subscribedTopics') return of(void 0);
            if (key === 'notifications:lastSync:a') return of(LAST_SYNC);
            return of(void 0);
          }),
          setItem: jest.fn(() => of(void 0))
        } as unknown as StorageAdapter;

        const wrapper = {
          fetchTopics: jest.fn(),
          setToken: jest.fn(),
          fetchHistory: jest.fn(() => cold('(a|)', { a: response }))
        } as unknown as PubNubRxWrapper;

        const authProvider = {
          getToken: jest.fn(() => of(MOCK_TOKEN)),
          clearToken: jest.fn(() => of(void 0))
        } as unknown as NotificationsAuthProvider;

        const notificationSync$ = cold<string>('--a', { a: TIMESTAMP });

        const config: PubNubPollingConfig = {
          authProvider,
          notificationSync$,
          topicSync$: new Subject(),
          storage,
          storageKeys: createMockStorageKeys(),
          wrapper,
          logger: createMockLogger()
        };

        const provider = new PubNubPollingProvider(config);

        expectObservable(provider.notifications$).toBe('--a', {
          a: expect.objectContaining({ id: 'n1', topicId: 'a' })
        });
      });
    });
  });

  describe('subscribe', () => {
    it('pushes subscribe command and sets lastSync', (done) => {
      const stored: StoredTopic[] = [makeStoredTopic('a')];
      const cached: CachedTopics = { lastFetch: 0, topics: stored };
      const setItemMock = jest.fn(() => of(void 0));

      const storage = {
        getItem: jest.fn((key: string) => {
          if (key === 'notifications:topics') return of(cached);
          if (key === 'notifications:subscribedTopics') return of(void 0);
          return of(void 0);
        }),
        setItem: setItemMock
      } as unknown as StorageAdapter;

      const config: PubNubPollingConfig = {
        authProvider: {} as NotificationsAuthProvider,
        notificationSync$: new Subject(),
        topicSync$: new Subject(),
        storage,
        storageKeys: createMockStorageKeys(),
        wrapper: { fetchTopics: jest.fn() } as unknown as PubNubRxWrapper,
        logger: createMockLogger()
      };

      const provider = new PubNubPollingProvider(config);

      provider.subscribe('a').subscribe({
        complete: () => {
          // Should have set lastSync for the topic
          expect(setItemMock).toHaveBeenCalledWith('notifications:lastSync:a', expect.stringMatching(/^\d+$/));
          done();
        },
        error: done
      });
    });

    it('warns and returns void for unknown topic', (done) => {
      const stored: StoredTopic[] = [makeStoredTopic('a')];
      const cached: CachedTopics = { lastFetch: 0, topics: stored };
      const logger = createMockLogger();

      const storage = {
        getItem: jest.fn((key: string) => {
          if (key === 'notifications:topics') return of(cached);
          if (key === 'notifications:subscribedTopics') return of(void 0);
          return of(void 0);
        }),
        setItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;

      const config: PubNubPollingConfig = {
        authProvider: {} as NotificationsAuthProvider,
        notificationSync$: new Subject(),
        topicSync$: new Subject(),
        storage,
        storageKeys: createMockStorageKeys(),
        wrapper: { fetchTopics: jest.fn() } as unknown as PubNubRxWrapper,
        logger
      };

      const provider = new PubNubPollingProvider(config);

      provider.subscribe('unknown-topic').subscribe({
        complete: () => {
          expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('unknown topic'));
          expect(storage.setItem).not.toHaveBeenCalledWith('notifications:lastSync:unknown-topic', expect.anything());
          done();
        },
        error: done
      });
    });

    it('updates topic state to subscribed after command', (done) => {
      const stored: StoredTopic[] = [makeStoredTopic('a', { isSubscribed: false })];
      const cached: CachedTopics = { lastFetch: 0, topics: stored };

      const storage = {
        getItem: jest.fn((key: string) => {
          if (key === 'notifications:topics') return of(cached);
          if (key === 'notifications:subscribedTopics') return of(void 0);
          return of(void 0);
        }),
        setItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;

      const config: PubNubPollingConfig = {
        authProvider: {} as NotificationsAuthProvider,
        notificationSync$: new Subject(),
        topicSync$: new Subject(),
        storage,
        storageKeys: createMockStorageKeys(),
        wrapper: { fetchTopics: jest.fn() } as unknown as PubNubRxWrapper,
        logger: createMockLogger()
      };

      const provider = new PubNubPollingProvider(config);

      const emissions: StoredTopic[][] = [];
      provider.topics$.subscribe((t) => emissions.push(t));

      // Wait for initial load, then subscribe
      setTimeout(() => {
        provider.subscribe('a').subscribe({
          complete: () => {
            // Should have two emissions: initial (unsubscribed) + after command (subscribed)
            expect(emissions.length).toBeGreaterThanOrEqual(2);
            const last = emissions[emissions.length - 1];
            expect(last.find((t) => t.id === 'a')?.isSubscribed).toBe(true);
            done();
          },
          error: done
        });
      }, 0);
    });
  });

  describe('unsubscribe', () => {
    it('pushes unsubscribe command and removes lastSync', (done) => {
      const stored: StoredTopic[] = [makeStoredTopic('a', { isSubscribed: true })];
      const cached: CachedTopics = { lastFetch: 0, topics: stored };
      const removeItemMock = jest.fn(() => of(void 0));

      const storage = {
        getItem: jest.fn((key: string) => {
          if (key === 'notifications:topics') return of(cached);
          if (key === 'notifications:subscribedTopics') return of(void 0);
          return of(void 0);
        }),
        setItem: jest.fn(() => of(void 0)),
        removeItem: removeItemMock
      } as unknown as StorageAdapter;

      const config: PubNubPollingConfig = {
        authProvider: {} as NotificationsAuthProvider,
        notificationSync$: new Subject(),
        topicSync$: new Subject(),
        storage,
        storageKeys: createMockStorageKeys(),
        wrapper: { fetchTopics: jest.fn() } as unknown as PubNubRxWrapper,
        logger: createMockLogger()
      };

      const provider = new PubNubPollingProvider(config);

      provider.unsubscribe('a').subscribe({
        complete: () => {
          expect(removeItemMock).toHaveBeenCalledWith('notifications:lastSync:a');
          done();
        },
        error: done
      });
    });

    it('warns and returns void for unknown topic', (done) => {
      const stored: StoredTopic[] = [makeStoredTopic('a')];
      const cached: CachedTopics = { lastFetch: 0, topics: stored };
      const logger = createMockLogger();

      const storage = {
        getItem: jest.fn((key: string) => {
          if (key === 'notifications:topics') return of(cached);
          if (key === 'notifications:subscribedTopics') return of(void 0);
          return of(void 0);
        }),
        setItem: jest.fn(() => of(void 0)),
        removeItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;

      const config: PubNubPollingConfig = {
        authProvider: {} as NotificationsAuthProvider,
        notificationSync$: new Subject(),
        topicSync$: new Subject(),
        storage,
        storageKeys: createMockStorageKeys(),
        wrapper: { fetchTopics: jest.fn() } as unknown as PubNubRxWrapper,
        logger
      };

      const provider = new PubNubPollingProvider(config);

      provider.unsubscribe('unknown-topic').subscribe({
        complete: () => {
          expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('unknown topic'));
          done();
        },
        error: done
      });
    });
  });

  describe('close', () => {
    it('stops wrapper and completes commands$', () => {
      const stopMock = jest.fn();
      const storage = {
        getItem: jest.fn(() => of(void 0)),
        setItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;

      const config: PubNubPollingConfig = {
        authProvider: {} as NotificationsAuthProvider,
        notificationSync$: new Subject(),
        topicSync$: new Subject(),
        storage,
        storageKeys: createMockStorageKeys(),
        wrapper: { fetchTopics: jest.fn(), stop: stopMock } as unknown as PubNubRxWrapper,
        logger: createMockLogger()
      };

      const provider = new PubNubPollingProvider(config);
      provider.close();

      expect(stopMock).toHaveBeenCalled();
    });
  });
});
