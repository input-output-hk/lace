import { describe, expect, it } from 'vitest';

import { isClaimResponseError } from '../src/types';

describe('isClaimResponseError', () => {
  describe('returns true for valid error codes', () => {
    it.each([
      [{ code: 400, status: 'invalidaddress' }, 'invalidaddress'],
      [{ code: 400, status: 'missingcode' }, 'missingcode'],
      [{ code: 400, status: 'invalidnetwork' }, 'invalidnetwork'],
      [{ code: 404, status: 'notfound' }, 'notfound'],
      [{ code: 409, status: 'alreadyclaimed' }, 'alreadyclaimed'],
      [{ code: 410, status: 'expired' }, 'expired'],
      [{ code: 425, status: 'tooearly' }, 'tooearly'],
      [{ code: 429, status: 'ratelimited' }, 'ratelimited'],
    ])('returns true for %o (%s)', error => {
      expect(isClaimResponseError(error)).toBe(true);
    });
  });

  describe('returns false for success codes', () => {
    it.each([
      [
        {
          code: 200,
          status: 'accepted',
          lovelaces: '1000000',
          queue_position: 1,
          tokens: {},
        },
        200,
      ],
      [
        {
          code: 201,
          status: 'queued',
          lovelaces: '1000000',
          queue_position: 1,
          tokens: {},
        },
        201,
      ],
      [
        {
          code: 202,
          status: 'claimed',
          lovelaces: '1000000',
          tokens: {},
          tx_hash: 'abc123',
        },
        202,
      ],
    ])('returns false for success code %i', response => {
      expect(isClaimResponseError(response)).toBe(false);
    });
  });

  describe('returns false for invalid inputs', () => {
    it('returns false for null', () => {
      expect(isClaimResponseError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isClaimResponseError(undefined)).toBe(false);
    });

    it('returns false for non-objects', () => {
      expect(isClaimResponseError('string')).toBe(false);
      expect(isClaimResponseError(123)).toBe(false);
      expect(isClaimResponseError(true)).toBe(false);
      expect(isClaimResponseError([])).toBe(false);
    });

    it('returns false for objects missing code property', () => {
      expect(isClaimResponseError({ status: 'notfound' })).toBe(false);
    });

    it('returns false for objects missing status property', () => {
      expect(isClaimResponseError({ code: 404 })).toBe(false);
    });

    it('returns false for objects with unrecognized error codes', () => {
      expect(isClaimResponseError({ code: 500, status: 'servererror' })).toBe(
        false,
      );
      expect(isClaimResponseError({ code: 401, status: 'unauthorized' })).toBe(
        false,
      );
      expect(isClaimResponseError({ code: 403, status: 'forbidden' })).toBe(
        false,
      );
    });

    it('returns false for empty object', () => {
      expect(isClaimResponseError({})).toBe(false);
    });
  });
});
