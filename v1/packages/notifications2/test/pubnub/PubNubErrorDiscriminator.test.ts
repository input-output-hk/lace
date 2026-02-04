/* eslint-disable no-magic-numbers */
import { PubNubErrorDiscriminator } from '../../src/PubNubProviders/PubNubErrorDiscriminator';
import { AuthError, NetworkError, UnknownError } from '../../src/errors';

describe('PubNubErrorDiscriminator', () => {
  let discriminator: PubNubErrorDiscriminator;

  beforeEach(() => {
    discriminator = new PubNubErrorDiscriminator();
  });

  describe('throwForStatus - Network Errors', () => {
    it.each([
      {
        category: 'PNNetworkIssuesCategory',
        message: 'Network connection failed',
        description: 'PNNetworkIssuesCategory'
      },
      {
        category: 'PNTimeoutCategory',
        message: 'Request timed out',
        description: 'PNTimeoutCategory'
      },
      {
        category: 'PNCancelledCategory',
        message: 'Request was cancelled',
        description: 'PNCancelledCategory'
      },
      {
        category: 'PNServerErrorCategory',
        message: 'Server error occurred',
        description: 'PNServerErrorCategory'
      }
    ])('should throw NetworkError for $description', async ({ category, message }) => {
      const error = {
        status: {
          category,
          errorData: { message }
        }
      };

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(NetworkError);
      await expect(discriminator.throwForStatus(error)).rejects.toThrow(message);
    });
  });

  describe('throwForStatus - Auth Errors', () => {
    it.each([
      {
        category: 'PNAccessDeniedCategory',
        message: 'Access denied',
        description: 'PNAccessDeniedCategory'
      }
    ])('should throw AuthError for $description', async ({ category, message }) => {
      const error = {
        status: {
          category,
          errorData: { message }
        }
      };

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(AuthError);
      await expect(discriminator.throwForStatus(error)).rejects.toThrow(message);

      try {
        await discriminator.throwForStatus(error);
      } catch (caughtError) {
        expect(caughtError).toBeInstanceOf(AuthError);
        if (caughtError instanceof AuthError) {
          expect(caughtError.statusCode).toBe(403);
        }
      }
    });
  });

  describe('throwForStatus - Unknown Errors', () => {
    it.each([
      {
        category: 'PNBadRequestCategory',
        message: 'Bad request',
        description: 'PNBadRequestCategory'
      },
      {
        category: 'PNValidationErrorCategory',
        message: 'Validation failed',
        description: 'PNValidationErrorCategory'
      },
      {
        category: 'PNMalformedResponseCategory',
        message: 'Response is malformed',
        description: 'PNMalformedResponseCategory'
      },
      {
        category: 'PNUnknownCategory',
        message: 'Unknown error occurred',
        description: 'PNUnknownCategory'
      }
    ])('should throw UnknownError for $description', async ({ category, message }) => {
      const error = {
        status: {
          category,
          errorData: { message }
        }
      };

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(UnknownError);
      await expect(discriminator.throwForStatus(error)).rejects.toThrow(message);
    });
  });

  describe('throwForStatus - Network Error Patterns (fallback)', () => {
    it.each([
      {
        message: 'network connection failed',
        description: 'network keyword'
      },
      {
        message: 'request timeout exceeded',
        description: 'timeout keyword'
      },
      {
        message: 'fetch failed to complete',
        description: 'fetch failed keyword'
      },
      {
        message: 'error: ECONNREFUSED',
        description: 'ECONNREFUSED keyword'
      },
      {
        message: 'error: ENOTFOUND',
        description: 'ENOTFOUND keyword'
      },
      {
        message: 'connection refused by server',
        description: 'connection keyword'
      }
    ])('should throw NetworkError for error message with $description', async ({ message }) => {
      const error = new Error(message);

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(NetworkError);
      await expect(discriminator.throwForStatus(error)).rejects.toThrow(message);
    });
  });

  describe('throwForStatus - Edge Cases', () => {
    it('should throw UnknownError for Error instance without network pattern', async () => {
      const error = new Error('Something went wrong');

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(UnknownError);
      await expect(discriminator.throwForStatus(error)).rejects.toThrow('Something went wrong');
    });

    it('should throw UnknownError for string error', async () => {
      const error = 'Plain string error';

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(UnknownError);
      await expect(discriminator.throwForStatus(error)).rejects.toThrow('Plain string error');
    });

    it('should throw UnknownError for null', async () => {
      // eslint-disable-next-line unicorn/no-null
      await expect(discriminator.throwForStatus(null)).rejects.toThrow(UnknownError);
    });

    it('should throw UnknownError for undefined', async () => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      await expect(discriminator.throwForStatus(undefined)).rejects.toThrow(UnknownError);
    });

    it('should throw UnknownError for object without status', async () => {
      const error = { message: 'No status field' };

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(UnknownError);
    });

    it('should throw UnknownError for object with invalid status structure', async () => {
      const error = {
        status: 'not an object'
      };

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(UnknownError);
    });

    it('should throw UnknownError for status without category', async () => {
      const error = {
        status: {
          errorData: { message: 'No category field' }
        }
      };

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(UnknownError);
    });

    it('should throw UnknownError for unrecognized PubNub category', async () => {
      const error = {
        status: {
          category: 'PNUnrecognizedCategory',
          errorData: { message: 'Unrecognized category' }
        }
      };

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(UnknownError);
    });
  });

  describe('throwForStatus - Error Message Extraction', () => {
    it('should extract message from Error instance when no errorData', async () => {
      const error = new Error('Custom error message');

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(UnknownError);
      await expect(discriminator.throwForStatus(error)).rejects.toThrow('Custom error message');
    });

    it('should extract message from errorData object with message property', async () => {
      const error = {
        status: {
          category: 'PNBadRequestCategory',
          errorData: { message: 'Bad request from errorData' }
        }
      };

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(UnknownError);
      await expect(discriminator.throwForStatus(error)).rejects.toThrow('Bad request from errorData');
    });

    it('should extract message from errorData Error instance', async () => {
      const fetchError = new Error('getaddrinfo ENOTFOUND example.com');
      const error = {
        status: {
          category: 'PNNetworkIssuesCategory',
          errorData: fetchError
        }
      };

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(NetworkError);
      await expect(discriminator.throwForStatus(error)).rejects.toThrow('getaddrinfo ENOTFOUND example.com');
    });

    it('should handle errorData as string', async () => {
      const error = {
        status: {
          category: 'PNNetworkIssuesCategory',
          errorData: 'Network failure string'
        }
      };

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(NetworkError);
      await expect(discriminator.throwForStatus(error)).rejects.toThrow('Network failure string');
    });

    it('should handle non-Error objects without errorData', async () => {
      const error = {
        status: {
          category: 'PNNetworkIssuesCategory'
        },
        toString: () => 'Network issue object'
      };

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(NetworkError);
      await expect(discriminator.throwForStatus(error)).rejects.toThrow('Network issue object');
    });

    it('should use fallback pattern matching when errorData has network keywords', async () => {
      const error = {
        status: {
          errorData: new Error('fetch failed: ENOTFOUND')
        }
      };

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(NetworkError);
      await expect(discriminator.throwForStatus(error)).rejects.toThrow('fetch failed: ENOTFOUND');
    });
  });

  describe('throwForStatus - Case Insensitivity', () => {
    it.each([
      {
        message: 'NETWORK ERROR',
        description: 'uppercase NETWORK'
      },
      {
        message: 'Timeout Error',
        description: 'mixed case Timeout'
      },
      {
        message: 'Fetch Failed',
        description: 'title case Fetch Failed'
      },
      {
        message: 'Connection Lost',
        description: 'title case Connection'
      }
    ])('should match network pattern case-insensitively for $description', async ({ message }) => {
      const error = new Error(message);

      await expect(discriminator.throwForStatus(error)).rejects.toThrow(NetworkError);
    });
  });
});
