/* eslint-disable no-magic-numbers */
import { firstValueFrom, of } from 'rxjs';
import { PubNubAuthProvider } from '../../src/PubNubProviders/PubNubAuthProvider';
import { ErrorDiscriminator } from '../../src/errors';
import { AuthToken, StorageAdapter } from '../../src/types';
import { PubNubAuthConfig } from '../../src/PubNubProviders/types';
import { StorageKeys } from '../../src/StorageKeys';

describe('PubNubAuthProvider', () => {
  let mockErrorDiscriminator: jest.Mocked<ErrorDiscriminator<Response>>;
  let mockFetch: jest.SpyInstance;
  let mockStorage: jest.Mocked<StorageAdapter>;
  let mockStorageKeys: jest.Mocked<StorageKeys>;
  let config: PubNubAuthConfig;

  beforeEach(() => {
    // Mock error discriminator
    mockErrorDiscriminator = {
      throwForStatus: jest.fn()
    };

    // Mock global fetch using jest.spyOn
    mockFetch = jest.spyOn(global, 'fetch').mockImplementation();

    // Mock storage adapter
    mockStorage = {
      getItem: jest.fn().mockReturnValue(of(void 0)),
      setItem: jest.fn().mockReturnValue(of(void 0)),
      removeItem: jest.fn().mockReturnValue(of(void 0))
    };

    // Mock storage keys
    mockStorageKeys = {
      getToken: jest.fn().mockReturnValue('notifications:token')
    } as unknown as jest.Mocked<StorageKeys>;

    // Test configuration
    config = {
      userId: 'test-user-id',
      tokenEndpoint: 'https://api.example.com/token',
      storage: mockStorage,
      storageKeys: mockStorageKeys
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getToken', () => {
    it('should return AuthToken from successful response', async () => {
      // Mock API response (expiresAt in seconds)
      const mockApiResponse = {
        token: 'test-token-12345',
        expiresAt: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour (seconds)
        refreshMargin: 60_000
      };

      // Expected result after conversion (expiresAt in milliseconds)
      const expectedAuthToken: AuthToken = {
        token: 'test-token-12345',
        expiresAt: mockApiResponse.expiresAt * 1000, // Converted to milliseconds
        refreshMargin: 60_000
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse)
      };

      mockFetch.mockResolvedValue(mockResponse);

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);
      const result = await firstValueFrom(provider.getToken());

      expect(result).toEqual(expectedAuthToken);

      // Verify fetch was called correctly
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: 'test-user-id' })
      });

      // Verify discriminator was not called for successful response
      expect(mockErrorDiscriminator.throwForStatus).not.toHaveBeenCalled();
    });

    it('should use error discriminator when fetch fails', async () => {
      const mockError = new Error('Auth failed');
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      };

      mockFetch.mockResolvedValue(mockResponse);
      mockErrorDiscriminator.throwForStatus.mockRejectedValue(mockError);

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);

      await expect(firstValueFrom(provider.getToken())).rejects.toThrow('Auth failed');

      // Verify discriminator was called with the response
      expect(mockErrorDiscriminator.throwForStatus).toHaveBeenCalledWith({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });
    });

    it('should use default error discriminator when none provided', async () => {
      // Mock API response (expiresAt in seconds)
      const mockApiResponse = {
        token: 'default-discriminator-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        refreshMargin: 60_000
      };

      // Expected result after conversion (expiresAt in milliseconds)
      const expectedAuthToken: AuthToken = {
        token: 'default-discriminator-token',
        expiresAt: mockApiResponse.expiresAt * 1000,
        refreshMargin: 60_000
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse)
      };

      mockFetch.mockResolvedValue(mockResponse);

      const provider = new PubNubAuthProvider(config); // No discriminator
      const result = await firstValueFrom(provider.getToken());

      expect(result).toEqual(expectedAuthToken);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle network errors during fetch', async () => {
      const networkError = new Error('Network failure');
      mockFetch.mockRejectedValue(networkError);

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);

      await expect(firstValueFrom(provider.getToken())).rejects.toThrow('Network failure');

      expect(mockErrorDiscriminator.throwForStatus).not.toHaveBeenCalled();
    });

    it('should handle multiple status codes via discriminator', async () => {
      const mockError = new Error('Forbidden');
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      };

      mockFetch.mockResolvedValue(mockResponse);
      mockErrorDiscriminator.throwForStatus.mockRejectedValue(mockError);

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);

      await expect(firstValueFrom(provider.getToken())).rejects.toThrow('Forbidden');

      expect(mockErrorDiscriminator.throwForStatus).toHaveBeenCalledWith({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      });
    });

    it('should pass correct request body with userId', async () => {
      const customConfig: PubNubAuthConfig = {
        userId: 'custom-user-123',
        tokenEndpoint: 'https://custom.api.com/auth',
        storage: mockStorage,
        storageKeys: mockStorageKeys
      };

      // Mock API response (expiresAt in seconds)
      const mockApiResponse = {
        token: 'custom-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        refreshMargin: 60_000
      };

      // Expected result after conversion (expiresAt in milliseconds)
      const expectedAuthToken: AuthToken = {
        token: 'custom-token',
        expiresAt: mockApiResponse.expiresAt * 1000,
        refreshMargin: 60_000
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse)
      };

      mockFetch.mockResolvedValue(mockResponse);

      const provider = new PubNubAuthProvider(customConfig, mockErrorDiscriminator);
      const result = await firstValueFrom(provider.getToken());

      expect(result).toEqual(expectedAuthToken);

      expect(mockFetch).toHaveBeenCalledWith('https://custom.api.com/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: 'custom-user-123' })
      });
    });

    it('should use default refreshMargin when not provided in response', async () => {
      // Mock API response without refreshMargin (expiresAt in seconds)
      const mockApiResponse = {
        token: 'test-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600
        // no refreshMargin
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse)
      };

      mockFetch.mockResolvedValue(mockResponse);

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);
      const result = await firstValueFrom(provider.getToken());

      expect(result.refreshMargin).toBe(60_000); // 1 minute default
    });

    it('should cache token in storage after successful fetch', async () => {
      // Mock API response (expiresAt in seconds)
      const mockApiResponse = {
        token: 'cached-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        refreshMargin: 60_000
      };

      // Expected result after conversion (expiresAt in milliseconds)
      const expectedAuthToken: AuthToken = {
        token: 'cached-token',
        expiresAt: mockApiResponse.expiresAt * 1000,
        refreshMargin: 60_000
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse)
      };

      mockFetch.mockResolvedValue(mockResponse);

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);
      const result = await firstValueFrom(provider.getToken());

      expect(result).toEqual(expectedAuthToken);

      // Verify token was saved to storage (with expiresAt in milliseconds)
      expect(mockStorage.setItem).toHaveBeenCalledWith('notifications:token', expectedAuthToken);
    });

    it('should throw UnknownError when token field is missing', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          expiresAt: Date.now() + 3_600_000
          // missing token
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);

      await expect(firstValueFrom(provider.getToken())).rejects.toThrow(
        'Invalid token response: missing or invalid token field'
      );
    });

    it('should throw UnknownError when expiresAt field is missing', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          token: 'test-token'
          // missing expiresAt
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);

      await expect(firstValueFrom(provider.getToken())).rejects.toThrow(
        'Invalid token response: missing or invalid expiresAt field'
      );
    });
  });

  describe('Token Caching', () => {
    it('should use in-memory cached token on second call', async () => {
      // Mock API response (expiresAt in seconds)
      const mockApiResponse = {
        token: 'cached-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        refreshMargin: 60_000
      };

      // Expected result after conversion (expiresAt in milliseconds)
      const expectedAuthToken: AuthToken = {
        token: 'cached-token',
        expiresAt: mockApiResponse.expiresAt * 1000,
        refreshMargin: 60_000
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse)
      };

      mockFetch.mockResolvedValue(mockResponse);

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);

      // First call - fetches from endpoint
      const result1 = await firstValueFrom(provider.getToken());
      expect(result1).toEqual(expectedAuthToken);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - uses in-memory cache
      const result2 = await firstValueFrom(provider.getToken());
      expect(result2).toEqual(expectedAuthToken);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should load token from storage if in-memory cache is empty', async () => {
      // Stored token from storage (already has expiresAt in milliseconds)
      const storedToken: AuthToken = {
        token: 'stored-token',
        expiresAt: Date.now() + 3_600_000,
        refreshMargin: 60_000
      };

      // Mock storage to return a valid token
      mockStorage.getItem.mockReturnValue(of(storedToken));

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);
      const result = await firstValueFrom(provider.getToken());

      expect(result).toEqual(storedToken);
      expect(mockStorage.getItem).toHaveBeenCalledWith('notifications:token');
      expect(mockFetch).not.toHaveBeenCalled(); // Should not fetch if storage has valid token
    });

    it('should fetch new token when cached token is expiring soon', async () => {
      // Expired token from storage (expiresAt in milliseconds)
      const expiredToken: AuthToken = {
        token: 'expired-token',
        expiresAt: Date.now() + 30_000, // Expires in 30 seconds
        refreshMargin: 60_000 // But refresh margin is 60 seconds
      };

      // Mock API response for new token (expiresAt in seconds)
      const mockApiResponse = {
        token: 'new-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        refreshMargin: 60_000
      };

      // Expected result after conversion (expiresAt in milliseconds)
      const expectedNewToken: AuthToken = {
        token: 'new-token',
        expiresAt: mockApiResponse.expiresAt * 1000,
        refreshMargin: 60_000
      };

      // Mock storage to return expiring token
      mockStorage.getItem.mockReturnValue(of(expiredToken));

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse)
      };
      mockFetch.mockResolvedValue(mockResponse);

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);
      const result = await firstValueFrom(provider.getToken());

      expect(result).toEqual(expectedNewToken);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Should fetch new token
    });

    it('should bypass cache when forceRefresh is true', async () => {
      // First API response (expiresAt in seconds)
      const mockApiResponse1 = {
        token: 'cached-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        refreshMargin: 60_000
      };

      // Second API response (expiresAt in seconds)
      const mockApiResponse2 = {
        token: 'new-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        refreshMargin: 60_000
      };

      // Expected results after conversion
      const expectedToken1: AuthToken = {
        token: 'cached-token',
        expiresAt: mockApiResponse1.expiresAt * 1000,
        refreshMargin: 60_000
      };

      const expectedToken2: AuthToken = {
        token: 'new-token',
        expiresAt: mockApiResponse2.expiresAt * 1000,
        refreshMargin: 60_000
      };

      const mockResponse1 = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse1)
      };
      const mockResponse2 = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse2)
      };

      mockFetch.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);

      // First call - fetches and caches
      const result1 = await firstValueFrom(provider.getToken());
      expect(result1).toEqual(expectedToken1);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call with forceRefresh - bypasses cache
      const result2 = await firstValueFrom(provider.getToken(true));
      expect(result2).toEqual(expectedToken2);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Fetched again
    });

    it('should fetch new token when storage has no token', async () => {
      // Mock API response (expiresAt in seconds)
      const mockApiResponse = {
        token: 'new-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        refreshMargin: 60_000
      };

      // Expected result after conversion
      const expectedToken: AuthToken = {
        token: 'new-token',
        expiresAt: mockApiResponse.expiresAt * 1000,
        refreshMargin: 60_000
      };

      // Mock storage to return nothing
      mockStorage.getItem.mockReturnValue(of(void 0));

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse)
      };
      mockFetch.mockResolvedValue(mockResponse);

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);
      const result = await firstValueFrom(provider.getToken());

      expect(result).toEqual(expectedToken);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Token Validation', () => {
    it('should consider token valid when expiry is beyond refresh margin', async () => {
      const validToken: AuthToken = {
        token: 'valid-token',
        expiresAt: Date.now() + 300_000, // 5 minutes from now
        refreshMargin: 60_000 // 1 minute margin
      };

      mockStorage.getItem.mockReturnValue(of(validToken));

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);
      const result = await firstValueFrom(provider.getToken());

      expect(result).toEqual(validToken);
      expect(mockFetch).not.toHaveBeenCalled(); // Should use cached token
    });

    it('should consider token invalid when expiry is within refresh margin', async () => {
      // Stored token (expiresAt in milliseconds)
      const expiringToken: AuthToken = {
        token: 'expiring-token',
        expiresAt: Date.now() + 30_000, // 30 seconds from now
        refreshMargin: 60_000 // 1 minute margin - token is within margin!
      };

      // Mock API response for new token (expiresAt in seconds)
      const mockApiResponse = {
        token: 'new-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        refreshMargin: 60_000
      };

      // Expected result after conversion
      const expectedNewToken: AuthToken = {
        token: 'new-token',
        expiresAt: mockApiResponse.expiresAt * 1000,
        refreshMargin: 60_000
      };

      mockStorage.getItem.mockReturnValue(of(expiringToken));

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse)
      };
      mockFetch.mockResolvedValue(mockResponse);

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);
      const result = await firstValueFrom(provider.getToken());

      expect(result).toEqual(expectedNewToken);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Should fetch new token
    });

    it('should consider expired token invalid', async () => {
      // Stored expired token (expiresAt in milliseconds)
      const expiredToken: AuthToken = {
        token: 'expired-token',
        expiresAt: Date.now() - 1000, // Already expired
        refreshMargin: 60_000
      };

      // Mock API response for new token (expiresAt in seconds)
      const mockApiResponse = {
        token: 'new-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        refreshMargin: 60_000
      };

      // Expected result after conversion
      const expectedNewToken: AuthToken = {
        token: 'new-token',
        expiresAt: mockApiResponse.expiresAt * 1000,
        refreshMargin: 60_000
      };

      mockStorage.getItem.mockReturnValue(of(expiredToken));

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse)
      };
      mockFetch.mockResolvedValue(mockResponse);

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);
      const result = await firstValueFrom(provider.getToken());

      expect(result).toEqual(expectedNewToken);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Should fetch new token
    });
  });

  describe('clearToken', () => {
    it('should clear in-memory cache', async () => {
      // Mock API response (expiresAt in seconds)
      const mockApiResponse = {
        token: 'cached-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        refreshMargin: 60_000
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse)
      };

      mockFetch.mockResolvedValue(mockResponse);

      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);

      // Fetch and cache token
      await firstValueFrom(provider.getToken());
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Clear cache
      await firstValueFrom(provider.clearToken());

      // Next call should fetch again
      await firstValueFrom(provider.getToken());
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should remove token from storage', async () => {
      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);

      await firstValueFrom(provider.clearToken());

      expect(mockStorage.removeItem).toHaveBeenCalledWith('notifications:token');
    });

    it('should complete successfully when clearing empty cache', async () => {
      const provider = new PubNubAuthProvider(config, mockErrorDiscriminator);

      // Clear without fetching first
      await expect(firstValueFrom(provider.clearToken())).resolves.toBeUndefined();

      expect(mockStorage.removeItem).toHaveBeenCalledWith('notifications:token');
    });
  });
});
