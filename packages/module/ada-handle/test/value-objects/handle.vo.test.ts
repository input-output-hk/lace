import { describe, it, expect } from 'vitest';

import { Handle } from '../../src/value-objects';

describe('Handle', () => {
  it('returns the same string as tagged type given a valid handle', () => {
    expect(Handle('$123')).toBe('$123');
  });

  it('throws given an invalid handle', () => {
    expect(() => Handle('')).toThrow();
  });

  describe('isHandle', () => {
    describe('valid handles', () => {
      it('should return true for handles starting with $ and length > 2', () => {
        expect(Handle.isHandle('$12')).toBe(true);
      });
    });

    describe('invalid handles', () => {
      it('should return false invalid handles', () => {
        expect(Handle.isHandle('')).toBe(false);
        expect(Handle.isHandle('$1')).toBe(false);
        expect(Handle.isHandle('1234')).toBe(false);
      });
    });
  });
});
