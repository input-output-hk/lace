/**
 * Authentication token response from PubNub Function.
 * This matches the expected API contract from LW-13729.
 */
export type AuthToken = {
  /** PubNub authentication token (TTL encoded) */
  token: string;
  /** Token expiry timestamp in Unix seconds */
  expiresAt: number;
  /** Token refresh margin in seconds */
  refreshMargin: number;
};

/**
 * Request payload for token authentication endpoint.
 */
export type TokenRequest = {
  /** User identifier for token generation */
  userId: string;
};

/**
 * Token authentication client interface.
 * Abstracts the HTTP communication with PubNub Function.
 */
export interface TokenAuthClient {
  /**
   * Requests a new authentication token from the server.
   * @param userId - User identifier
   * @returns Promise resolving to token response
   * @throws {AuthenticationError} When token request fails
   */
  requestToken(userId: string): Promise<AuthToken>;
}
