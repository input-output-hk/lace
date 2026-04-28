import { TestScheduler } from 'rxjs/testing';
import { of, BehaviorSubject, throwError } from 'rxjs';
import { createNotifications$ } from '../../src/PubNubProviders/createNotifications';
import { NotificationsAuthProvider } from '../../src/provider.interface';
import { PubNubRxWrapper } from '../../src/PubNubProviders/PubNubRxWrapper';
import { StorageAdapter, Notification, AuthToken } from '../../src/types';
import { AuthError, NetworkError } from '../../src/errors';
import { makeStoredTopic, createMockLogger, createMockStorageKeys } from './testUtils';

const MOCK_TOKEN: AuthToken = { token: 'token-1', expiresAt: 9_999_999_999, refreshMargin: 60 };

const createMockAuthProvider = () =>
  ({
    getToken: jest.fn(() => of(MOCK_TOKEN)),
    clearToken: jest.fn(() => of(void 0))
  } as unknown as NotificationsAuthProvider);

const TIMESTAMP = '17064720000010000';
const LAST_SYNC = '17064720000000000';

describe('createNotifications$', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('emits notifications for subscribed topics on sync signal', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const topics = [makeStoredTopic('a', { isSubscribed: true })];
      const topics$ = new BehaviorSubject(topics);
      const response = { channels: { a: [{ message: { id: 'n1', title: 'Title n1', body: 'Body n1' }, timetoken: '17064720000005000' }] } };
      const storage = {
        getItem: jest.fn(() => of(LAST_SYNC)),
        setItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;
      const fetchHistoryMock = jest.fn(() => cold('(a|)', { a: response }));
      const wrapper = {
        setToken: jest.fn(),
        fetchHistory: fetchHistoryMock
      } as unknown as PubNubRxWrapper;
      const notificationSync$ = cold<string>('--a', { a: TIMESTAMP });

      const result$ = createNotifications$({
        notificationSync$,
        topics$,
        authProvider: createMockAuthProvider(),
        wrapper,
        storage,
        storageKeys: createMockStorageKeys(),
        logger: createMockLogger()
      });

      expectObservable(result$).toBe('--a', {
        a: expect.objectContaining({ id: 'n1', topicId: 'a' })
      });
    });
  });

  it('only syncs subscribed topics', () => {
    scheduler.run(({ cold }) => {
      const topics = [
        makeStoredTopic('a', { isSubscribed: true }),
        makeStoredTopic('b', { isSubscribed: false })
      ];
      const topics$ = new BehaviorSubject(topics);
      const response = { channels: { a: [{ message: { id: 'n1', title: 'T', body: 'B' }, timetoken: '17064720000005000' }] } };
      const storage = {
        getItem: jest.fn(() => of(LAST_SYNC)),
        setItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;
      const fetchHistoryMock = jest.fn(() => cold('(a|)', { a: response }));
      const wrapper = {
        setToken: jest.fn(),
        fetchHistory: fetchHistoryMock
      } as unknown as PubNubRxWrapper;
      const notificationSync$ = cold<string>('-a', { a: TIMESTAMP });

      const result$ = createNotifications$({
        notificationSync$,
        topics$,
        authProvider: createMockAuthProvider(),
        wrapper,
        storage,
        storageKeys: createMockStorageKeys(),
        logger: createMockLogger()
      });

      result$.subscribe();
      scheduler.flush();

      // fetchHistory should only be called for topic 'a', not 'b'
      expect(fetchHistoryMock).toHaveBeenCalledTimes(1);
      expect(fetchHistoryMock).toHaveBeenCalledWith(['a'], LAST_SYNC);
    });
  });

  it('emits nothing when no topics are subscribed', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const topics = [makeStoredTopic('a', { isSubscribed: false })];
      const topics$ = new BehaviorSubject(topics);
      const fetchHistoryMock = jest.fn();
      const wrapper = {
        setToken: jest.fn(),
        fetchHistory: fetchHistoryMock
      } as unknown as PubNubRxWrapper;
      const notificationSync$ = cold<string>('-a|', { a: TIMESTAMP });

      const result$ = createNotifications$({
        notificationSync$,
        topics$,
        authProvider: createMockAuthProvider(),
        wrapper,
        storage: {} as unknown as StorageAdapter,
        storageKeys: createMockStorageKeys(),
        logger: createMockLogger()
      });

      expectObservable(result$).toBe('--|');

      scheduler.flush();

      expect(fetchHistoryMock).not.toHaveBeenCalled();
    });
  });

  it('flattens Notification[] to individual emissions', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const topics = [makeStoredTopic('a', { isSubscribed: true })];
      const topics$ = new BehaviorSubject(topics);
      const response = {
        channels: {
          a: [
            { message: { id: 'n1', title: 'T1', body: 'B1' }, timetoken: '17064720000005000' },
            { message: { id: 'n2', title: 'T2', body: 'B2' }, timetoken: '17064720000006000' }
          ]
        }
      };
      const storage = {
        getItem: jest.fn(() => of(LAST_SYNC)),
        setItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;
      const wrapper = {
        setToken: jest.fn(),
        fetchHistory: jest.fn(() => cold('(a|)', { a: response }))
      } as unknown as PubNubRxWrapper;
      const notificationSync$ = cold<string>('-a', { a: TIMESTAMP });

      const result$ = createNotifications$({
        notificationSync$,
        topics$,
        authProvider: createMockAuthProvider(),
        wrapper,
        storage,
        storageKeys: createMockStorageKeys(),
        logger: createMockLogger()
      });

      expectObservable(result$).toBe('-(ab)', {
        a: expect.objectContaining({ id: 'n1' }),
        b: expect.objectContaining({ id: 'n2' })
      });
    });
  });

  it('catches non-auth errors per topic and continues others', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const topics = [
        makeStoredTopic('a', { isSubscribed: true }),
        makeStoredTopic('b', { isSubscribed: true })
      ];
      const topics$ = new BehaviorSubject(topics);
      const responseB = {
        channels: { b: [{ message: { id: 'n1', title: 'T', body: 'B' }, timetoken: '17064720000005000' }] }
      };
      // eslint-disable-next-line no-magic-numbers
      const networkError = new NetworkError(500, 'Server Error');
      const storageKeys = createMockStorageKeys();
      const storage = {
        getItem: jest.fn((key: string) => {
          if (key === 'notifications:lastSync:a') return of(LAST_SYNC);
          if (key === 'notifications:lastSync:b') return of(LAST_SYNC);
          return of(undefined);
        }),
        setItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;
      const wrapper = {
        setToken: jest.fn(),
        fetchHistory: jest.fn((channels: string[]) => {
          if (channels[0] === 'a') return cold('#', undefined, networkError);
          return cold('(a|)', { a: responseB });
        })
      } as unknown as PubNubRxWrapper;
      const notificationSync$ = cold<string>('-a', { a: TIMESTAMP });
      const logger = createMockLogger();

      const result$ = createNotifications$({
        notificationSync$,
        topics$,
        authProvider: createMockAuthProvider(),
        wrapper,
        storage,
        storageKeys,
        logger
      });

      expectObservable(result$).toBe('-a', {
        a: expect.objectContaining({ id: 'n1', topicId: 'b' })
      });

      scheduler.flush();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to sync topic a'), networkError);
    });
  });

  it('propagates auth errors for withAuthRetry to handle', () => {
    scheduler.run(({ cold }) => {
      const topics = [makeStoredTopic('a', { isSubscribed: true })];
      const topics$ = new BehaviorSubject(topics);
      // eslint-disable-next-line no-magic-numbers
      const authError = new AuthError(403, 'Forbidden');
      const storage = {
        getItem: jest.fn(() => of(LAST_SYNC)),
        setItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;
      // First call: auth error. Second call (after token refresh): success
      let callCount = 0;
      const response = { channels: { a: [{ message: { id: 'n1', title: 'T', body: 'B' }, timetoken: '17064720000005000' }] } };
      const wrapper = {
        setToken: jest.fn(),
        fetchHistory: jest.fn(() => {
          callCount++;
          if (callCount === 1) return throwError(() => authError);
          return cold('(a|)', { a: response });
        })
      } as unknown as PubNubRxWrapper;
      const notificationSync$ = cold<string>('-a', { a: TIMESTAMP });
      const authProvider = {
        getToken: jest.fn(() => of(MOCK_TOKEN)),
        clearToken: jest.fn(() => of(void 0))
      } as unknown as NotificationsAuthProvider;

      const result$ = createNotifications$({
        notificationSync$,
        topics$,
        authProvider,
        wrapper,
        storage,
        storageKeys: createMockStorageKeys(),
        logger: createMockLogger()
      });

      const values: Notification[] = [];
      result$.subscribe((v) => values.push(v));
      scheduler.flush();

      // withAuthRetry should have retried after auth error
      expect(authProvider.clearToken).toHaveBeenCalled();
      expect(authProvider.getToken).toHaveBeenCalledWith(true);
      // eslint-disable-next-line no-magic-numbers
      expect(wrapper.fetchHistory).toHaveBeenCalledTimes(2);
      expect(values).toHaveLength(1);
      expect(values[0]).toEqual(expect.objectContaining({ id: 'n1' }));
    });
  });

  it('sets auth token on wrapper before fetching', () => {
    scheduler.run(({ cold }) => {
      const topics = [makeStoredTopic('a', { isSubscribed: true })];
      const topics$ = new BehaviorSubject(topics);
      const response = { channels: { a: [{ message: { id: 'n1', title: 'T', body: 'B' }, timetoken: '17064720000005000' }] } };
      const storage = {
        getItem: jest.fn(() => of(LAST_SYNC)),
        setItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;
      const wrapper = {
        setToken: jest.fn(),
        fetchHistory: jest.fn(() => cold('(a|)', { a: response }))
      } as unknown as PubNubRxWrapper;
      const notificationSync$ = cold<string>('-a', { a: TIMESTAMP });

      const result$ = createNotifications$({
        notificationSync$,
        topics$,
        authProvider: createMockAuthProvider(),
        wrapper,
        storage,
        storageKeys: createMockStorageKeys(),
        logger: createMockLogger()
      });

      result$.subscribe();
      scheduler.flush();

      expect(wrapper.setToken).toHaveBeenCalledWith('token-1');
    });
  });
});
