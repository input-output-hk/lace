/* eslint-disable no-magic-numbers */
import { AuthError, ErrorDiscriminator, NetworkError, UnknownError } from '../errors';

/**
 * Network-related PubNub error categories that should be converted to network errors.
 */
const NETWORK_ERROR_CATEGORIES = new Set([
  'PNNetworkIssuesCategory',
  'PNTimeoutCategory',
  'PNCancelledCategory',
  'PNServerErrorCategory'
]);

/**
 * Auth-related PubNub error categories.
 */
const AUTH_ERROR_CATEGORIES = new Set(['PNAccessDeniedCategory']);

/**
 * Unknown error categories.
 */
const UNKNOWN_ERROR_CATEGORIES = new Set([
  'PNBadRequestCategory',
  'PNValidationErrorCategory',
  'PNMalformedResponseCategory',
  'PNUnknownCategory'
]);

/**
 * Checks if an error has a PubNub status.category field.
 *
 * @param error - The error to check
 * @returns The category string if found, empty string otherwise
 */
const getPubNubErrorCategory = (error: unknown): string => {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = error.status;
    if (status && typeof status === 'object' && 'category' in status && typeof status.category === 'string') {
      return status.category;
    }
  }
  return '';
};

/**
 * Extracts errorData from PubNub error structure.
 *
 * @param error - The error to extract errorData from
 * @returns The errorData if found, undefined otherwise
 */
const getPubNubErrorData = (error: unknown): unknown => {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = error.status;
    if (status && typeof status === 'object' && 'errorData' in status) {
      return status.errorData;
    }
  }
  return '';
};

/**
 * Extracts error message from PubNub error structure.
 * PubNub errors have the format: { status: { errorData: Error, category: string, ... } }
 *
 * @param error - The error to extract message from
 * @returns The extracted error message
 */
const getErrorMessage = (error: unknown): string => {
  // Check for PubNub error structure with errorData
  const errorData = getPubNubErrorData(error);
  if (errorData) {
    // errorData could be an Error instance or any object
    if (errorData instanceof Error) {
      return errorData.message;
    }
    if (typeof errorData === 'object' && 'message' in errorData) {
      return String(errorData.message);
    }
    // Fallback to converting errorData to string
    return String(errorData);
  }

  // Fallback to standard Error.message or String conversion
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

/**
 * Checks if error message matches network error patterns.
 */
const isNetworkErrorPattern = (message: string): boolean =>
  message.includes('network') ||
  message.includes('timeout') ||
  message.includes('fetch failed') ||
  message.includes('econnrefused') ||
  message.includes('enotfound') ||
  message.includes('connection');

/**
 * Error discriminator for PubNub API responses.
 * Analyzes PubNub errors and throws appropriate error types.
 */
export class PubNubErrorDiscriminator implements ErrorDiscriminator<unknown> {
  async throwForStatus(error: unknown): Promise<never> {
    const category = getPubNubErrorCategory(error);
    const errorMessage = getErrorMessage(error);

    // Check PubNub category-based errors
    if (category) {
      if (NETWORK_ERROR_CATEGORIES.has(category)) {
        throw new NetworkError(undefined, errorMessage);
      }

      if (AUTH_ERROR_CATEGORIES.has(category)) {
        throw new AuthError(403, errorMessage);
      }

      if (UNKNOWN_ERROR_CATEGORIES.has(category)) {
        throw new UnknownError(undefined, errorMessage);
      }
    }

    // Fallback: check error message patterns for non-PubNub errors
    if (isNetworkErrorPattern(errorMessage.toLowerCase())) {
      throw new NetworkError(undefined, errorMessage);
    }

    // All other errors are unknown
    throw new UnknownError(undefined, errorMessage);
  }
}
