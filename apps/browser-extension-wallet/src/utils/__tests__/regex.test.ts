import '@testing-library/jest-dom';
import { startWithRegExp } from '../regex';

describe('Testing regex functions', () => {
  test('should return proper start with regex', async () => {
    expect(startWithRegExp('Mainnet').test('Mainnet1')).toBe(true);
    expect(startWithRegExp('Mainnet').test('Testtet1')).toBe(false);
    expect(startWithRegExp('Mainnet').test('')).toBe(false);
    expect(startWithRegExp('').test('')).toBe(true);
    expect(startWithRegExp('').test('Testtet1')).toBe(true);
  });
});
