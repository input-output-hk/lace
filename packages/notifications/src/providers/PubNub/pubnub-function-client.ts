import type { TokenAuthClient, TokenRequest, TokenResponse } from './types';
import { getNow } from '../../utils';

/**
 * HTTP client for PubNub Function authentication endpoint.
 * Handles token requests with proper error handling and validation.
 */
export class PubNubFunctionClient implements TokenAuthClient {
  /**
   * Creates a new PubNubFunctionClient instance.
   * @param endpoint - The PubNub Function endpoint URL for token requests
   */
  constructor(private readonly endpoint: string) {}

  /**
   * Requests a new authentication token from PubNub Function.
   *
   * @param userId - User identifier for token generation
   * @returns Promise resolving to token response with token and expiry
   * @throws {AuthenticationError} When request fails or response is invalid
   */
  async requestToken(userId: string): Promise<TokenResponse> {
    const request: TokenRequest = { userId };

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const { status, statusText } = response;
      const details = JSON.stringify({ errorText, status, statusText, userId });

      throw new Error(`Token request failed: ${details}`);
    }

    const data = (await response.json()) as TokenResponse;

    // Validate response structure
    if (!data.token || !data.expiresAt) {
      const details = JSON.stringify({ data, userId });

      throw new Error(`Invalid token response: missing required fields: ${details}`);
    }

    // Validate expiry is in the future
    const currentTime = getNow();
    if (data.expiresAt <= currentTime) {
      const { expiresAt, token } = data;
      const details = JSON.stringify({ currentTime, expiresAt, token, userId });

      throw new Error(`Invalid token response: token already expired: ${details}`);
    }

    return data;
  }
}
