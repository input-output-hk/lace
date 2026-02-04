/* eslint-disable no-magic-numbers */
/**
 * Base error class for notification-related errors.
 */
export abstract class NotificationError extends Error {
  constructor(message: string, public readonly statusCode?: number, public readonly statusText?: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Authentication error (401, 403).
 * Indicates token is invalid or expired.
 */
export class AuthError extends NotificationError {
  constructor(statusCode: number, statusText: string) {
    super(`Authentication failed: ${statusCode} ${statusText}`, statusCode, statusText);
  }
}

/**
 * Network error (timeout, 404, connection issues).
 * Indicates transient network problems that may be retried.
 */
export class NetworkError extends NotificationError {
  constructor(statusCode: number | undefined, statusText: string) {
    const statusCodeString = statusCode ? `${statusCode} ` : '';
    super(`Network error: ${statusCodeString}${statusText}`, statusCode, statusText);
  }
}

/**
 * Unknown error (5xx, other 4xx, unexpected errors).
 * Indicates server errors or unexpected client errors.
 */
export class UnknownError extends NotificationError {
  constructor(statusCode: number | undefined, statusText: string) {
    const statusCodeString = statusCode ? `${statusCode} ` : '';
    super(`Unknown error: ${statusCodeString}${statusText}`, statusCode, statusText);
  }
}

/**
 * Generic error discriminator interface.
 * Analyzes responses and throws appropriate error types.
 * @template T - The type of response object to analyze
 */
export interface ErrorDiscriminator<T> {
  /**
   * Throws an appropriate error based on response status.
   * @param response - Response to analyze
   * @throws {AuthError} For 401, 403 status codes
   * @throws {NetworkError} For 404, timeout, connection errors
   * @throws {UnknownError} For 5xx, other 4xx, or unexpected errors
   */
  throwForStatus(response: T): Promise<never>;
}

/**
 * Network response error discriminator for fetch API responses.
 * Analyzes HTTP status codes and throws appropriate error types.
 */
export class NetworkResponseErrorDiscriminator implements ErrorDiscriminator<Response> {
  async throwForStatus(response: Response): Promise<never> {
    const { status, statusText } = response;

    // Auth errors: 401 Unauthorized, 403 Forbidden
    if (status === 401 || status === 403) {
      throw new AuthError(status, statusText);
    }

    // Network errors: 404 Not Found, 408 Request Timeout, 429 Too Many Requests
    if (status === 404 || status === 408 || status === 429) {
      throw new NetworkError(status, statusText);
    }

    // Client errors (other 4xx): Unknown
    if (status >= 400 && status < 500) {
      throw new UnknownError(status, statusText);
    }

    // Server errors (5xx): Unknown
    if (status >= 500) {
      throw new UnknownError(status, statusText);
    }

    // Unexpected status code
    throw new UnknownError(status, statusText);
  }
}

/**
 * Type guard to check if error is an AuthError.
 */
export const isAuthError = (error: unknown): error is AuthError => error instanceof AuthError;

/**
 * Type guard to check if error is a NetworkError.
 */
export const isNetworkError = (error: unknown): error is NetworkError => error instanceof NetworkError;

/**
 * Type guard to check if error is an UnknownError.
 */
export const isUnknownError = (error: unknown): error is UnknownError => error instanceof UnknownError;
