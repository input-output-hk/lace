/* eslint-disable no-magic-numbers */
import { validateNumericValue } from '../validate-numeric-value';

const integerValue = '850';
const floatValue = '850.78';

describe('Testing validateNumericValue for integer value', () => {
  test('returns true for integer', async () => {
    const result = validateNumericValue(integerValue);
    expect(result).toBe(true);
  });

  test('returns false for float value', async () => {
    const result = validateNumericValue(`${integerValue}.2`);
    expect(result).toBe(false);
  });

  test('returns false for alphabetic and alphanumeric values', async () => {
    const alphabeticResult = validateNumericValue('test');
    const alphanumericResult = validateNumericValue('test3');
    expect(alphabeticResult).toBe(false);
    expect(alphanumericResult).toBe(false);
  });

  test('returns false for special characters', async () => {
    const result = validateNumericValue('!');
    expect(result).toBe(false);
  });
});

describe('Testing validateNumericValue for float value', () => {
  test('returns true for float value', async () => {
    const result = validateNumericValue(floatValue, { isFloat: true });
    expect(result).toBe(true);
  });

  test('returns true if decimals amount are in the allowed range', async () => {
    const result = validateNumericValue(floatValue, { isFloat: true, maxDecimals: '2' });
    expect(result).toBe(true);
  });

  test('returns false if decimals amount exceeds allowed range', async () => {
    const result = validateNumericValue(`${floatValue}276`, { isFloat: true, maxDecimals: '2' });
    expect(result).toBe(false);
  });

  test('returns false for comma as decimal separator', async () => {
    const result = validateNumericValue('80,2302', { isFloat: true });
    expect(result).toBe(false);
  });

  test('returns false if there are more than one point after integer part', async () => {
    const result = validateNumericValue('80..', { isFloat: true });
    expect(result).toBe(false);
  });

  test('returns false if value have a special character', async () => {
    const result = validateNumericValue('80.33%', { isFloat: true });
    expect(result).toBe(false);
  });
});
