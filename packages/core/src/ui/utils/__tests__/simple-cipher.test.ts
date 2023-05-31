import { simpleCipher } from '../simple-cipher';

describe('Testing SimpleCipher function', () => {
  test('should alter the string`s chars not to match the original', () => {
    const originalString = 'LaceIsGreat';
    const newString = simpleCipher(originalString);
    expect(newString).not.toEqual(originalString);
    expect(newString.length).toEqual(originalString.length);
  });
});
