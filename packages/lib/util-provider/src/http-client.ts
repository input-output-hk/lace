import { catchError, firstValueFrom, switchMap, throwError } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';

import { HttpClientError } from './error';

import type { RateLimiter } from './rate-limiter';

/**
 * Provides a default no-op `RateLimiter` implementation that executes tasks immediately
 * without applying any rate limiting. It is used as a default dependency in clients
 * when no functional rate limiter is provided.
 */
const NULL_RATE_LIMITER: RateLimiter = {
  /**
   * Executes the provided task immediately without any rate limiting.
   * @param task The asynchronous task to execute.
   */
  schedule: async <T>(task: () => Promise<T>) => {
    return task();
  },
};

/**
 * Defines the configuration options required to initialize an {@link HttpClient} instance.
 *
 * This configuration object is passed to the `HttpClient` constructor to set its
 * foundational settings, such as the server's base URL and default options for
 * every outgoing request.
 */
export type HttpClientConfig = {
  /**
   * The base URL of the external service to which the client will connect.
   */
  baseUrl: URL | string;
  /**
   * Optional `RequestInit` object that contains default settings for every request made by the client.
   */
  requestInit?: RequestInit;
};

/**
 * External services the client relies on. Injected for easier testing.
 *
 * @property rateLimiter Instance of {@link RateLimiter} used to respect per‑project call quotas. If
 * not provided, the client will not apply any rate limiting.
 */
export type HttpClientDependencies = {
  rateLimiter?: RateLimiter;
};

/**
 * Best‑effort helper that attempts to read the `Response` body as text.
 * Returns undefined if the stream has already been consumed or an error
 * occurs.
 */
const tryReadResponseText = async (
  response: Response,
): Promise<string | undefined> => {
  try {
    return await response.text();
  } catch {
    return undefined;
  }
};

/**
 * Represents the options for an HTTP request, extending the standard `RequestInit`
 * with support for URL query parameters.
 *
 * This type allows callers to specify both standard fetch options (like headers,
 * method, body, etc.) and a structured params object, which the client
 * will serialize into a URL query string.
 */
export type HttpRequestOptions = RequestInit & {
  /**
   * A mapping of key-value pairs to be appended to the request URL as query parameters.
   *
   * Values are converted to their string representation. Any property with a value
   * of `undefined` is omitted from the final URL.
   *
   * @example
   * // Given the endpoint 'users' and params { role: 'admin', page: 1 }
   * // The final URL becomes '.../users?role=admin&page=1'
   */
  params?: Record<string, boolean | number | string | undefined>;
};

/**
 * Encapsulates a successful response from an HTTP request made by the client.
 *
 * @template T The expected type of the response body data.
 */
export type HttpRequestResponse<T> = {
  /**
   * The HTTP status code from the server's response.
   */
  status: number;

  /**
   * The body of the response parsed from JSON and cast to type `T`.
   */
  data: T;
};

/**
 * Safely constructs a new `URL` by appending path segments to a base URL.
 *
 * This utility provides a robust way to build URLs programmatically. It handles
 * common formatting issues, such as missing or extra slashes in the base URL
 * and segments, preventing errors that can arise from simple string concatenation.
 *
 * @param segments An array of path segments to append. Each segment is sanitized
 * to remove leading/trailing slashes, and empty segments are ignored.
 * @param baseUrl The base URL string. The function ensures it's treated as a
 * directory path for correct resolution.
 * @returns A new `URL` object representing the final, correctly formatted URL.
 */
export const buildUrl = (
  segments: Array<string | undefined>,
  baseUrl: string,
): URL => {
  const baseWithSlash = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  const cleanedSegments = segments
    .map(s => {
      if (!s) return s;

      let cleanedSegment = s;

      while (cleanedSegment.startsWith('/')) {
        cleanedSegment = cleanedSegment.slice(1);
      }

      while (cleanedSegment.endsWith('/')) {
        cleanedSegment = cleanedSegment.slice(0, -1);
      }

      return cleanedSegment;
    })
    .filter(Boolean);

  const relativePath = cleanedSegments.join('/');

  return new URL(relativePath, baseWithSlash);
};

/**
 * A client for making HTTP requests to a remote server.
 *
 * This client is built upon the `fetch` API and RxJS for handling asynchronous
 * operations. It provides a structured way to interact with a JSON-based API,
 * featuring configurable request options, pluggable rate limiting, and robust,
 * consistent error handling.
 */
export class HttpClient {
  private readonly rateLimiter: RateLimiter;
  private readonly baseUrl: URL;
  private readonly requestInit?: RequestInit;

  /**
   * Initializes a new instance of the `HttpClient`.
   *
   * @param config The configuration object that defines the client's base URL
   * and default request options. See {@link HttpClientConfig}.
   * @param dependencies An object containing external services the client relies
   * on, such as a rate limiter. See {@link HttpClientDependencies}.
   */
  public constructor(
    { baseUrl, requestInit }: HttpClientConfig,
    { rateLimiter = NULL_RATE_LIMITER } = {},
  ) {
    this.rateLimiter = rateLimiter;
    this.requestInit = requestInit;

    this.baseUrl = new URL(baseUrl);

    // Make sure baseUrl acts like a directory
    if (!this.baseUrl.pathname.endsWith('/')) {
      this.baseUrl.pathname += '/';
    }
  }

  /**
   * Performs an HTTP request to a specified endpoint.
   *
   * @template T The expected type of the data in the response body.
   *
   * @param endpoint The relative path of the API endpoint, which is resolved
   * against the `baseUrl`. For example, `'users/latest'`.
   * @param options Optional settings for this specific request, including URL
   * query parameters (`params`) and `fetch` options. These settings are merged
   * with any defaults provided in the constructor. See {@link HttpRequestOptions}.
   *
   * @returns A `Promise` that resolves with an {@link HttpRequestResponse} object,
   * containing the parsed response data and the HTTP status code.
   *
   * @throws {HttpClientError} The promise will reject with an `HttpClientError` if
   * the request fails due to a network issue, if the server returns a non-OK
   * (4xx/5xx) status code, or if the response body cannot be parsed as JSON.
   */
  public async request<T>(
    endpoint: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpRequestResponse<T>> {
    const { params, ...requestInit } = options;

    const url = new URL(endpoint.replace(/^\/+/, ''), this.baseUrl);

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.append(k, String(v));
      }
    }

    return this.rateLimiter.schedule(async () =>
      firstValueFrom(
        fromFetch(url.toString(), {
          ...this.requestInit,
          ...requestInit,
          headers: {
            ...this.requestInit?.headers,
            ...requestInit?.headers,
          },
        }).pipe(
          switchMap(async (response): Promise<HttpRequestResponse<T>> => {
            if (response.ok) {
              let body: unknown;
              try {
                body = await response.json();
              } catch {
                throw new HttpClientError(
                  response.status,
                  'Failed to parse json',
                );
              }

              return {
                data: body as T,
                status: response.status,
              };
            }

            throw new HttpClientError(
              response.status,
              await tryReadResponseText(response),
            );
          }),

          catchError(error => {
            if (error instanceof HttpClientError) {
              return throwError(() => error);
            }
            return throwError(
              () => new HttpClientError(undefined, undefined, error),
            );
          }),
        ),
      ),
    );
  }
}
