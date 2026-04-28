import { TestScheduler } from 'rxjs/testing';
import { withAuthRetry } from '../../src/PubNubProviders/withAuthRetry';
import { NotificationsAuthProvider } from '../../src/provider.interface';
import { PubNubRxWrapper } from '../../src/PubNubProviders/PubNubRxWrapper';
import { AuthToken } from '../../src/types';
import { of, throwError } from 'rxjs';
import { AuthError, NetworkError } from '../../src/errors';
import { createMockLogger } from './testUtils';

const MOCK_TOKEN: AuthToken = { token: 'token-1', expiresAt: 9_999_999_999, refreshMargin: 60 };
const REFRESHED_TOKEN: AuthToken = { token: 'token-2', expiresAt: 9_999_999_999, refreshMargin: 60 };

const createMockWrapper = () =>
  ({
    setToken: jest.fn()
  } as unknown as jest.Mocked<PubNubRxWrapper>);

describe('withAuthRetry', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('gets token, sets it on wrapper, and executes operation', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const authProvider = {
        getToken: jest.fn(() => of(MOCK_TOKEN)),
        clearToken: jest.fn(() => of(void 0))
      } as unknown as NotificationsAuthProvider;
      const wrapper = createMockWrapper();
      const logger = createMockLogger();
      const operation = jest.fn(() => cold('a|', { a: 'result' }));

      const result$ = withAuthRetry(authProvider, wrapper, operation, logger);

      expectObservable(result$).toBe('a|', { a: 'result' });

      scheduler.flush();

      expect(authProvider.getToken).toHaveBeenCalledWith(false);
      expect(wrapper.setToken).toHaveBeenCalledWith('token-1');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  it('retries once on auth error with refreshed token', () => {
    scheduler.run(({ expectObservable }) => {
      let operationCallCount = 0;
      const authProvider = {
        getToken: jest.fn((forceRefresh?: boolean) => {
          if (forceRefresh) return of(REFRESHED_TOKEN);
          return of(MOCK_TOKEN);
        }),
        clearToken: jest.fn(() => of(void 0))
      } as unknown as NotificationsAuthProvider;
      const wrapper = createMockWrapper();
      const logger = createMockLogger();

      // eslint-disable-next-line no-magic-numbers
      const authError = new AuthError(403, 'Forbidden');
      const operation = jest.fn(() => {
        operationCallCount++;
        if (operationCallCount === 1) return throwError(() => authError);
        return of('success-after-retry');
      });

      const result$ = withAuthRetry(authProvider, wrapper, operation, logger);

      expectObservable(result$).toBe('(a|)', { a: 'success-after-retry' });

      scheduler.flush();

      expect(authProvider.clearToken).toHaveBeenCalled();
      expect(authProvider.getToken).toHaveBeenCalledWith(true);
      expect(wrapper.setToken).toHaveBeenCalledWith('token-2');
      // eslint-disable-next-line no-magic-numbers
      expect(operation).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith('Auth error, refreshing token and retrying');
    });
  });

  it('gives up after second auth error', () => {
    scheduler.run(({ expectObservable }) => {
      const authProvider = {
        getToken: jest.fn(() => of(MOCK_TOKEN)),
        clearToken: jest.fn(() => of(void 0))
      } as unknown as NotificationsAuthProvider;
      const wrapper = createMockWrapper();
      const logger = createMockLogger();

      // eslint-disable-next-line no-magic-numbers
      const authError = new AuthError(403, 'Forbidden');
      const operation = jest.fn(() => throwError(() => authError));

      const result$ = withAuthRetry(authProvider, wrapper, operation, logger);

      expectObservable(result$).toBe('#', undefined, authError);

      scheduler.flush();

      expect(logger.error).toHaveBeenCalledWith('Auth error after token refresh, giving up', authError);
    });
  });

  it('does not retry on network errors', () => {
    scheduler.run(({ expectObservable }) => {
      const authProvider = {
        getToken: jest.fn(() => of(MOCK_TOKEN)),
        clearToken: jest.fn(() => of(void 0))
      } as unknown as NotificationsAuthProvider;
      const wrapper = createMockWrapper();
      const logger = createMockLogger();

      // eslint-disable-next-line no-magic-numbers
      const networkError = new NetworkError(500, 'Server Error');
      const operation = jest.fn(() => throwError(() => networkError));

      const result$ = withAuthRetry(authProvider, wrapper, operation, logger);

      expectObservable(result$).toBe('#', undefined, networkError);

      scheduler.flush();

      expect(authProvider.clearToken).not.toHaveBeenCalled();
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  it('passes forceRefresh=false on first call', () => {
    scheduler.run(({ expectObservable }) => {
      const getTokenMock = jest.fn(() => of(MOCK_TOKEN));
      const authProvider = {
        getToken: getTokenMock,
        clearToken: jest.fn(() => of(void 0))
      } as unknown as NotificationsAuthProvider;
      const wrapper = createMockWrapper();
      const logger = createMockLogger();
      const operation = jest.fn(() => of('done'));

      const result$ = withAuthRetry(authProvider, wrapper, operation, logger);

      expectObservable(result$).toBe('(a|)', { a: 'done' });

      scheduler.flush();

      expect(getTokenMock).toHaveBeenCalledWith(false);
    });
  });
});
