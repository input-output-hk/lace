import { MonoTypeOperatorFunction } from 'rxjs';
import { retryBackoff } from 'backoff-rxjs';
import { isNetworkError } from '../errors';

const DEFAULT_INITIAL_INTERVAL_MS = 1000;
const DEFAULT_MAX_RETRIES = 10;

/**
 * RxJS operator that retries on network errors with exponential backoff.
 *
 * - Only retries NetworkError instances (transient failures)
 * - Non-network errors pass through immediately
 * - Resets retry count on success
 *
 * @param config - Optional retry configuration
 * @returns MonoTypeOperatorFunction that adds retry behavior
 */
export const withNetworkRetry = <T>(config?: {
  initialInterval?: number;
  maxRetries?: number;
}): MonoTypeOperatorFunction<T> =>
  retryBackoff({
    initialInterval: config?.initialInterval ?? DEFAULT_INITIAL_INTERVAL_MS,
    maxRetries: config?.maxRetries ?? DEFAULT_MAX_RETRIES,
    resetOnSuccess: true,
    shouldRetry: (error) => isNetworkError(error)
  });
