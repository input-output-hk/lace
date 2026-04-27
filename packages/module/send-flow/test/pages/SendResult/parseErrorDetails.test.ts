import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { parseErrorDetails } from '../../../src/pages/SendResult/parseErrorDetails';

import type { ErrorObject } from '@lace-lib/util-store';

describe('parseErrorDetails', () => {
  const mockLabels = {
    codeTitle: 'Error Code: ',
    timestampTitle: 'Timestamp: ',
    requestIdTitle: 'Request ID: ',
  };

  const defaultErrorMessage = 'Default error message';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:30:45.123Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('error code extraction', () => {
    it('extracts error code from code field', () => {
      const error: ErrorObject = {
        code: 'NETWORK_ERROR',
        message: 'Network error occurred',
      };

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result.errorCode).toBe('Error Code: NETWORK_ERROR');
    });

    it('falls back to name field when code is missing', () => {
      const error = {
        name: 'TypeError',
        message: 'Type error occurred',
      } as ErrorObject;

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result.errorCode).toBe('Error Code: TypeError');
    });

    it('uses UNKNOWN when both code and name are missing', () => {
      const error = {
        message: 'Some error',
      } as ErrorObject;

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result.errorCode).toBe('Error Code: UNKNOWN');
    });

    it('uses UNKNOWN when error is undefined', () => {
      const result = parseErrorDetails(
        undefined,
        defaultErrorMessage,
        mockLabels,
      );

      expect(result.errorCode).toBe('Error Code: UNKNOWN');
    });

    it('prefers code over name when both are present', () => {
      const error = {
        code: 'ERR_001',
        name: 'CustomError',
        message: 'Error message',
      } as ErrorObject;

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result.errorCode).toBe('Error Code: ERR_001');
    });
  });

  describe('error message extraction', () => {
    it('extracts error message from message field', () => {
      const error: ErrorObject = {
        code: 'ERR_001',
        message: 'Custom error message',
      };

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result.errorMessage).toBe('Custom error message');
    });

    it('uses default error message when message field is missing', () => {
      const error = {
        code: 'ERR_001',
      } as ErrorObject;

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result.errorMessage).toBe(defaultErrorMessage);
    });

    it('uses default error message when error is undefined', () => {
      const result = parseErrorDetails(
        undefined,
        defaultErrorMessage,
        mockLabels,
      );

      expect(result.errorMessage).toBe(defaultErrorMessage);
    });

    it('uses default error message when message is empty string', () => {
      const error: ErrorObject = {
        code: 'ERR_001',
        message: '',
      };

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result.errorMessage).toBe(defaultErrorMessage);
    });
  });

  describe('timestamp extraction', () => {
    it('extracts timestamp when provided as string', () => {
      const error = {
        code: 'ERR_001',
        message: 'Error',
        timestamp: '2024-01-01T12:00:00Z',
      } as ErrorObject;

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result.timestamp).toBe('Timestamp: 2024-01-01T12:00:00Z');
    });

    it('generates current timestamp when timestamp field is missing', () => {
      const error: ErrorObject = {
        code: 'ERR_001',
        message: 'Error',
      };

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      // Should generate timestamp in format: YYYY-MM-DD HH:MM:SS (without milliseconds)
      expect(result.timestamp).toBe('Timestamp: 2024-01-15 10:30:45');
    });

    it('generates current timestamp when error is undefined', () => {
      const result = parseErrorDetails(
        undefined,
        defaultErrorMessage,
        mockLabels,
      );

      expect(result.timestamp).toBe('Timestamp: 2024-01-15 10:30:45');
    });

    it('generates current timestamp when timestamp is not a string', () => {
      const error = {
        code: 'ERR_001',
        message: 'Error',
        timestamp: 1234567890,
      } as unknown as ErrorObject;

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result.timestamp).toBe('Timestamp: 2024-01-15 10:30:45');
    });

    it('formats generated timestamp without T separator and milliseconds', () => {
      const error: ErrorObject = {
        code: 'ERR_001',
        message: 'Error',
      };

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      // Should be in format: "Timestamp: YYYY-MM-DD HH:MM:SS" (with space instead of T, no milliseconds)
      expect(result.timestamp).toBe('Timestamp: 2024-01-15 10:30:45');
      expect(result.timestamp).toMatch(
        /Timestamp: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
      );
    });
  });

  describe('requestId extraction', () => {
    it('extracts requestId from requestId field', () => {
      const error = {
        code: 'ERR_001',
        message: 'Error',
        requestId: 'req-12345',
      } as ErrorObject & { requestId: string };

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result.requestId).toBe('Request ID: req-12345');
    });

    it('falls back to transactionId when requestId is missing', () => {
      const error = {
        code: 'ERR_001',
        message: 'Error',
        transactionId: 'txn-67890',
      } as ErrorObject & { transactionId: string };

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result.requestId).toBe('Request ID: txn-67890');
    });

    it('uses N/A when both requestId and transactionId are missing', () => {
      const error: ErrorObject = {
        code: 'ERR_001',
        message: 'Error',
      };

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result.requestId).toBe('Request ID: N/A');
    });

    it('uses N/A when error is undefined', () => {
      const result = parseErrorDetails(
        undefined,
        defaultErrorMessage,
        mockLabels,
      );

      expect(result.requestId).toBe('Request ID: N/A');
    });

    it('prefers requestId over transactionId when both are present', () => {
      const error = {
        code: 'ERR_001',
        message: 'Error',
        requestId: 'req-12345',
        transactionId: 'txn-67890',
      } as ErrorObject & { requestId: string; transactionId: string };

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result.requestId).toBe('Request ID: req-12345');
    });

    it('uses N/A when requestId is not a string', () => {
      const error = {
        code: 'ERR_001',
        message: 'Error',
        requestId: 12345,
      } as ErrorObject & { requestId: number };

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result.requestId).toBe('Request ID: N/A');
    });

    it('uses N/A when transactionId is not a string', () => {
      const error = {
        code: 'ERR_001',
        message: 'Error',
        transactionId: { id: 'txn-123' },
      } as ErrorObject & { transactionId: unknown };

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result.requestId).toBe('Request ID: N/A');
    });
  });

  describe('label concatenation', () => {
    it('concatenates labels with extracted values', () => {
      const error = {
        code: 'TEST_ERROR',
        message: 'Test message',
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'test-req-id',
      } as ErrorObject & { requestId: string };

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result.errorCode).toBe('Error Code: TEST_ERROR');
      expect(result.errorMessage).toBe('Test message');
      expect(result.timestamp).toBe('Timestamp: 2024-01-01T00:00:00Z');
      expect(result.requestId).toBe('Request ID: test-req-id');
    });

    it('works with different label formats', () => {
      const customLabels = {
        codeTitle: '[CODE] ',
        timestampTitle: '[TIME] ',
        requestIdTitle: '[REQ] ',
      };

      const error: ErrorObject = {
        code: 'ERR_001',
        message: 'Error',
      };

      const result = parseErrorDetails(
        error,
        defaultErrorMessage,
        customLabels,
      );

      expect(result.errorCode).toBe('[CODE] ERR_001');
      expect(result.timestamp).toContain('[TIME]');
      expect(result.requestId).toBe('[REQ] N/A');
    });

    it('works with empty label strings', () => {
      const emptyLabels = {
        codeTitle: '',
        timestampTitle: '',
        requestIdTitle: '',
      };

      const error: ErrorObject = {
        code: 'ERR_001',
        message: 'Error',
      };

      const result = parseErrorDetails(error, defaultErrorMessage, emptyLabels);

      expect(result.errorCode).toBe('ERR_001');
      expect(result.timestamp).toBe('2024-01-15 10:30:45');
      expect(result.requestId).toBe('N/A');
    });
  });

  describe('complete error objects', () => {
    it('handles a fully populated error object', () => {
      const error = {
        code: 'NETWORK_TIMEOUT',
        name: 'TimeoutError',
        message: 'Request timed out after 30 seconds',
        timestamp: '2024-01-01T15:30:00Z',
        requestId: 'req-abc123',
        transactionId: 'txn-xyz789',
      } as ErrorObject & { requestId: string; transactionId: string };

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result).toEqual({
        errorCode: 'Error Code: NETWORK_TIMEOUT',
        errorMessage: 'Request timed out after 30 seconds',
        timestamp: 'Timestamp: 2024-01-01T15:30:00Z',
        requestId: 'Request ID: req-abc123',
      });
    });

    it('handles a minimal error object', () => {
      const error = {} as ErrorObject;

      const result = parseErrorDetails(error, defaultErrorMessage, mockLabels);

      expect(result).toEqual({
        errorCode: 'Error Code: UNKNOWN',
        errorMessage: defaultErrorMessage,
        timestamp: 'Timestamp: 2024-01-15 10:30:45',
        requestId: 'Request ID: N/A',
      });
    });
  });
});
