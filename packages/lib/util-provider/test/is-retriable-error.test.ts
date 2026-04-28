import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { isRetriableError } from '../src/is-retriable-error';

describe('isRetriableError', () => {
  describe('retriable error types', () => {
    it('returns true for ConnectionFailure', () => {
      const error = new ProviderError(ProviderFailure.ConnectionFailure);
      expect(isRetriableError(error)).toBe(true);
    });

    it('returns true for ServerUnavailable', () => {
      const error = new ProviderError(ProviderFailure.ServerUnavailable);
      expect(isRetriableError(error)).toBe(true);
    });

    it('returns true for Unhealthy', () => {
      const error = new ProviderError(ProviderFailure.Unhealthy);
      expect(isRetriableError(error)).toBe(true);
    });

    it('returns true for Unknown', () => {
      const error = new ProviderError(ProviderFailure.Unknown);
      expect(isRetriableError(error)).toBe(true);
    });
  });

  describe('non-retriable error types', () => {
    it('returns false for BadRequest', () => {
      const error = new ProviderError(ProviderFailure.BadRequest);
      expect(isRetriableError(error)).toBe(false);
    });

    it('returns false for Forbidden', () => {
      const error = new ProviderError(ProviderFailure.Forbidden);
      expect(isRetriableError(error)).toBe(false);
    });

    it('returns false for NotFound', () => {
      const error = new ProviderError(ProviderFailure.NotFound);
      expect(isRetriableError(error)).toBe(false);
    });

    it('returns false for Conflict', () => {
      const error = new ProviderError(ProviderFailure.Conflict);
      expect(isRetriableError(error)).toBe(false);
    });

    it('returns false for InvalidResponse', () => {
      const error = new ProviderError(ProviderFailure.InvalidResponse);
      expect(isRetriableError(error)).toBe(false);
    });

    it('returns false for NotImplemented', () => {
      const error = new ProviderError(ProviderFailure.NotImplemented);
      expect(isRetriableError(error)).toBe(false);
    });
  });

  describe('errors without reason field', () => {
    it('returns true for plain Error (no reason field)', () => {
      const error = new Error('Something went wrong');
      expect(isRetriableError(error)).toBe(true);
    });

    it('returns true for object without reason property', () => {
      const error = { message: 'Error message' };
      expect(isRetriableError(error)).toBe(true);
    });

    it('returns true for null', () => {
      expect(isRetriableError(null)).toBe(true);
    });

    it('returns true for undefined', () => {
      expect(isRetriableError(undefined)).toBe(true);
    });

    it('returns true for string', () => {
      expect(isRetriableError('error message')).toBe(true);
    });
  });

  describe('unrecognized reason values', () => {
    it('returns true for unrecognized numeric reason', () => {
      const error = { reason: 999 };
      expect(isRetriableError(error)).toBe(true);
    });

    it('returns true for string reason', () => {
      const error = { reason: 'custom-error' };
      expect(isRetriableError(error)).toBe(true);
    });
  });
});
