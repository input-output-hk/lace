/* eslint-disable no-magic-numbers */
import { shortenString } from '../format-string';

describe('format-string', () => {
  describe('shortenString', () => {
    test('shortens a string to the new desired length and adds "..." at the end', () => {
      expect(shortenString('This is a long string', 7)).toEqual('This is...');
    });

    test('returns the same string if the new length is equal to the string length', () => {
      expect(shortenString('This string is 33 characters long', 33)).toEqual('This string is 33 characters long');
    });

    test('returns the same string if the string is shorter that the new length', () => {
      expect(shortenString('7 chars', 8)).toEqual('7 chars');
    });

    test('ignores negative values or zero as the new length', () => {
      expect(shortenString('Still the same', -5)).toEqual('Still the same');
      expect(shortenString('Also the same', 0)).toEqual('Also the same');
    });
  });
});
