import { ProviderFailure } from '@cardano-sdk/core';

import { errorHasReason } from './error';

/**
 * Determines if a ProviderError should be retried based on its failure type.
 *
 * Retriable errors are typically transient network or server issues that may
 * succeed on a subsequent attempt. Non-retriable errors indicate permanent
 * failures like bad requests or forbidden access.
 *
 * **Retriable error types**:
 * - `ConnectionFailure`: Network connectivity issues
 * - `ServerUnavailable`: Temporary server unavailability (rate limits, maintenance)
 * - `Unhealthy`: Server health issues that may be temporary
 * - `Unknown`: Unknown errors (may be transient)
 * - Errors without a reason field (treated as unknown/retriable)
 * - Unrecognized reason values (conservative approach: treat as retriable)
 *
 * **Non-retriable error types**:
 * - `BadRequest`: Invalid request that won't succeed on retry
 * - `Forbidden`: Access denied (auth/permission issues)
 * - `NotFound`: Resource doesn't exist
 *
 * @param error - The error to classify (typically a ProviderError)
 * @returns true if the error should be retried, false otherwise
 *
 * @example
 * ```typescript
 * try {
 *   await provider.someMethod();
 * } catch (error) {
 *   if (isRetriableError(error)) {
 *     // Retry the operation
 *   } else {
 *     // Show error to user or fail permanently
 *   }
 * }
 * ```
 */
export const isRetriableError = (error: unknown): boolean => {
  if (!errorHasReason(error)) {
    // If error doesn't have a reason field, treat it as unknown/retriable
    return true;
  }

  switch (error.reason) {
    // Retriable: transient network/server issues
    case ProviderFailure.ConnectionFailure:
    case ProviderFailure.ServerUnavailable:
    case ProviderFailure.Unhealthy:
    case ProviderFailure.Unknown:
      return true;

    // Non-retriable: permanent failures
    case ProviderFailure.BadRequest:
    case ProviderFailure.Forbidden:
    case ProviderFailure.NotFound:
    case ProviderFailure.Conflict:
    case ProviderFailure.InvalidResponse:
    case ProviderFailure.NotImplemented:
      return false;

    // Unrecognized reason: treat as retriable (conservative approach)
    default:
      return true;
  }
};
