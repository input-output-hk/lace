/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable no-magic-numbers */
import { TokenManager } from '../../../src/providers/PubNub/TokenManager';
import type { TokenAuthClient, AuthToken } from '../../../src/providers/PubNub/types';
import type { NotificationsStorage } from '../../../src/types';
import type { StorageKeys } from '../../../src/StorageKeys';
import { getNow } from '../../../src/utils';

const createValidToken = (additionalTimeS: number = 2 * 60 * 60): AuthToken => ({
  token: 'valid-token',
  expiresAt: getNow() + additionalTimeS,
  refreshMargin: 60
});

const createTokenResponse = (additionalTimeS: number = 2 * 60 * 60): AuthToken => ({
  token: 'new-token',
  expiresAt: getNow() + additionalTimeS,
  refreshMargin: 60
});

describe('TokenManager', () => {
  let mockAuthClient: jest.Mocked<TokenAuthClient>;
  let mockStorage: jest.Mocked<NotificationsStorage>;
  let mockStorageKeys: jest.Mocked<StorageKeys>;
  let tokenManager: TokenManager;
  const userId = 'test-user-id';
  const tokenKey = 'test:token';

  beforeEach(() => {
    mockAuthClient = {
      requestToken: jest.fn()
    };

    mockStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };

    mockStorageKeys = {
      getToken: jest.fn().mockReturnValue(tokenKey)
    } as unknown as jest.Mocked<StorageKeys>;

    tokenManager = new TokenManager(mockAuthClient, mockStorage, mockStorageKeys, userId);
  });

  describe('constructor', () => {
    test('should initialize with provided dependencies', () => {
      expect(tokenManager).toBeInstanceOf(TokenManager);
    });
  });

  describe('getValidToken', () => {
    test('should return stored token when it is valid and not expiring soon', async () => {
      const storedToken = createValidToken(2 * 60 * 60); // 2 hours from now
      mockStorage.getItem.mockResolvedValueOnce(storedToken);

      const result = await tokenManager.getValidToken();

      expect(result).toEqual(storedToken);
      expect(mockStorage.getItem).toHaveBeenCalledTimes(1);
      expect(mockStorage.getItem).toHaveBeenCalledWith(tokenKey);
      expect(mockAuthClient.requestToken).not.toHaveBeenCalled();
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    test('should refresh token when stored token is missing', async () => {
      mockStorage.getItem.mockResolvedValueOnce(undefined);
      const newTokenResponse = createTokenResponse();
      mockAuthClient.requestToken.mockResolvedValueOnce(newTokenResponse);
      mockStorage.setItem.mockResolvedValueOnce(undefined);

      const result = await tokenManager.getValidToken();

      expect(result).toEqual(newTokenResponse);
      expect(mockStorage.getItem).toHaveBeenCalledTimes(1);
      expect(mockAuthClient.requestToken).toHaveBeenCalledTimes(1);
      expect(mockAuthClient.requestToken).toHaveBeenCalledWith(userId);
      expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
      expect(mockStorage.setItem).toHaveBeenCalledWith(tokenKey, newTokenResponse);
    });

    test('should refresh token when stored token is expired', async () => {
      const expiredToken = createValidToken(-1); // 1 second ago
      mockStorage.getItem.mockResolvedValueOnce(expiredToken);
      const newTokenResponse = createTokenResponse();
      mockAuthClient.requestToken.mockResolvedValueOnce(newTokenResponse);
      mockStorage.setItem.mockResolvedValueOnce(undefined);

      const result = await tokenManager.getValidToken();

      expect(result).toEqual(newTokenResponse);
      expect(mockAuthClient.requestToken).toHaveBeenCalledTimes(1);
      expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
    });

    test('should refresh token when stored token is expiring soon (within refresh margin)', async () => {
      // Token expires in 30 seconds, which is less than the 1 minute refresh margin
      const expiringSoonToken = createValidToken(30);
      mockStorage.getItem.mockResolvedValueOnce(expiringSoonToken);
      const newTokenResponse = createTokenResponse();
      mockAuthClient.requestToken.mockResolvedValueOnce(newTokenResponse);
      mockStorage.setItem.mockResolvedValueOnce(undefined);

      const result = await tokenManager.getValidToken();

      expect(result).toEqual(newTokenResponse);
      expect(mockAuthClient.requestToken).toHaveBeenCalledTimes(1);
      expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
    });

    test('should accept token with time remaining just above refresh margin', async () => {
      // Token expires in 1 hour and 1 second (just above the 1 hour margin)
      const validToken = createValidToken(60 * 60 + 1);
      mockStorage.getItem.mockResolvedValueOnce(validToken);

      const result = await tokenManager.getValidToken();

      expect(result).toEqual(validToken);
      expect(mockAuthClient.requestToken).not.toHaveBeenCalled();
    });

    test('should deduplicate concurrent getValidToken calls', async () => {
      mockStorage.getItem.mockResolvedValueOnce(undefined);
      const newTokenResponse = createTokenResponse();

      // Create a promise that doesn't resolve immediately to ensure tokenRefreshPromise is set
      let resolveTokenRequest: (value: AuthToken) => void;
      const delayedTokenPromise = new Promise<AuthToken>((resolve) => {
        resolveTokenRequest = resolve;
      });
      mockAuthClient.requestToken.mockReturnValueOnce(delayedTokenPromise);
      mockStorage.setItem.mockResolvedValueOnce(undefined);

      // Make first call - this will set tokenRefreshPromise
      const promise1 = tokenManager.getValidToken();

      // Wait for the promise chain to progress
      await Promise.resolve();

      // Make concurrent calls - these should all wait for the same refresh
      const promise2 = tokenManager.getValidToken();
      const promise3 = tokenManager.getValidToken();

      // Resolve the token request
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      resolveTokenRequest!(newTokenResponse);

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      // All should return the same token
      expect(result1).toEqual(newTokenResponse);
      expect(result2).toEqual(newTokenResponse);
      expect(result3).toEqual(newTokenResponse);

      // But only one request should have been made
      expect(mockAuthClient.requestToken).toHaveBeenCalledTimes(1);
      expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
    });

    test('should return same promise when getValidToken is called twice during refresh', async () => {
      const newTokenResponse = createTokenResponse();

      // Create a delayed promise for getItem to ensure tokenRefreshPromise is set before second call
      let resolveGetItem: (value: AuthToken | undefined) => void;
      const delayedGetItemPromise = new Promise<AuthToken | undefined>((resolve) => {
        resolveGetItem = resolve;
      });
      mockStorage.getItem.mockReturnValueOnce(delayedGetItemPromise);

      // Create a promise that doesn't resolve immediately to ensure tokenRefreshPromise is set
      let resolveTokenRequest: (value: AuthToken) => void;
      const delayedTokenPromise = new Promise<AuthToken>((resolve) => {
        resolveTokenRequest = resolve;
      });
      mockAuthClient.requestToken.mockReturnValueOnce(delayedTokenPromise);
      mockStorage.setItem.mockResolvedValueOnce(undefined);

      // Make first call - this will wait for getItem and then set tokenRefreshPromise
      const promise1 = tokenManager.getValidToken();

      // Resolve getItem with undefined to trigger refresh
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      resolveGetItem!(undefined);

      // Wait for requestToken to be called (which means tokenRefreshPromise is set)
      const requestTokenCalledPromise = new Promise<void>((resolve) => {
        const originalRequestToken = mockAuthClient.requestToken;
        let callCount = 0;
        // eslint-disable-next-line @typescript-eslint/no-shadow
        mockAuthClient.requestToken = jest.fn().mockImplementation((userId: string) => {
          callCount++;
          const result = originalRequestToken(userId);
          if (callCount === 1) {
            // After requestToken is called, tokenRefreshPromise should be set
            resolve();
          }
          return result;
        }) as jest.MockedFunction<typeof originalRequestToken>;
      });

      await requestTokenCalledPromise;

      // Make second call while refresh is in progress - should return same promise
      // This should hit the branch at line 43: if (this.tokenRefreshPromise) return this.tokenRefreshPromise;
      const promise2 = tokenManager.getValidToken();

      // Verify that getItem was only called once (second call should skip it)
      expect(mockStorage.getItem).toHaveBeenCalledTimes(1);

      // Resolve the token request
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      resolveTokenRequest!(newTokenResponse);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should return the same token
      expect(result1).toEqual(newTokenResponse);
      expect(result2).toEqual(newTokenResponse);

      // But only one request should have been made
      expect(mockAuthClient.requestToken).toHaveBeenCalledTimes(1);
      expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
    });

    test('should handle errors during token refresh', async () => {
      mockStorage.getItem.mockResolvedValueOnce(undefined);
      const authError = new Error('Authentication failed');
      mockAuthClient.requestToken.mockRejectedValueOnce(authError);

      await expect(tokenManager.getValidToken()).rejects.toThrow('Authentication failed');
      expect(mockAuthClient.requestToken).toHaveBeenCalledTimes(1);
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    test('should handle errors during storage write', async () => {
      mockStorage.getItem.mockResolvedValueOnce(undefined);
      const newTokenResponse = createTokenResponse();
      mockAuthClient.requestToken.mockResolvedValueOnce(newTokenResponse);
      const storageError = new Error('Storage write failed');
      mockStorage.setItem.mockRejectedValueOnce(storageError);

      await expect(tokenManager.getValidToken()).rejects.toThrow('Storage write failed');
      expect(mockAuthClient.requestToken).toHaveBeenCalledTimes(1);
      expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
    });

    test('should handle errors during storage read', async () => {
      const storageError = new Error('Storage read failed');
      mockStorage.getItem.mockRejectedValueOnce(storageError);

      await expect(tokenManager.getValidToken()).rejects.toThrow('Storage read failed');
    });

    test('should clear refresh promise after successful refresh', async () => {
      mockStorage.getItem.mockResolvedValueOnce(undefined);
      const newTokenResponse = createTokenResponse();
      mockAuthClient.requestToken.mockResolvedValueOnce(newTokenResponse);
      mockStorage.setItem.mockResolvedValueOnce(undefined);

      await tokenManager.getValidToken();

      // Make another call - should trigger a new refresh since promise was cleared
      mockStorage.getItem.mockResolvedValueOnce(undefined);
      const secondTokenResponse = createTokenResponse(3 * 60 * 60);
      mockAuthClient.requestToken.mockResolvedValueOnce(secondTokenResponse);
      mockStorage.setItem.mockResolvedValueOnce(undefined);

      await tokenManager.getValidToken();

      expect(mockAuthClient.requestToken).toHaveBeenCalledTimes(2);
    });

    test('should clear refresh promise after failed refresh', async () => {
      mockStorage.getItem.mockResolvedValueOnce(undefined);
      const authError = new Error('Authentication failed');
      mockAuthClient.requestToken.mockRejectedValueOnce(authError);

      await expect(tokenManager.getValidToken()).rejects.toThrow('Authentication failed');

      // Make another call - should trigger a new refresh attempt
      mockStorage.getItem.mockResolvedValueOnce(undefined);
      const newTokenResponse = createTokenResponse();
      mockAuthClient.requestToken.mockResolvedValueOnce(newTokenResponse);
      mockStorage.setItem.mockResolvedValueOnce(undefined);

      await tokenManager.getValidToken();

      expect(mockAuthClient.requestToken).toHaveBeenCalledTimes(2);
    });

    test('should store token correctly after refresh', async () => {
      mockStorage.getItem.mockResolvedValueOnce(undefined);
      const newTokenResponse: AuthToken = {
        token: 'stored-token',
        expiresAt: getNow() + 3600,
        refreshMargin: 60
      };
      mockAuthClient.requestToken.mockResolvedValueOnce(newTokenResponse);
      mockStorage.setItem.mockResolvedValueOnce(undefined);

      await tokenManager.getValidToken();

      expect(mockStorage.setItem).toHaveBeenCalledWith(tokenKey, newTokenResponse);
    });
  });

  describe('performTokenRefresh', () => {
    test('should throw error when userId is empty string', async () => {
      const emptyUserIdManager = new TokenManager(mockAuthClient, mockStorage, mockStorageKeys, '');
      mockStorage.getItem.mockResolvedValueOnce(undefined);

      await expect(emptyUserIdManager.getValidToken()).rejects.toThrow('User ID is not set');
    });

    test('should throw error when userId is not set (falsy)', async () => {
      // Using 'as any' to test edge case with falsy userId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const falsyUserIdManager = new TokenManager(mockAuthClient, mockStorage, mockStorageKeys, '' as any);
      mockStorage.getItem.mockResolvedValueOnce(undefined);

      await expect(falsyUserIdManager.getValidToken()).rejects.toThrow('User ID is not set');
    });
  });

  describe('integration', () => {
    test('should handle full token lifecycle: missing -> refresh -> valid -> reuse', async () => {
      // First call: token missing, should refresh
      mockStorage.getItem.mockResolvedValueOnce(undefined);
      const firstTokenResponse = createTokenResponse();
      mockAuthClient.requestToken.mockResolvedValueOnce(firstTokenResponse);
      mockStorage.setItem.mockResolvedValueOnce(undefined);

      const firstResult = await tokenManager.getValidToken();
      expect(firstResult).toEqual(firstTokenResponse);
      expect(mockAuthClient.requestToken).toHaveBeenCalledTimes(1);

      // Second call: token exists and is valid, should reuse
      const storedToken = createValidToken(2 * 60 * 60);
      mockStorage.getItem.mockResolvedValueOnce(storedToken);

      const secondResult = await tokenManager.getValidToken();
      expect(secondResult).toEqual(storedToken);
      expect(mockAuthClient.requestToken).toHaveBeenCalledTimes(1); // Still 1, no new request

      // Third call: token expired, should refresh again
      mockStorage.getItem.mockResolvedValueOnce(undefined);
      const secondTokenResponse = createTokenResponse(3 * 60 * 60);
      mockAuthClient.requestToken.mockResolvedValueOnce(secondTokenResponse);
      mockStorage.setItem.mockResolvedValueOnce(undefined);

      const thirdResult = await tokenManager.getValidToken();
      expect(thirdResult).toEqual(secondTokenResponse);
      expect(mockAuthClient.requestToken).toHaveBeenCalledTimes(2);
    });
  });
});
