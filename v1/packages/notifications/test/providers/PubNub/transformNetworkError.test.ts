/* eslint-disable no-magic-numbers */
import { isPubNubNetworkError, withNetworkErrorHandling } from '../../../src/providers/PubNub/transformNetworkError';

/**
 * Creates a mock PubNubError with the given category.
 */
const createMockPubNubError = (category: string): unknown => ({
  name: 'PubNubError',
  message: 'REST API request processing error, check status for details',
  status: {
    category,
    operation: 'PNFetchMessagesOperation',
    statusCode: 0
  }
});

describe('transformNetworkError', () => {
  describe('isPubNubNetworkError', () => {
    it('should return true for PNTimeoutCategory', () => {
      const error = createMockPubNubError('PNTimeoutCategory');
      expect(isPubNubNetworkError(error)).toBe(true);
    });

    it('should return true for PNNetworkIssuesCategory', () => {
      const error = createMockPubNubError('PNNetworkIssuesCategory');
      expect(isPubNubNetworkError(error)).toBe(true);
    });

    it('should return true for PNNetworkDownCategory', () => {
      const error = createMockPubNubError('PNNetworkDownCategory');
      expect(isPubNubNetworkError(error)).toBe(true);
    });

    it('should return false for non-network PubNub error categories', () => {
      const error = createMockPubNubError('PNBadRequestCategory');
      expect(isPubNubNetworkError(error)).toBe(false);
    });

    it('should return false for error without status', () => {
      const error = { name: 'PubNubError', message: 'Some error' };
      expect(isPubNubNetworkError(error)).toBe(false);
    });

    it('should return false for error without category', () => {
      const error = { name: 'PubNubError', status: { operation: 'PNFetchMessagesOperation' } };
      expect(isPubNubNetworkError(error)).toBe(false);
    });

    it('should return false for non-PubNub errors', () => {
      const error = new Error('Some error');
      expect(isPubNubNetworkError(error)).toBe(false);
    });

    it('should return false for null', () => {
      // eslint-disable-next-line unicorn/no-null
      expect(isPubNubNetworkError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      expect(isPubNubNetworkError(undefined)).toBe(false);
    });
  });

  describe('withNetworkErrorHandling', () => {
    it('should return result for successful operation', async () => {
      const result = { data: 'test' };
      const operation = jest.fn().mockResolvedValue(result);

      const output = await withNetworkErrorHandling(operation);

      expect(output).toBe(result);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should convert PNTimeoutCategory error to TypeError', async () => {
      const pubnubError = createMockPubNubError('PNTimeoutCategory');
      const operation = jest.fn().mockRejectedValue(pubnubError);

      await expect(withNetworkErrorHandling(operation)).rejects.toThrow(TypeError);
      await expect(withNetworkErrorHandling(operation)).rejects.toThrow('Failed to fetch');
    });

    it('should convert PNNetworkIssuesCategory error to TypeError', async () => {
      const pubnubError = createMockPubNubError('PNNetworkIssuesCategory');
      const operation = jest.fn().mockRejectedValue(pubnubError);

      await expect(withNetworkErrorHandling(operation)).rejects.toThrow(TypeError);
      await expect(withNetworkErrorHandling(operation)).rejects.toThrow('Failed to fetch');
    });

    it('should convert PNNetworkDownCategory error to TypeError', async () => {
      const pubnubError = createMockPubNubError('PNNetworkDownCategory');
      const operation = jest.fn().mockRejectedValue(pubnubError);

      await expect(withNetworkErrorHandling(operation)).rejects.toThrow(TypeError);
      await expect(withNetworkErrorHandling(operation)).rejects.toThrow('Failed to fetch');
    });

    it('should re-throw non-network PubNubError as-is', async () => {
      const pubnubError = createMockPubNubError('PNBadRequestCategory');
      const operation = jest.fn().mockRejectedValue(pubnubError);

      await expect(withNetworkErrorHandling(operation)).rejects.toBe(pubnubError);
    });

    it('should re-throw non-PubNubError as-is', async () => {
      const error = new Error('Some other error');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(withNetworkErrorHandling(operation)).rejects.toBe(error);
    });

    it('should re-throw TypeError as-is', async () => {
      const error = new TypeError('Some type error');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(withNetworkErrorHandling(operation)).rejects.toBe(error);
    });

    it('should preserve error stack for non-network errors', async () => {
      const error = new Error('Some error');
      error.stack = 'Error: Some error\n    at test.js:1:1';
      const operation = jest.fn().mockRejectedValue(error);

      try {
        await withNetworkErrorHandling(operation);
        fail('Should have thrown');
      } catch (thrownError) {
        expect(thrownError).toBe(error);
        expect((thrownError as Error).stack).toBe(error.stack);
      }
    });

    it('should work with async operations that return promises', async () => {
      const result = Promise.resolve({ data: 'async result' });
      const operation = jest.fn().mockReturnValue(result);

      const output = await withNetworkErrorHandling(operation);

      expect(output).toEqual({ data: 'async result' });
    });
  });
});
