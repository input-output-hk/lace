import {
  isNotNil,
  replaceNullsWithUndefineds,
  resolveObjectValues,
} from '../../src/common';

describe('util', () => {
  describe('resolveObjectValues', () => {
    it('resolves all object values which are promises', async () => {
      const result = await resolveObjectValues({
        first: 1,
        second: Promise.resolve(2),
        third: new Promise<number>(resolve => setTimeout(() => resolve(3), 10)),
      });

      expect(result).toEqual({ first: 1, second: 2, third: 3 });
    });
  });

  describe('isNotNil', () => {
    it('is false for null and undefined only', () => {
      expect([0, '', false, null, undefined, {}].filter(isNotNil)).toEqual([
        0,
        '',
        false,
        {},
      ]);
    });
  });

  describe('replaceNullsWithUndefineds', () => {
    it('replaces nulls recursively in plain objects and leaves class instances alone', () => {
      const date = new Date(0);
      const result = replaceNullsWithUndefineds({
        a: null,
        b: { c: null, d: 1 },
        date,
        list: [null, 2],
      });
      expect(result).toEqual({
        a: undefined,
        b: { c: undefined, d: 1 },
        date,
        list: [null, 2],
      });
      expect(result.date).toBe(date);
    });
  });
});
