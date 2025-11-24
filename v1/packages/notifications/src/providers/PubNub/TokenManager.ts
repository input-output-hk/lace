import type { TokenAuthClient, TokenResponse, StoredToken } from './types';
import type { NotificationsStorage } from '../../types';
import type { StorageKeys } from '../../StorageKeys';
import { getNow } from '../../utils';

/**
 * Token refresh margin in seconds.
 * Tokens are refreshed this amount of time before expiry to avoid edge cases.
 * This is because PubNub tokens are valid for 1 hour.
 */
// eslint-disable-next-line no-magic-numbers
const TOKEN_REFRESH_MARGIN = 59 * 60; // 59 minutes

/**
 * Manages authentication token lifecycle.
 * Handles token storage, retrieval, expiry detection, and automatic refresh.
 *
 * Features:
 * - Automatic token refresh before expiry
 * - Concurrent getValidToken() calls are deduplicated
 * - Proper error handling with context
 * - Storage abstraction for platform independence
 */
export class TokenManager {
  private tokenRefreshPromise: Promise<TokenResponse> | undefined = undefined;

  /**
   * Creates a new TokenManager instance.
   * @param authClient - Client for requesting authentication tokens
   * @param storage - Storage instance for persisting tokens
   * @param storageKeys - Storage keys manager for generating token storage key
   * @param userId - User identifier for token generation
   */
  constructor(
    private readonly authClient: TokenAuthClient,
    private readonly storage: NotificationsStorage,
    private readonly storageKeys: StorageKeys,
    private readonly userId: string
  ) {}

  /**
   * Gets a valid authentication token, refreshing if necessary.
   * Concurrent calls are deduplicated - only one refresh request is made.
   *
   * @returns Promise resolving to valid token response
   * @throws {AuthenticationError} When token fetch/refresh fails
   * @throws {StorageError} When storage operations fail
   */
  async getValidToken(): Promise<TokenResponse> {
    // If a refresh is already in progress, wait for it
    if (this.tokenRefreshPromise) return this.tokenRefreshPromise;

    // Try to load token from storage
    const storedToken = await this.storage.getItem<StoredToken>(this.storageKeys.getToken());

    // Check if token is valid and not expiring soon
    if (storedToken && this.isTokenValid(storedToken)) return storedToken;

    // Token is missing, expired, or expiring soon - refresh it
    return await this.refreshToken();
  }

  /**
   * Checks if token is valid and not expiring soon.
   *
   * @param token - Stored token to validate
   * @returns true if token is valid and has sufficient remaining lifetime
   */
  private isTokenValid(token: StoredToken): boolean {
    const now = getNow();
    const timeUntilExpiry = token.expiresAt - now;

    // Token is valid if it hasn't expired and has more time than the refresh margin
    return timeUntilExpiry > TOKEN_REFRESH_MARGIN;
  }

  /**
   * Requests a new token from auth service and stores it.
   * Deduplicates concurrent refresh requests.
   *
   * @returns Promise resolving to new token response
   * @throws {AuthenticationError} When token request fails
   * @throws {StorageError} When storage write fails
   */
  private async refreshToken(): Promise<TokenResponse> {
    // Deduplicate concurrent refresh requests
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this.performTokenRefresh();

    try {
      return await this.tokenRefreshPromise;
    } finally {
      // Clear refresh promise after completion (success or failure)
      this.tokenRefreshPromise = undefined;
    }
  }

  /**
   * Performs the actual token refresh operation.
   * Requests token from auth client and stores it.
   *
   * @returns Promise resolving to new token response
   * @throws {AuthenticationError} When token request fails
   * @throws {StorageError} When storage write fails
   */
  private async performTokenRefresh(): Promise<TokenResponse> {
    if (!this.userId) throw new Error('User ID is not set');

    // Request new token from auth service
    const tokenResponse = await this.authClient.requestToken(this.userId);

    // Store token in storage
    const storedToken: StoredToken = {
      token: tokenResponse.token,
      expiresAt: tokenResponse.expiresAt
    };

    await this.storage.setItem(this.storageKeys.getToken(), storedToken);

    return tokenResponse;
  }
}
