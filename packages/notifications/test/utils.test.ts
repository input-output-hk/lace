/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-magic-numbers */
/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable unicorn/no-null */
import { getNow, isArrayOfStrings, unused } from '../src/utils';

describe('isArrayOfStrings', () => {
  describe('positive cases', () => {
    test('should return true for array of strings', () => {
      expect(isArrayOfStrings(['hello', 'world', 'test'])).toBe(true);
    });

    test('should return true for empty array', () => {
      expect(isArrayOfStrings([])).toBe(true);
    });

    test('should return true for array with single string', () => {
      expect(isArrayOfStrings(['single'])).toBe(true);
    });

    test('should return true for array with empty strings', () => {
      expect(isArrayOfStrings(['', 'hello', ''])).toBe(true);
    });

    test('should return true for array with long strings', () => {
      expect(isArrayOfStrings(['very long string', 'another very long string'])).toBe(true);
    });
  });

  describe('negative cases - not an array', () => {
    test('should return false for null', () => {
      expect(isArrayOfStrings(null)).toBe(false);
    });

    test('should return false for undefined', () => {
      expect(isArrayOfStrings(undefined)).toBe(false);
    });

    test('should return false for number', () => {
      expect(isArrayOfStrings(123)).toBe(false);
    });

    test('should return false for string', () => {
      expect(isArrayOfStrings('hello')).toBe(false);
    });

    test('should return false for boolean', () => {
      expect(isArrayOfStrings(true)).toBe(false);
      expect(isArrayOfStrings(false)).toBe(false);
    });

    test('should return false for object', () => {
      expect(isArrayOfStrings({})).toBe(false);
      expect(isArrayOfStrings({ key: 'value' })).toBe(false);
    });

    test('should return false for function', () => {
      expect(isArrayOfStrings(() => {})).toBe(false);
    });
  });

  describe('negative cases - array with non-string elements', () => {
    test('should return false for array with numbers', () => {
      expect(isArrayOfStrings([1, 2, 3])).toBe(false);
    });

    test('should return false for array with mixed strings and numbers', () => {
      expect(isArrayOfStrings(['hello', 123, 'world'])).toBe(false);
    });

    test('should return false for array with objects', () => {
      expect(isArrayOfStrings([{}, { key: 'value' }])).toBe(false);
    });

    test('should return false for array with mixed strings and objects', () => {
      expect(isArrayOfStrings(['hello', {}, 'world'])).toBe(false);
    });

    test('should return false for array with booleans', () => {
      expect(isArrayOfStrings([true, false])).toBe(false);
    });

    test('should return false for array with mixed strings and booleans', () => {
      expect(isArrayOfStrings(['hello', true, 'world'])).toBe(false);
    });

    test('should return false for array with null', () => {
      expect(isArrayOfStrings([null])).toBe(false);
    });

    test('should return false for array with undefined', () => {
      expect(isArrayOfStrings([undefined])).toBe(false);
    });

    test('should return false for array with mixed strings, null, and undefined', () => {
      expect(isArrayOfStrings(['hello', null, 'world', undefined])).toBe(false);
    });

    test('should return false for array with functions', () => {
      expect(isArrayOfStrings([() => {}, function () {}])).toBe(false);
    });

    test('should return false for array with mixed strings and functions', () => {
      expect(isArrayOfStrings(['hello', () => {}, 'world'])).toBe(false);
    });

    test('should return false for array with nested arrays', () => {
      expect(isArrayOfStrings([['nested']])).toBe(false);
    });

    test('should return false for array with mixed strings and nested arrays', () => {
      expect(isArrayOfStrings(['hello', ['nested'], 'world'])).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should return false for array-like object', () => {
      // Simulate array-like object (e.g., arguments object)
      const arrayLike = { 0: 'hello', 1: 'world', length: 2 };
      expect(isArrayOfStrings(arrayLike)).toBe(false);
    });

    test('should return false for array with Symbol', () => {
      expect(isArrayOfStrings([Symbol('test')])).toBe(false);
    });

    test('should return false for array with mixed strings and Symbol', () => {
      expect(isArrayOfStrings(['hello', Symbol('test'), 'world'])).toBe(false);
    });

    test('should return true for array with string representations of numbers', () => {
      expect(isArrayOfStrings(['123', '456', '789'])).toBe(true);
    });

    test('should return true for array with special characters in strings', () => {
      expect(isArrayOfStrings(['!@#$%', '^&*()', '{}[]'])).toBe(true);
    });

    test('should return true for array with unicode strings', () => {
      expect(isArrayOfStrings(['你好', '世界', '🎉'])).toBe(true);
    });
  });
});

describe('unused', () => {
  test('should return undefined when called', () => {
    const result = unused();

    expect(result).toBeUndefined();
  });

  test('should return undefined when called with arguments', () => {
    const result = unused('arg1', 'arg2', 123, { key: 'value' });

    expect(result).toBeUndefined();
  });

  test('should not throw when called with any arguments', () => {
    expect(() => {
      unused();
      unused('test');
      unused(null);
      unused(undefined);
      unused({});
      unused([]);
    }).not.toThrow();
  });
});

describe('getNow', () => {
  test('should return current Unix timestamp in seconds', () => {
    const now = getNow();
    const expected = Math.floor(Date.now() / 1000);

    expect(now).toBe(expected);
  });

  test('should return a number', () => {
    const now = getNow();

    expect(typeof now).toBe('number');
  });

  test('should return a positive integer', () => {
    const now = getNow();

    expect(now).toBeGreaterThan(0);
    expect(Number.isInteger(now)).toBe(true);
  });

  test('should return values that increase over time', async () => {
    const now1 = getNow();
    // Wait a small amount of time
    await new Promise((resolve) => setTimeout(resolve, 10));
    const now2 = getNow();

    expect(now2).toBeGreaterThanOrEqual(now1);
  });
});
