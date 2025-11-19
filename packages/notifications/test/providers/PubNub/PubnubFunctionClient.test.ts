/* eslint-disable no-magic-numbers */
import { PubNubFunctionClient } from '../../../src/providers/PubNub/PubnubFunctionClient';
import type { AuthToken } from '../../../src/providers/PubNub/types';
import { getNow } from '../../../src/utils';

describe('PubNubFunctionClient', () => {
  let client: PubNubFunctionClient;
  let mockFetch: jest.Mock;
  const testEndpoint = 'https://test.example.com/auth';

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should use provided endpoint', () => {
      const customEndpoint = 'https://custom.example.com/auth';
      client = new PubNubFunctionClient(customEndpoint);
      expect(client).toBeInstanceOf(PubNubFunctionClient);
    });
  });

  describe('requestToken', () => {
    const userId = 'test-user-id';
    const validTokenResponse: AuthToken = {
      token: 'test-token',
      expiresAt: getNow() + 3600, // 1 hour from now
      refreshMargin: 60
    };

    test('should successfully request token with valid response', async () => {
      client = new PubNubFunctionClient(testEndpoint);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(validTokenResponse)
      });

      const result = await client.requestToken(userId);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(testEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      expect(result).toEqual(validTokenResponse);
    });

    test('should use custom endpoint when provided', async () => {
      const customEndpoint = 'https://custom.example.com/auth';
      client = new PubNubFunctionClient(customEndpoint);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(validTokenResponse)
      });

      await client.requestToken(userId);

      expect(mockFetch).toHaveBeenCalledWith(customEndpoint, expect.any(Object));
    });

    test('should throw error when response is not ok', async () => {
      client = new PubNubFunctionClient(testEndpoint);
      const errorText = 'Unauthorized';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: jest.fn().mockResolvedValueOnce(errorText)
      });

      await expect(client.requestToken(userId)).rejects.toThrow('Token request failed:');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should include error details in thrown error when response is not ok', async () => {
      client = new PubNubFunctionClient(testEndpoint);
      const errorText = 'Invalid credentials';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: jest.fn().mockResolvedValueOnce(errorText)
      });

      try {
        await client.requestToken(userId);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain('Token request failed:');
        expect(errorMessage).toContain(errorText);
        expect(errorMessage).toContain('403');
        expect(errorMessage).toContain('Forbidden');
        expect(errorMessage).toContain(userId);
      }
    });

    test('should handle error when response.text() fails', async () => {
      client = new PubNubFunctionClient(testEndpoint);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockRejectedValueOnce(new Error('Failed to read response'))
      });

      try {
        await client.requestToken(userId);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain('Token request failed:');
        expect(errorMessage).toContain('Unknown error');
        expect(errorMessage).toContain('500');
        expect(errorMessage).toContain('Internal Server Error');
        expect(errorMessage).toContain(userId);
      }
    });

    test('should throw error when token response is missing token field', async () => {
      client = new PubNubFunctionClient(testEndpoint);
      const invalidResponse = { expiresAt: getNow() + 3600 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(invalidResponse)
      });

      await expect(client.requestToken(userId)).rejects.toThrow('Invalid token response: missing required fields:');
    });

    test('should throw error when token response is missing expiresAt field', async () => {
      client = new PubNubFunctionClient(testEndpoint);
      const invalidResponse = { token: 'test-token' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(invalidResponse)
      });

      await expect(client.requestToken(userId)).rejects.toThrow('Invalid token response: missing required fields:');
    });

    test('should include response data and userId in error when fields are missing', async () => {
      client = new PubNubFunctionClient(testEndpoint);
      const invalidResponse = {
        token: 'test-token'
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(invalidResponse)
      });

      try {
        await client.requestToken(userId);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain('Invalid token response: missing required fields:');
        expect(errorMessage).toContain(userId);
        expect(errorMessage).toContain('test-token');
      }
    });

    test('should throw error when token is already expired', async () => {
      client = new PubNubFunctionClient(testEndpoint);
      const expiredTokenResponse: AuthToken = {
        token: 'expired-token',
        expiresAt: getNow() - 1, // 1 second ago
        refreshMargin: 60
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(expiredTokenResponse)
      });

      await expect(client.requestToken(userId)).rejects.toThrow('Invalid token response: token already expired:');
    });

    test('should throw error when token expiresAt equals current time', async () => {
      client = new PubNubFunctionClient(testEndpoint);
      const currentTime = getNow();
      const expiredTokenResponse: AuthToken = {
        token: 'expired-token',
        expiresAt: currentTime,
        refreshMargin: 60
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(expiredTokenResponse)
      });

      await expect(client.requestToken(userId)).rejects.toThrow('Invalid token response: token already expired:');
    });

    test('should include token details in error when token is expired', async () => {
      client = new PubNubFunctionClient(testEndpoint);
      const expiredTokenResponse: AuthToken = {
        token: 'expired-token',
        expiresAt: getNow() - 1,
        refreshMargin: 60
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(expiredTokenResponse)
      });

      try {
        await client.requestToken(userId);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain('Invalid token response: token already expired:');
        expect(errorMessage).toContain('expired-token');
        expect(errorMessage).toContain(userId);
      }
    });

    test('should accept token with future expiry time', async () => {
      client = new PubNubFunctionClient(testEndpoint);
      const futureExpiry = getNow() + 1; // 1 second in the future
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const validTokenResponse: AuthToken = {
        token: 'test-token',
        expiresAt: futureExpiry,
        refreshMargin: 60
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(validTokenResponse)
      });

      const result = await client.requestToken(userId);

      expect(result).toEqual(validTokenResponse);
      expect(result.expiresAt).toBe(futureExpiry);
    });

    test('should handle network errors', async () => {
      client = new PubNubFunctionClient(testEndpoint);
      const networkError = new Error('Network request failed');
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(client.requestToken(userId)).rejects.toThrow(networkError);
    });

    test('should handle JSON parsing errors', async () => {
      client = new PubNubFunctionClient(testEndpoint);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON'))
      });

      await expect(client.requestToken(userId)).rejects.toThrow('Invalid JSON');
    });
  });
});
