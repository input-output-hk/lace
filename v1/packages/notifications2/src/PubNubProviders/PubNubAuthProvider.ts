import { from, map, Observable, of, switchMap } from 'rxjs';
import { NotificationsAuthProvider } from '../provider.interface';
import { ErrorDiscriminator, NetworkResponseErrorDiscriminator, UnknownError } from '../errors';
import { AuthToken } from '../types';
import { getNow } from '../utils';
import { PubNubAuthConfig } from './types';

/**
 * PubNub authentication provider with caching.
 * Fetches authentication tokens via HTTP POST.
 * Caches tokens in memory and storage for reuse.
 * Throws typed errors (AuthError, NetworkError, UnknownError) via error discriminator.
 */
export class PubNubAuthProvider implements NotificationsAuthProvider {
  // eslint-disable-next-line no-magic-numbers
  private static readonly DEFAULT_REFRESH_MARGIN_SECONDS = 60;

  private readonly errorDiscriminator: ErrorDiscriminator<Response>;
  private cachedToken?: AuthToken;

  constructor(private readonly config: PubNubAuthConfig, errorDiscriminator?: ErrorDiscriminator<Response>) {
    this.errorDiscriminator = errorDiscriminator ?? new NetworkResponseErrorDiscriminator();
  }

  /**
   * Fetches an authentication token with expiry metadata.
   * Checks cache first unless forceRefresh is true.
   * Validates cached tokens are not expiring soon.
   *
   * @param forceRefresh - If true, bypasses cache and fetches new token (defaults to false)
   * @returns Observable emitting the AuthToken object
   * @throws {AuthError} For authentication failures
   * @throws {NetworkError} For network issues
   * @throws {UnknownError} For server errors, unexpected issues, or invalid response
   */
  getToken(forceRefresh = false): Observable<AuthToken> {
    // If force refresh, skip cache and fetch new
    if (forceRefresh) {
      return this.fetchAndCacheToken();
    }

    // Check in-memory cache first
    if (this.cachedToken && this.isTokenValid(this.cachedToken)) {
      return of(this.cachedToken);
    }

    // Try to load from storage
    return this.config.storage.getItem<AuthToken>(this.config.storageKeys.getToken()).pipe(
      switchMap((storedToken) => {
        if (storedToken && this.isTokenValid(storedToken)) {
          this.cachedToken = storedToken;
          return of(storedToken);
        }

        // Fetch new token from endpoint
        return this.fetchAndCacheToken();
      })
    );
  }

  /**
   * Clears cached token from memory and storage.
   * Useful for logout or when token is known to be invalid.
   *
   * @returns Observable completing when token is cleared
   */
  clearToken(): Observable<void> {
    this.cachedToken = undefined;
    return this.config.storage.removeItem(this.config.storageKeys.getToken());
  }

  /**
   * Checks if a token is valid and not expiring soon.
   */
  private isTokenValid(token: AuthToken): boolean {
    const now = getNow();
    const timeUntilExpiry = token.expiresAt - now;
    return timeUntilExpiry > token.refreshMargin;
  }

  /**
   * Fetches a new token from the endpoint and caches it.
   */
  private fetchAndCacheToken(): Observable<AuthToken> {
    return this.fetchTokenFromEndpoint().pipe(
      switchMap((authToken) => {
        this.cachedToken = authToken;

        // Save to storage
        return this.config.storage.setItem(this.config.storageKeys.getToken(), authToken).pipe(map(() => authToken));
      })
    );
  }

  /**
   * Fetches a token from the configured endpoint.
   * Expects response format: { token: string, expiresAt: number (seconds), refreshMargin?: number (seconds) }
   * Stores all values in seconds for backward compatibility with v1.
   * Throws typed errors based on response status:
   * - AuthError: 401, 403
   * - NetworkError: 404, 408, 429, timeout
   * - UnknownError: 5xx, other 4xx, unexpected errors, invalid response format
   */
  private fetchTokenFromEndpoint(): Observable<AuthToken> {
    return from(
      (async () => {
        const response = await fetch(this.config.tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: this.config.userId })
        });

        if (!response.ok) {
          await this.errorDiscriminator.throwForStatus(response);
        }

        const data = (await response.json()) as Partial<AuthToken>;

        // Validate response structure
        if (!data.token || typeof data.token !== 'string') {
          throw new UnknownError(undefined, 'Invalid token response: missing or invalid token field');
        }

        if (!data.expiresAt || typeof data.expiresAt !== 'number') {
          throw new UnknownError(undefined, 'Invalid token response: missing or invalid expiresAt field');
        }

        // Use refreshMargin from response if provided, otherwise default to 60 seconds
        const refreshMargin =
          typeof data.refreshMargin === 'number'
            ? data.refreshMargin
            : PubNubAuthProvider.DEFAULT_REFRESH_MARGIN_SECONDS;

        return {
          token: data.token,
          // Keep expiresAt in seconds (as received from endpoint)
          expiresAt: data.expiresAt,
          refreshMargin
        };
      })()
    );
  }
}
