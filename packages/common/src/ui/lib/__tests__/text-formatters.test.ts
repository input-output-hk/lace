import { getCapitalizedInitial } from '../text-formatters';

describe('Text formatters', () => {
  describe('getCapitalizedInitial', () => {
    test('returns the first letter of a string in upper case', () => {
      expect(getCapitalizedInitial('abc')).toEqual('A');
      expect(getCapitalizedInitial('ABC')).toEqual('A');
    });
    test('returns an empty string if the parameter is also empty', () => {
      expect(getCapitalizedInitial('')).toEqual('');
    });
  });
});
