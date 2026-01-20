/**
 * Utility functions for handling PubNub network errors.
 * Converts network-related PubNubError exceptions to TypeError instances
 * that isNetworkError() recognizes, preventing Sentry from capturing transient network errors.
 */

/**
 * Network-related PubNub error categories that should be converted to network errors.
 */
const NETWORK_ERROR_CATEGORIES = new Set(['PNTimeoutCategory', 'PNNetworkIssuesCategory', 'PNNetworkDownCategory']);

/**
 * Checks if an error is a network-related PubNub error.
 * Only checks the status.category field, not errorData.
 *
 * @param error - The error to check
 * @returns True if the error is a network-related PubNub error
 */
export const isPubNubNetworkError = (error: unknown): boolean => {
  // Check if error has a status property with category
  if (error && typeof error === 'object' && 'status' in error) {
    const status = error.status;
    if (status && typeof status === 'object' && 'category' in status && typeof status.category === 'string') {
      return NETWORK_ERROR_CATEGORIES.has(status.category);
    }
  }

  return false;
};

/**
 * Wraps an async PubNub operation and transforms network-related errors.
 * Network-related PubNubErrors are converted to TypeError with message "Failed to fetch"
 * so that isNetworkError() recognizes them and Sentry doesn't capture them.
 *
 * @param operation - The async operation to wrap
 * @returns Promise that resolves to the operation result, or throws a transformed error
 * @throws TypeError if the operation throws a network-related PubNubError
 * @throws The original error if it's not a network-related PubNubError
 */
export const withNetworkErrorHandling = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (isPubNubNetworkError(error)) {
      // Convert to TypeError with message that isNetworkError() recognizes
      throw new TypeError('Failed to fetch');
    }
    // Re-throw non-network errors as-is
    throw error;
  }
};
