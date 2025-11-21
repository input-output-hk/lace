import { sanitizeNumber } from '../sanitize-number';

describe('Testing sanitizeNumber function', () => {
  test('should ignore value with special characters', async () => {
    const res = sanitizeNumber('2/');
    expect(res).toBe('2');
  });

  test('should ignore value with letters', async () => {
    const res = sanitizeNumber('2a');
    expect(res).toBe('2');
  });

  test('should ignore value starting with letters', async () => {
    const res = sanitizeNumber('a2');
    expect(res).toBe('2');
  });

  test('should ignore value with letters only', async () => {
    const res = sanitizeNumber('a');
    expect(res).toBe('');
  });

  test('should ignore value with special characters after decimal point', async () => {
    const res = sanitizeNumber('2.^');
    expect(res).toBe('2.');
  });

  test('should ignore value with letters after decimal point', async () => {
    const res = sanitizeNumber('2.a');
    expect(res).toBe('2.');
  });

  test('should return value with decimal point', async () => {
    const res = sanitizeNumber('2.');
    expect(res).toBe('2.');
  });

  test('should return integer', () => {
    const res = sanitizeNumber('2000000');
    expect(res).toBe('2000000');
  });
});
