import { simpleCipher } from '../simple-cipher';

// getSecureRandomNumber internally calls browser only API window.crypto.getRandomValues,
// so we need to mock it.
jest.mock('../secure-random', () => ({
  getSecureRandomNumber: jest.fn(() => Math.random())
}));

describe('Testing SimpleCipher function', () => {
  test('should alter the string`s chars not to match the original', () => {
    const originalString = 'LaceIsGreat';
    const newString = simpleCipher(originalString);
    expect(newString).not.toEqual(originalString);
    expect(newString.length).toEqual(originalString.length);
  });
});
