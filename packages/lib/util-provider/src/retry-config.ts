import { isRetriableError } from './is-retriable-error';

import type { RetryBackoffConfig } from 'backoff-rxjs';

/**
 * Retry configuration for provider requests using retryBackoff operator.
 *
 * This configuration implements an exponential backoff strategy with the following parameters:
 * - **initialInterval**: 300ms (start with a moderate delay)
 * - **maxInterval**: 5000ms (cap at 5 seconds to avoid excessive waits)
 * - **maxRetries**: 3 (total of 4 attempts: 1 initial + 3 retries)
 * - **shouldRetry**: Only retry if error is classified as retriable
 *
 * **Backoff sequence**: 300ms → 600ms → 1200ms → fail
 * **Total max wait time**: ~2100ms across all retries
 *
 * This configuration is specifically named `PROVIDER_REQUEST_RETRY_CONFIG` to prevent
 * accidental mixing with other retry configurations in the codebase.
 *
 * @example
 * ```typescript
 * import { retryBackoff } from 'backoff-rxjs';
 * import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
 *
 * provider.getData().pipe(
 *   retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
 *   // ... rest of pipeline
 * );
 * ```
 */
export const PROVIDER_REQUEST_RETRY_CONFIG: RetryBackoffConfig = {
  initialInterval: 300,
  maxInterval: 5000,
  maxRetries: 3,
  shouldRetry: (error: unknown) => isRetriableError(error),
};
