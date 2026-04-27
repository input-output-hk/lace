import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { CustomError } from 'ts-custom-error';

export { ProviderError, ProviderFailure } from '@cardano-sdk/core';

/**
 * Error wrapper that normalises network / HTTP errors thrown by the client.
 */
export class HttpClientError extends CustomError {
  public constructor(
    public status?: number,
    public body?: string,
    public innerError?: unknown,
  ) {
    // Try to surface a useful message first.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    const message: string | null = body || (innerError as any)?.message;
    super(`BlockchainDataClient error with status '${status}': ${message}`);
  }
}

/**
 * Maps an HTTP status code to a corresponding `ProviderFailure` enum member.
 *
 * This function categorizes specific HTTP error codes into a standardized set of
 * failure types, abstracting the details of the transport layer. This allows for
 * simpler and more consistent error handling logic within the application.
 *
 * The mapping is as follows:
 * - **400**: `ProviderFailure.BadRequest`
 * - **403**: `ProviderFailure.Forbidden`
 * - **404**: `ProviderFailure.NotFound`
 * - **500**: `ProviderFailure.Unhealthy`
 * - **402, 418, 425, 429**: `ProviderFailure.ServerUnavailable`
 * - Any other code or `undefined`: `ProviderFailure.Unknown`
 *
 * @param status The HTTP status code to convert. An `undefined` value
 * represents a network error where no response was received.
 * @returns The corresponding `ProviderFailure` enum member based on the status code.
 */
export const toProviderFailure = (
  status: number | undefined,
): ProviderFailure => {
  switch (status) {
    case 400: {
      return ProviderFailure.BadRequest;
    }
    case 403: {
      return ProviderFailure.Forbidden;
    }
    case 404: {
      return ProviderFailure.NotFound;
    }
    case 402:
    case 418:
    case 425:
    case 429: {
      return ProviderFailure.ServerUnavailable;
    }
    case 500: {
      return ProviderFailure.Unhealthy;
    }
    case undefined:
    default: {
      return ProviderFailure.Unknown;
    }
  }
};

/**
 * Ensures that an error of an unknown type is converted into a standardized
 * ProviderError instance.
 *
 * This function acts as an error handling boundary, taking any thrown exception
 * and guaranteeing a ProviderError is returned. This simplifies error handling
 * in higher-level application code by providing a consistent error type to catch.
 *
 * The conversion logic is as follows:
 * - If the input is already a ProviderError, it is returned directly.
 * - If the input is an HttpClientError, it is mapped to a new ProviderError,
 * using toProviderFailure to set the failure type from the HTTP status.
 * - Any other type of error is wrapped in a ProviderError with a failure
 * type of ProviderFailure.Unknown.
 *
 * @param error The error to be converted, which can be of any type.
 * @returns A `ProviderError` instance that represents the original error.
 */
export const toProviderError = (error: unknown): ProviderError => {
  if (error instanceof ProviderError) {
    return error;
  }
  if (error instanceof HttpClientError) {
    return new ProviderError(
      toProviderFailure(error.status),
      error,
      error.body,
    );
  }

  return new ProviderError(ProviderFailure.Unknown, error);
};

/**
 * Checks if the error has a "reason" property.
 * @param error The error to check.
 */
export const errorHasReason = (
  error: unknown,
): error is { reason: ProviderFailure } =>
  typeof error === 'object' && error !== null && 'reason' in error;

/**
 * Checks if the error is a "not found" error.
 * @param error The error to check.
 */
export const isNotFoundError = (
  error: unknown,
): error is { reason: ProviderFailure.NotFound } =>
  errorHasReason(error) && error.reason === ProviderFailure.NotFound;
