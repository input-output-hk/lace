import { TestScheduler } from 'rxjs/testing';
import { of, throwError } from 'rxjs';
import { syncTopicNotifications } from '../../src/PubNubProviders/syncTopicNotifications';
import { PubNubRxWrapper } from '../../src/PubNubProviders/PubNubRxWrapper';
import { StorageAdapter, TopicId } from '../../src/types';
import { NetworkError } from '../../src/errors';
import { createMockLogger, createMockStorageKeys, makePubNubResponse } from './testUtils';

const TOPIC_ID = 'topic-1' as TopicId;
const LAST_SYNC = '17064720000000000';
const INCOMING_NEWER = '17064720000010000';
const INCOMING_OLDER = '17064710000000000';

describe('syncTopicNotifications', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('fetches history and returns notifications when incoming > lastSync', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const storage = {
        getItem: jest.fn(() => of(LAST_SYNC)),
        setItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;
      const response = makePubNubResponse(TOPIC_ID, [
        { message: { id: 'n1', title: 'Hello', body: 'World' }, timetoken: '17064720000005000' }
      ]);
      const wrapper = {
        fetchHistory: jest.fn(() => cold('(a|)', { a: response }))
      } as unknown as PubNubRxWrapper;
      const logger = createMockLogger();
      const storageKeys = createMockStorageKeys();

      const result$ = syncTopicNotifications(TOPIC_ID, INCOMING_NEWER, {
        wrapper,
        storage,
        storageKeys,
        logger
      });

      expectObservable(result$).toBe('(a|)', {
        a: [
          expect.objectContaining({
            id: 'n1',
            title: 'Hello',
            body: 'World',
            topicId: TOPIC_ID,
            timestamp: expect.any(String)
          })
        ]
      });
    });
  });

  it('persists incomingTimestamp as new lastSync', () => {
    scheduler.run(({ cold }) => {
      const setItemMock = jest.fn(() => of(void 0));
      const storage = {
        getItem: jest.fn(() => of(LAST_SYNC)),
        setItem: setItemMock
      } as unknown as StorageAdapter;
      const response = makePubNubResponse(TOPIC_ID, [
        { message: { id: 'n1', title: 'T', body: 'B' }, timetoken: '17064720000005000' }
      ]);
      const wrapper = {
        fetchHistory: jest.fn(() => cold('(a|)', { a: response }))
      } as unknown as PubNubRxWrapper;
      const logger = createMockLogger();
      const storageKeys = createMockStorageKeys();

      syncTopicNotifications(TOPIC_ID, INCOMING_NEWER, {
        wrapper,
        storage,
        storageKeys,
        logger
      }).subscribe();

      scheduler.flush();

      expect(setItemMock).toHaveBeenCalledWith(`notifications:lastSync:${TOPIC_ID}`, INCOMING_NEWER);
    });
  });

  it('returns [] when lastSync is missing', () => {
    scheduler.run(({ expectObservable }) => {
      const storage = {
        getItem: jest.fn(() => of(undefined))
      } as unknown as StorageAdapter;
      const wrapper = {
        fetchHistory: jest.fn()
      } as unknown as PubNubRxWrapper;
      const logger = createMockLogger();
      const storageKeys = createMockStorageKeys();

      const result$ = syncTopicNotifications(TOPIC_ID, INCOMING_NEWER, {
        wrapper,
        storage,
        storageKeys,
        logger
      });

      expectObservable(result$).toBe('(a|)', { a: [] });

      scheduler.flush();

      expect(wrapper.fetchHistory).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('missing lastSync'));
    });
  });

  it('returns [] when incoming timestamp <= lastSync', () => {
    scheduler.run(({ expectObservable }) => {
      const storage = {
        getItem: jest.fn(() => of(LAST_SYNC))
      } as unknown as StorageAdapter;
      const wrapper = {
        fetchHistory: jest.fn()
      } as unknown as PubNubRxWrapper;
      const logger = createMockLogger();
      const storageKeys = createMockStorageKeys();

      const result$ = syncTopicNotifications(TOPIC_ID, INCOMING_OLDER, {
        wrapper,
        storage,
        storageKeys,
        logger
      });

      expectObservable(result$).toBe('(a|)', { a: [] });

      scheduler.flush();

      expect(wrapper.fetchHistory).not.toHaveBeenCalled();
    });
  });

  it('returns notifications even if lastSync persist fails', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const storage = {
        getItem: jest.fn(() => of(LAST_SYNC)),
        setItem: jest.fn(() => throwError(() => new Error('storage full')))
      } as unknown as StorageAdapter;
      const response = makePubNubResponse(TOPIC_ID, [
        { message: { id: 'n1', title: 'T', body: 'B' }, timetoken: '17064720000005000' }
      ]);
      const wrapper = {
        fetchHistory: jest.fn(() => cold('(a|)', { a: response }))
      } as unknown as PubNubRxWrapper;
      const logger = createMockLogger();
      const storageKeys = createMockStorageKeys();

      const result$ = syncTopicNotifications(TOPIC_ID, INCOMING_NEWER, {
        wrapper,
        storage,
        storageKeys,
        logger
      });

      expectObservable(result$).toBe('(a|)', {
        a: [expect.objectContaining({ id: 'n1', topicId: TOPIC_ID })]
      });

      scheduler.flush();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to persist lastSync'),
        expect.any(Error)
      );
    });
  });

  it('returns [] when storage read fails', () => {
    scheduler.run(({ expectObservable }) => {
      const storage = {
        getItem: jest.fn(() => throwError(() => new Error('read error')))
      } as unknown as StorageAdapter;
      const wrapper = {
        fetchHistory: jest.fn()
      } as unknown as PubNubRxWrapper;
      const logger = createMockLogger();
      const storageKeys = createMockStorageKeys();

      const result$ = syncTopicNotifications(TOPIC_ID, INCOMING_NEWER, {
        wrapper,
        storage,
        storageKeys,
        logger
      });

      expectObservable(result$).toBe('(a|)', { a: [] });

      scheduler.flush();

      expect(wrapper.fetchHistory).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read lastSync'),
        expect.any(Error)
      );
    });
  });

  it('propagates fetchHistory errors to caller', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const storage = {
        getItem: jest.fn(() => of(LAST_SYNC))
      } as unknown as StorageAdapter;
      // eslint-disable-next-line no-magic-numbers
      const networkError = new NetworkError(500, 'Server Error');
      const wrapper = {
        fetchHistory: jest.fn(() => cold('#', undefined, networkError))
      } as unknown as PubNubRxWrapper;
      const logger = createMockLogger();
      const storageKeys = createMockStorageKeys();

      const result$ = syncTopicNotifications(TOPIC_ID, INCOMING_NEWER, {
        wrapper,
        storage,
        storageKeys,
        logger
      });

      expectObservable(result$).toBe('#', undefined, networkError);
    });
  });

  it('returns [] when channel has no messages', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const storage = {
        getItem: jest.fn(() => of(LAST_SYNC)),
        setItem: jest.fn(() => of(void 0))
      } as unknown as StorageAdapter;
      const response = { channels: {} };
      const wrapper = {
        fetchHistory: jest.fn(() => cold('(a|)', { a: response }))
      } as unknown as PubNubRxWrapper;
      const logger = createMockLogger();
      const storageKeys = createMockStorageKeys();

      const result$ = syncTopicNotifications(TOPIC_ID, INCOMING_NEWER, {
        wrapper,
        storage,
        storageKeys,
        logger
      });

      expectObservable(result$).toBe('(a|)', { a: [] });
    });
  });
});
