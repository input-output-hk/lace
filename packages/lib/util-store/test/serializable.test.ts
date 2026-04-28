import { describe, expect, it } from 'vitest';

import { Serializable } from '../src/serializable';

describe('Serializable', () => {
  describe('from', () => {
    it('returns a fresh object each time (no caching)', () => {
      const serialized = Serializable.to({ foo: 'bar', count: BigInt(42) });

      const result1 = Serializable.from(serialized);
      const result2 = Serializable.from(serialized);

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });

    it('returns mutable objects', () => {
      const serialized = Serializable.to({ foo: 'bar', num: 123 });
      const result = Serializable.from(serialized);

      // Should not throw - object is mutable
      result.num = 456;
      expect(result.num).toBe(456);
    });

    it('correctly deserializes complex types', () => {
      const original = {
        bigint: BigInt(123456789),
        set: new Set([1, 2, 3]),
        map: new Map([
          ['a', 1],
          ['b', 2],
        ]),
        nested: {
          date: new Date('2024-01-01'),
        },
      };

      const serialized = Serializable.to(original);
      const result = Serializable.from(serialized);

      expect(result.bigint).toBe(BigInt(123456789));
      expect(result.set).toEqual(new Set([1, 2, 3]));
      expect(result.map).toEqual(
        new Map([
          ['a', 1],
          ['b', 2],
        ]),
      );
      expect(result.nested.date).toEqual(new Date('2024-01-01'));
    });

    it('handles null and undefined inputs gracefully', () => {
      // @ts-expect-error - testing edge case
      expect(Serializable.from(null)).toBe(null);
      // @ts-expect-error - testing edge case
      expect(Serializable.from(undefined)).toBe(undefined);
    });

    it('handles primitive inputs', () => {
      const serializedString = Serializable.to('hello');
      const serializedNumber = Serializable.to(42);

      expect(Serializable.from(serializedString)).toBe('hello');
      expect(Serializable.from(serializedNumber)).toBe(42);
    });
  });

  describe('fromCached', () => {
    it('returns the same reference when called with the same input', () => {
      const serialized = Serializable.to({ foo: 'bar', count: BigInt(42) });

      const result1 = Serializable.fromCached(serialized);
      const result2 = Serializable.fromCached(serialized);

      expect(result1).toBe(result2);
    });

    it('returns different references when called with different inputs', () => {
      const serialized1 = Serializable.to({ foo: 'bar' });
      const serialized2 = Serializable.to({ foo: 'bar' });

      const result1 = Serializable.fromCached(serialized1);
      const result2 = Serializable.fromCached(serialized2);

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });

    it('returns frozen objects that throw on mutation', () => {
      const serialized = Serializable.to({ foo: 'bar', num: 123 });
      const result = Serializable.fromCached(serialized);

      expect(Object.isFrozen(result)).toBe(true);
      expect(() => {
        result.num = 456;
      }).toThrow();
    });

    it('deep freezes nested objects', () => {
      const serialized = Serializable.to({
        nested: { value: 123 },
      });
      const result = Serializable.fromCached(serialized);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.nested)).toBe(true);
    });

    it('caches complex deserialized results', () => {
      const original = {
        bigint: BigInt(42),
        set: new Set(['a', 'b']),
      };

      const serialized = Serializable.to(original);

      const result1 = Serializable.fromCached(serialized);
      const result2 = Serializable.fromCached(serialized);

      // Same reference for the root object
      expect(result1).toBe(result2);
      // Same reference for nested objects
      expect(result1.set).toBe(result2.set);
    });

    it('handles null and undefined inputs gracefully', () => {
      // @ts-expect-error - testing edge case
      expect(Serializable.fromCached(null)).toBe(null);
      // @ts-expect-error - testing edge case
      expect(Serializable.fromCached(undefined)).toBe(undefined);
    });

    it('handles primitive inputs', () => {
      const serializedString = Serializable.to('hello');
      const serializedNumber = Serializable.to(42);

      expect(Serializable.fromCached(serializedString)).toBe('hello');
      expect(Serializable.fromCached(serializedNumber)).toBe(42);
    });
  });

  describe('to', () => {
    it('serializes and preserves data through round-trip', () => {
      const original = { foo: 'bar', num: 123 };
      const serialized = Serializable.to(original);
      const deserialized = Serializable.from(serialized);

      expect(deserialized).toEqual(original);
    });

    it('allows mutation after from() without affecting re-serialization', () => {
      const original = { foo: 'bar', num: 123 };
      const serialized = Serializable.to(original);
      const deserialized = Serializable.from(serialized);
      deserialized.num = 456;
      const serializedModified = Serializable.to(deserialized);
      const deserializedModified = Serializable.from(serializedModified);

      expect(deserialized).not.toEqual(original);
      expect(deserializedModified.num).toBe(456);
    });
  });
});
