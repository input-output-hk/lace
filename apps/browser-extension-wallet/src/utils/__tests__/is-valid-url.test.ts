import '@testing-library/jest-dom';
import { isValidURL } from '../is-valid-url';

describe('Testing isValidUrl function', () => {
  test('should return true if url is valid', async () => {
    const result = isValidURL('https://www.lace.io/faq?question=example');

    expect(result).toBe(true);
  });

  test('should return false if url is not valid', async () => {
    const result = isValidURL('www.lace.io');

    expect(result).toBe(false);
  });

  test('should return false if url is empty', async () => {
    const result = isValidURL('/');

    expect(result).toBe(false);
  });
});
