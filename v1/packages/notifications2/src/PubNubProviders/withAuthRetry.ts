import { Observable, defer } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { NotificationsAuthProvider } from '../provider.interface';
import { NotificationsLogger } from '../types';
import { isAuthError } from '../errors';
import { PubNubRxWrapper } from './PubNubRxWrapper';

const executeWithAuth = <T>(
  authProvider: NotificationsAuthProvider,
  wrapper: PubNubRxWrapper,
  operation: () => Observable<T>,
  logger: NotificationsLogger,
  isRetry: boolean
): Observable<T> =>
  defer(() => authProvider.getToken(isRetry)).pipe(
    switchMap((authToken) => {
      wrapper.setToken(authToken.token);
      return operation();
    }),
    catchError((error) => {
      if (isAuthError(error) && !isRetry) {
        logger.warn('Auth error, refreshing token and retrying');
        return authProvider
          .clearToken()
          .pipe(switchMap(() => executeWithAuth(authProvider, wrapper, operation, logger, true)));
      }

      if (isAuthError(error)) {
        logger.error('Auth error after token refresh, giving up', error);
      }

      throw error;
    })
  );

/**
 * Wraps an operation with authentication token management and single retry on auth error.
 *
 * Flow:
 * 1. Get token from authProvider
 * 2. Set token on PubNub wrapper
 * 3. Execute the operation
 * 4. On auth error (first attempt): clear token → refresh → set new token → retry once
 * 5. On auth error (second attempt): give up, throw
 * 6. On non-auth errors: throw immediately (caller handles retry)
 *
 * @param authProvider - Token provider with getToken/clearToken
 * @param wrapper - PubNub wrapper to set token on
 * @param operation - The operation to execute (called after token is set)
 * @param logger - Logger for warnings
 * @returns Observable with the operation result
 */
export const withAuthRetry = <T>(
  authProvider: NotificationsAuthProvider,
  wrapper: PubNubRxWrapper,
  operation: () => Observable<T>,
  logger: NotificationsLogger
): Observable<T> => executeWithAuth(authProvider, wrapper, operation, logger, false);
