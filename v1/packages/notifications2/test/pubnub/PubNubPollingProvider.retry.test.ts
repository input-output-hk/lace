/* eslint-disable no-magic-numbers */
import { of, Subject, throwError } from 'rxjs';
import type PubNub from 'pubnub';
import { PubNubPollingProvider } from '../../src/PubNubProviders/PubNubPollingProvider';
import { PubNubPollingConfig } from '../../src/PubNubProviders/types';
import { PubNubRxWrapper } from '../../src/PubNubProviders/PubNubRxWrapper';
import { NotificationsLogger, StorageAdapter, AuthToken } from '../../src/types';
import { NotificationsAuthProvider } from '../../src/provider.interface';
import { StorageKeys } from '../../src/StorageKeys';
import { NetworkError, AuthError } from '../../src/errors';

describe('PubNubPollingProvider - Retry & Backoff', () => {
  let mockWrapper: jest.Mocked<PubNubRxWrapper>;
  let mockAuth: jest.Mocked<NotificationsAuthProvider>;
  let mockStorage: jest.Mocked<StorageAdapter>;
  let mockLogger: jest.Mocked<NotificationsLogger>;
  let provider: PubNubPollingProvider;

  beforeEach(() => {
    mockWrapper = {
      fetchTopics: jest.fn(),
      fetchHistory: jest.fn(),
      setToken: jest.fn(),
      stop: jest.fn()
    } as unknown as jest.Mocked<PubNubRxWrapper>;

    mockAuth = {
      getToken: jest.fn(),
      clearToken: jest.fn().mockReturnValue(of(void 0))
    } as unknown as jest.Mocked<NotificationsAuthProvider>;

    mockStorage = {
      getItem: jest.fn().mockReturnValue(of([])),
      setItem: jest.fn().mockReturnValue(of(void 0))
    } as unknown as jest.Mocked<StorageAdapter>;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<NotificationsLogger>;
  });

  const createProvider = (config?: Partial<PubNubPollingConfig>): PubNubPollingProvider => {
    const fullConfig: PubNubPollingConfig = {
      wrapper: mockWrapper,
      authProvider: mockAuth,
      storage: mockStorage,
      storageKeys: new StorageKeys('test'),
      logger: mockLogger,
      topicSync$: new Subject<void>(),
      notificationSync$: new Subject<string>(),
      ...config
    };

    return new PubNubPollingProvider(fullConfig);
  };

  /** Returns a getToken mock that increments the given counter and returns a token. */
  const createCountingGetTokenMock =
    (counter: { count: number }): (() => ReturnType<NotificationsAuthProvider['getToken']>) =>
    () => {
      counter.count++;
      return of({
        token: `token${counter.count}`,
        expiresAt: Date.now() + 3_600_000,
        refreshMargin: 300_000
      } as AuthToken);
    };

  describe('Network Retry with Backoff', () => {
    it('should retry network errors and eventually succeed', (done) => {
      let historyCallCount = 0;

      // Auth always succeeds
      const mockAuthToken: AuthToken = {
        token: 'test-token',
        expiresAt: Date.now() + 3_600_000,
        refreshMargin: 300_000
      };
      mockAuth.getToken.mockReturnValue(of(mockAuthToken));

      // History fails 2 times with network error, succeeds on 3rd attempt
      mockWrapper.fetchHistory.mockImplementation(() => {
        historyCallCount++;

        if (historyCallCount <= 2) {
          // Emit error on Observable so provider's catchError can handle it
          return throwError(() => new NetworkError(undefined, 'Network timeout'));
        }

        // 3rd attempt succeeds
        const mockResponse: PubNub.History.FetchMessagesResponse = {
          channels: {
            topic1: [
              {
                channel: 'topic1',
                message: { id: 'notif1', topicId: 'topic1' },
                timetoken: '16000000000000000',
                uuid: 'test-uuid'
              }
            ]
          }
        };
        return of(mockResponse);
      });

      provider = createProvider();

      const result$ = provider.fetchHistoryAndEmit('topic1', '15000000000000000', '17000000000000000');

      result$.subscribe({
        next: (notifications) => {
          expect(notifications).toHaveLength(1);
          expect(notifications[0].id).toBe('notif1');
          expect(historyCallCount).toBe(3); // 1 initial + 2 retries
          done();
        },
        error: (error: unknown) => done(error)
      });
    }, 30_000); // 30 second timeout
  });

  describe('Auth Token Network Errors', () => {
    it('should retry whole flow when getToken fails with network error', (done) => {
      let authCallCount = 0;

      // getToken fails first 2 times, succeeds on 3rd
      mockAuth.getToken.mockImplementation(() => {
        authCallCount++;
        if (authCallCount <= 2) {
          return throwError(() => new NetworkError(undefined, 'Network timeout'));
        }
        return of({
          token: 'test-token',
          expiresAt: Date.now() + 3_600_000,
          refreshMargin: 300_000
        } as AuthToken);
      });

      // History succeeds once we have a token
      mockWrapper.fetchHistory.mockReturnValue(
        of({
          channels: {
            topic1: [{ channel: 'topic1', message: { id: 'n1' }, timetoken: '16000000000000000', uuid: 'u' }]
          }
        } as PubNub.History.FetchMessagesResponse)
      );

      provider = createProvider();
      provider.fetchHistoryAndEmit('topic1', '15000000000000000', '17000000000000000').subscribe({
        next: () => {
          expect(authCallCount).toBe(3); // 2 failures + 1 success
          done();
        },
        error: done
      });
    }, 50_000);

    it('should retry whole flow when getToken fails during auth error recovery', (done) => {
      let authCallCount = 0;
      let historyCallCount = 0;

      mockAuth.getToken.mockImplementation(() => {
        authCallCount++;
        // Call 1: success (initial)
        // Call 2: network error (during auth recovery)
        // Call 3: success (retry of whole flow)
        if (authCallCount === 2) {
          return throwError(() => new NetworkError(undefined, 'Network timeout'));
        }
        return of({
          token: `token${authCallCount}`,
          expiresAt: Date.now() + 3_600_000,
          refreshMargin: 300_000
        } as AuthToken);
      });

      mockWrapper.fetchHistory.mockImplementation(() => {
        historyCallCount++;
        // Call 1: auth error (triggers recovery)
        // Call 2: success (after flow restart)
        if (historyCallCount === 1) {
          return throwError(() => new AuthError(403, 'Access denied'));
        }
        return of({
          channels: {
            topic1: [{ channel: 'topic1', message: { id: 'n1' }, timetoken: '16000000000000000', uuid: 'u' }]
          }
        } as PubNub.History.FetchMessagesResponse);
      });

      provider = createProvider();
      provider.fetchHistoryAndEmit('topic1', '15000000000000000', '17000000000000000').subscribe({
        next: () => {
          expect(authCallCount).toBe(3); // initial + network fail during recovery + success on restart
          expect(historyCallCount).toBe(2); // auth error + success
          done();
        },
        error: done
      });
    }, 30_000);
  });

  describe('Auth Retry After Token Refresh', () => {
    it('should retry with new token after auth error', (done) => {
      let authCallCount = 0;
      let historyCallCount = 0;

      // First auth call returns token1
      // Second auth call (after auth error) returns token2
      mockAuth.getToken.mockImplementation(() => {
        authCallCount++;
        const token = authCallCount === 1 ? 'token1' : 'token2';
        const mockAuthToken: AuthToken = {
          token,
          expiresAt: Date.now() + 3_600_000,
          refreshMargin: 300_000
        };
        return of(mockAuthToken);
      });

      // First history call with token1 fails with auth error
      // Second history call with token2 succeeds
      mockWrapper.fetchHistory.mockImplementation(() => {
        historyCallCount++;

        if (historyCallCount === 1) {
          // Emit error on Observable so provider's catchError can handle it
          return throwError(() => new AuthError(403, 'Access denied'));
        }

        // Second attempt succeeds
        const mockResponse: PubNub.History.FetchMessagesResponse = {
          channels: {
            topic1: [
              {
                channel: 'topic1',
                message: { id: 'notif1', topicId: 'topic1' },
                timetoken: '16000000000000000',
                uuid: 'test-uuid'
              }
            ]
          }
        };
        return of(mockResponse);
      });

      provider = createProvider();

      const result$ = provider.fetchHistoryAndEmit('topic1', '15000000000000000', '17000000000000000');

      result$.subscribe({
        next: (notifications) => {
          expect(notifications).toHaveLength(1);
          expect(notifications[0].id).toBe('notif1');
          expect(authCallCount).toBe(2);
          expect(historyCallCount).toBe(2);
          done();
        },
        error: (error: unknown) => done(error)
      });
    }, 10_000);
  });

  describe('Unrecoverable Auth Error (fail fast)', () => {
    it('should fail immediately after one retry when auth error persists (e.g., subscribe key mismatch)', (done) => {
      let authCallCount = 0;
      let historyCallCount = 0;

      // Auth always succeeds and returns valid-looking tokens
      mockAuth.getToken.mockImplementation(() => {
        authCallCount++;
        const token = `token${authCallCount}`;
        const mockAuthToken: AuthToken = {
          token,
          expiresAt: Date.now() + 3_600_000,
          refreshMargin: 300_000
        };
        return of(mockAuthToken);
      });

      // History ALWAYS fails with auth error (subscribe key mismatch)
      mockWrapper.fetchHistory.mockImplementation(() => {
        historyCallCount++;
        return throwError(() => new AuthError(403, 'Access denied - subscribe key mismatch'));
      });

      provider = createProvider();

      const result$ = provider.fetchHistoryAndEmit('topic1', '15000000000000000', '17000000000000000');

      result$.subscribe({
        next: () => {
          done(new Error('Should not succeed'));
        },
        error: (error: Error) => {
          expect(error).toBeInstanceOf(AuthError);
          expect(error.message).toContain('subscribe key mismatch');
          // Should be exactly 2 attempts (1 initial + 1 retry after token refresh)
          expect(authCallCount).toBe(2);
          expect(historyCallCount).toBe(2);
          done();
        }
      });
    }, 10_000);

    it('should fetch exactly 2 auth tokens for persistent auth error (no infinite loop)', (done) => {
      const authCallCount = { count: 0 };
      mockAuth.getToken.mockImplementation(createCountingGetTokenMock(authCallCount));

      // History always fails with auth error
      mockWrapper.fetchHistory.mockImplementation(() =>
        throwError(() => new AuthError(403, 'Access denied - subscribe key mismatch'))
      );

      provider = createProvider();

      const result$ = provider.fetchHistoryAndEmit('topic1', '15000000000000000', '17000000000000000');

      result$.subscribe({
        next: () => {
          done(new Error('Should not succeed'));
        },
        error: (error: unknown) => {
          expect(error).toBeInstanceOf(AuthError);
          // Critical assertion: exactly 2 auth calls, no more
          expect(authCallCount.count).toBe(2);
          done();
        }
      });
    }, 10_000);
  });

  describe('Mixed Error Scenarios', () => {
    it('should handle network error -> success pattern', (done) => {
      let historyCallCount = 0;

      const mockAuthToken: AuthToken = {
        token: 'test-token',
        expiresAt: Date.now() + 3_600_000,
        refreshMargin: 300_000
      };
      mockAuth.getToken.mockReturnValue(of(mockAuthToken));

      mockWrapper.fetchHistory.mockImplementation(() => {
        historyCallCount++;

        if (historyCallCount === 1) {
          return throwError(() => new NetworkError(undefined, 'Network timeout'));
        }

        // Second attempt succeeds
        const mockResponse: PubNub.History.FetchMessagesResponse = {
          channels: {
            topic1: [
              {
                channel: 'topic1',
                message: { id: 'notif1', topicId: 'topic1' },
                timetoken: '16000000000000000',
                uuid: 'test-uuid'
              }
            ]
          }
        };
        return of(mockResponse);
      });

      provider = createProvider();

      const result$ = provider.fetchHistoryAndEmit('topic1', '15000000000000000', '17000000000000000');

      result$.subscribe({
        next: (notifications) => {
          expect(notifications).toHaveLength(1);
          expect(notifications[0].id).toBe('notif1');
          expect(historyCallCount).toBe(2); // 1 initial + 1 retry
          done();
        },
        error: (error: unknown) => done(error)
      });
    }, 10_000);

    it('should handle auth error -> network error -> success pattern', (done) => {
      let historyCallCount = 0;
      const authCallCount = { count: 0 };
      mockAuth.getToken.mockImplementation(createCountingGetTokenMock(authCallCount));

      mockWrapper.fetchHistory.mockImplementation(() => {
        historyCallCount++;

        if (historyCallCount === 1) {
          return throwError(() => new AuthError(403, 'Access denied'));
        }

        if (historyCallCount === 2) {
          return throwError(() => new NetworkError(undefined, 'Network timeout'));
        }

        // Third attempt: success
        const mockResponse: PubNub.History.FetchMessagesResponse = {
          channels: {
            topic1: [
              {
                channel: 'topic1',
                message: { id: 'notif1', topicId: 'topic1' },
                timetoken: '16000000000000000',
                uuid: 'test-uuid'
              }
            ]
          }
        };
        return of(mockResponse);
      });

      provider = createProvider();

      const result$ = provider.fetchHistoryAndEmit('topic1', '15000000000000000', '17000000000000000');

      result$.subscribe({
        next: (notifications) => {
          expect(notifications).toHaveLength(1);
          expect(notifications[0].id).toBe('notif1');
          expect(historyCallCount).toBe(3); // auth error -> network error -> success
          // Network error retries JUST fetchHistory, not the whole auth flow
          expect(authCallCount.count).toBe(3); // network errors request token, but get cached one
          done();
        },
        error: (error: unknown) => done(error)
      });
    }, 10_000);
  });
});
