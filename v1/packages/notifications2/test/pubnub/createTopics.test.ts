import { TestScheduler } from 'rxjs/testing';
import { of, throwError, NEVER } from 'rxjs';
import { createTopics$ } from '../../src/PubNubProviders/createTopics';
import { PubNubRxWrapper } from '../../src/PubNubProviders/PubNubRxWrapper';
import { StorageAdapter, StoredTopic, Topic, CachedTopics } from '../../src/types';
import { makeStoredTopic, makeTopic, createMockLogger, createMockStorageKeys } from './testUtils';

// eslint-disable-next-line no-magic-numbers
const FIXED_NOW = () => 1000;

describe('createTopics$', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('loads topics from storage and emits them', () => {
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
      const wrapper = { fetchTopics: jest.fn() } as unknown as PubNubRxWrapper;

      const { topics$ } = createTopics$({
        topicSync$: NEVER,
        storage,
        storageKeys: createMockStorageKeys(),
        wrapper,
        logger: createMockLogger(),
        now: FIXED_NOW
      });

      expectObservable(topics$).toBe('a', { a: stored });
      expect(wrapper.fetchTopics).not.toHaveBeenCalled();
    });
  });

  it('triggers initial fetch when storage is empty', () => {
    scheduler.run(({ expectObservable }) => {
      const fetched: Topic[] = [makeTopic('a', { autoSubscribe: true })];
      const storage = {
        getItem: jest.fn((key: string) => {
          if (key === 'notifications:topics') return of(void 0);
          return of(void 0);
        }),
        setItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;
      const wrapper = {
        fetchTopics: jest.fn(() => of(fetched))
      } as unknown as PubNubRxWrapper;

      const { topics$ } = createTopics$({
        topicSync$: NEVER,
        storage,
        storageKeys: createMockStorageKeys(),
        wrapper,
        logger: createMockLogger(),
        now: FIXED_NOW
      });

      // loaded emits [] (empty storage), then fetch triggers synchronously → two emissions at frame 0
      expectObservable(topics$).toBe('(ab)', {
        a: [],
        b: [makeStoredTopic('a', { isSubscribed: true, autoSubscribe: true })]
      });

      scheduler.flush();

      expect(wrapper.fetchTopics).toHaveBeenCalledTimes(1);
      expect(storage.setItem).toHaveBeenCalledWith(
        'notifications:topics',
        expect.objectContaining({ lastFetch: 1000 })
      );
    });
  });

  it('does not trigger initial fetch when storage has topics', () => {
    scheduler.run(({ expectObservable }) => {
      const stored: StoredTopic[] = [makeStoredTopic('a')];
      const cached: CachedTopics = { lastFetch: 0, topics: stored };
      const storage = {
        getItem: jest.fn((key: string) => {
          if (key === 'notifications:topics') return of(cached);
          if (key === 'notifications:subscribedTopics') return of(void 0);
          return of(void 0);
        }),
        setItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;
      const wrapper = {
        fetchTopics: jest.fn()
      } as unknown as PubNubRxWrapper;

      const { topics$ } = createTopics$({
        topicSync$: NEVER,
        storage,
        storageKeys: createMockStorageKeys(),
        wrapper,
        logger: createMockLogger(),
        now: FIXED_NOW
      });

      expectObservable(topics$).toBe('a', { a: stored });

      scheduler.flush();

      expect(wrapper.fetchTopics).not.toHaveBeenCalled();
    });
  });

  it('fetches topics on topicSync$ events', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const stored: StoredTopic[] = [makeStoredTopic('a')];
      const cached: CachedTopics = { lastFetch: 0, topics: stored };
      const fetched: Topic[] = [makeTopic('a'), makeTopic('b', { autoSubscribe: true })];
      const storage = {
        getItem: jest.fn((key: string) => {
          if (key === 'notifications:topics') return of(cached);
          if (key === 'notifications:subscribedTopics') return of(void 0);
          return of(void 0);
        }),
        setItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;
      const wrapper = {
        fetchTopics: jest.fn(() => of(fetched))
      } as unknown as PubNubRxWrapper;
      const topicSync$ = cold<void>('--a', { a: void 0 });

      const { topics$ } = createTopics$({
        topicSync$,
        storage,
        storageKeys: createMockStorageKeys(),
        wrapper,
        logger: createMockLogger(),
        now: FIXED_NOW
      });

      expectObservable(topics$).toBe('a-b', {
        a: stored,
        b: [
          makeStoredTopic('a', { isSubscribed: false }),
          makeStoredTopic('b', { isSubscribed: true, autoSubscribe: true })
        ]
      });
    });
  });

  it('initializes lastSync for auto-subscribed topics after fetch', () => {
    scheduler.run(() => {
      const fetched: Topic[] = [makeTopic('a', { autoSubscribe: true }), makeTopic('b', { autoSubscribe: false })];
      const setItemMock = jest.fn(() => of(void 0));
      const storageKeys = createMockStorageKeys();
      const storage = {
        getItem: jest.fn((key: string) => {
          if (key === 'notifications:topics') return of(void 0);
          return of(void 0);
        }),
        setItem: setItemMock
      } as unknown as StorageAdapter;
      const wrapper = {
        fetchTopics: jest.fn(() => of(fetched))
      } as unknown as PubNubRxWrapper;

      const { topics$ } = createTopics$({
        topicSync$: NEVER,
        storage,
        storageKeys,
        wrapper,
        logger: createMockLogger(),
        now: FIXED_NOW
      });

      topics$.subscribe();
      scheduler.flush();

      // Should initialize lastSync only for auto-subscribed topic 'a'
      expect(setItemMock).toHaveBeenCalledWith('notifications:lastSync:a', '10000000');
    });
  });

  it('skips lastSync initialization when topic already has one', () => {
    scheduler.run(() => {
      const fetched: Topic[] = [makeTopic('a', { autoSubscribe: true })];
      const setItemMock = jest.fn(() => of(void 0));
      const storageKeys = createMockStorageKeys();
      const storage = {
        getItem: jest.fn((key: string) => {
          if (key === 'notifications:topics') return of(void 0);
          if (key === 'notifications:lastSync:a') return of('existing-timetoken');
          return of(void 0);
        }),
        setItem: setItemMock
      } as unknown as StorageAdapter;
      const wrapper = {
        fetchTopics: jest.fn(() => of(fetched))
      } as unknown as PubNubRxWrapper;

      const { topics$ } = createTopics$({
        topicSync$: NEVER,
        storage,
        storageKeys,
        wrapper,
        logger: createMockLogger(),
        now: FIXED_NOW
      });

      topics$.subscribe();
      scheduler.flush();

      // Should NOT write lastSync for topic 'a' since it already has one
      expect(setItemMock).not.toHaveBeenCalledWith('notifications:lastSync:a', expect.anything());
    });
  });

  it('handles storage load failure gracefully', () => {
    scheduler.run(({ expectObservable }) => {
      const storage = {
        getItem: jest.fn(() => throwError(() => new Error('storage broken'))),
        setItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;
      const wrapper = {
        fetchTopics: jest.fn(() => of([]))
      } as unknown as PubNubRxWrapper;
      const logger = createMockLogger();

      const { topics$ } = createTopics$({
        topicSync$: NEVER,
        storage,
        storageKeys: createMockStorageKeys(),
        wrapper,
        logger,
        now: FIXED_NOW
      });

      // Should emit empty topics (from fallback loaded command), then fetch triggers
      expectObservable(topics$).toBe('a', { a: [] });

      scheduler.flush();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to load'), expect.any(Error));
    });
  });

  it('handles fetch failure gracefully', () => {
    scheduler.run(({ expectObservable }) => {
      const storage = {
        getItem: jest.fn((key: string) => {
          if (key === 'notifications:topics') return of(void 0);
          return of(void 0);
        }),
        setItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;
      const wrapper = {
        fetchTopics: jest.fn(() => throwError(() => new Error('network down')))
      } as unknown as PubNubRxWrapper;
      const logger = createMockLogger();

      const { topics$ } = createTopics$({
        topicSync$: NEVER,
        storage,
        storageKeys: createMockStorageKeys(),
        wrapper,
        logger,
        now: FIXED_NOW
      });

      // Should emit empty topics from loaded, fetch fails but error is caught
      expectObservable(topics$).toBe('a', { a: [] });

      scheduler.flush();

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch topics'), expect.any(Error));
    });
  });

  it('processes subscribe command via commands$', () => {
    scheduler.run(() => {
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
      const wrapper = { fetchTopics: jest.fn() } as unknown as PubNubRxWrapper;

      const { topics$, commands$ } = createTopics$({
        topicSync$: NEVER,
        storage,
        storageKeys: createMockStorageKeys(),
        wrapper,
        logger: createMockLogger(),
        now: FIXED_NOW
      });

      // Subscribe to topics$ first, then push a command
      const values: StoredTopic[][] = [];
      topics$.subscribe((v) => values.push(v));
      scheduler.flush();

      commands$.next({ type: 'subscribe', topicId: 'a' });
      scheduler.flush();

      // eslint-disable-next-line no-magic-numbers
      expect(values).toHaveLength(2);
      expect(values[0]).toEqual([makeStoredTopic('a', { isSubscribed: false })]);
      expect(values[1]).toEqual([makeStoredTopic('a', { isSubscribed: true })]);
    });
  });

  it('migrates legacy subscribedTopics on load', () => {
    scheduler.run(({ expectObservable }) => {
      const stored: StoredTopic[] = [
        makeStoredTopic('a', { isSubscribed: false }),
        makeStoredTopic('b', { isSubscribed: false })
      ];
      const cached: CachedTopics = { lastFetch: 0, topics: stored };
      const setItemMock = jest.fn(() => of(void 0));
      const removeItemMock = jest.fn(() => of(void 0));
      const storage = {
        getItem: jest.fn((key: string) => {
          if (key === 'notifications:topics') return of(cached);
          if (key === 'notifications:subscribedTopics') return of(['a']);
          return of(void 0);
        }),
        setItem: setItemMock,
        removeItem: removeItemMock
      } as unknown as StorageAdapter;
      const wrapper = { fetchTopics: jest.fn() } as unknown as PubNubRxWrapper;
      const logger = createMockLogger();

      const { topics$ } = createTopics$({
        topicSync$: NEVER,
        storage,
        storageKeys: createMockStorageKeys(),
        wrapper,
        logger,
        now: FIXED_NOW
      });

      expectObservable(topics$).toBe('a', {
        a: [makeStoredTopic('a', { isSubscribed: true }), makeStoredTopic('b', { isSubscribed: false })]
      });

      scheduler.flush();

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Migrating 1 legacy'));
      expect(removeItemMock).toHaveBeenCalledWith('notifications:subscribedTopics');
    });
  });
});
