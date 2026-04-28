import { TestScheduler } from 'rxjs/testing';
import { persistTopics } from '../../src/PubNubProviders/persistTopics';
import { StorageAdapter } from '../../src/types';
import { of, throwError } from 'rxjs';
import { makeStoredTopic, createMockLogger, createMockStorageKeys } from './testUtils';

describe('persistTopics', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('passes through topics after storage write completes', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const topics = [makeStoredTopic('a')];
      const setItemMock = jest.fn(() => of(void 0));
      const storage = { setItem: setItemMock } as unknown as StorageAdapter;
      const storageKeys = createMockStorageKeys();
      const logger = createMockLogger();

      const source$ = cold('a', { a: topics });
      const result$ = source$.pipe(persistTopics(storage, storageKeys, logger));

      expectObservable(result$).toBe('a', { a: topics });
    });
  });

  it('calls storage.setItem with CachedTopics format', () => {
    scheduler.run(({ cold }) => {
      const topics = [makeStoredTopic('a')];
      const setItemMock = jest.fn(() => of(void 0));
      const storage = { setItem: setItemMock } as unknown as StorageAdapter;
      const storageKeys = createMockStorageKeys();
      const logger = createMockLogger();
      // eslint-disable-next-line no-magic-numbers, unicorn/consistent-function-scoping
      const fixedNow = () => 1000;

      const source$ = cold('(a|)', { a: topics });
      source$.pipe(persistTopics(storage, storageKeys, logger, fixedNow)).subscribe();

      scheduler.flush();

      expect(setItemMock).toHaveBeenCalledWith('notifications:topics', {
        lastFetch: 1000,
        topics
      });
    });
  });

  it('passes through topics even when storage write fails', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const topics = [makeStoredTopic('a')];
      const storage = {
        setItem: jest.fn(() => throwError(() => new Error('Storage full')))
      } as unknown as StorageAdapter;
      const storageKeys = createMockStorageKeys();
      const logger = createMockLogger();

      const source$ = cold('a', { a: topics });
      const result$ = source$.pipe(persistTopics(storage, storageKeys, logger));

      expectObservable(result$).toBe('a', { a: topics });

      scheduler.flush();

      expect(logger.warn).toHaveBeenCalledWith('Failed to persist topics:', expect.any(Error));
    });
  });

  it('persists each emission in order', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const topicsA = [makeStoredTopic('a')];
      const topicsB = [makeStoredTopic('a'), makeStoredTopic('b')];
      const setItemMock = jest.fn(() => of(void 0));
      const storage = { setItem: setItemMock } as unknown as StorageAdapter;
      const storageKeys = createMockStorageKeys();
      const logger = createMockLogger();

      const source$ = cold('a-b', { a: topicsA, b: topicsB });
      const result$ = source$.pipe(persistTopics(storage, storageKeys, logger));

      expectObservable(result$).toBe('a-b', { a: topicsA, b: topicsB });

      scheduler.flush();

      // eslint-disable-next-line no-magic-numbers
      expect(setItemMock).toHaveBeenCalledTimes(2);
    });
  });

  it('continues persisting after a storage failure', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const topicsA = [makeStoredTopic('a')];
      const topicsB = [makeStoredTopic('b')];
      let callCount = 0;
      const storage = {
        setItem: jest.fn(() => {
          callCount++;
          if (callCount === 1) return throwError(() => new Error('Storage full'));
          return of(void 0);
        })
      } as unknown as StorageAdapter;
      const storageKeys = createMockStorageKeys();
      const logger = createMockLogger();

      const source$ = cold('a-b', { a: topicsA, b: topicsB });
      const result$ = source$.pipe(persistTopics(storage, storageKeys, logger));

      // Both emissions pass through — first one fails storage but still emits
      expectObservable(result$).toBe('a-b', { a: topicsA, b: topicsB });
    });
  });
});
