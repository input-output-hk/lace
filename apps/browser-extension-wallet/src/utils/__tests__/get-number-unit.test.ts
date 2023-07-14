/* eslint-disable no-magic-numbers */
import '@testing-library/jest-dom';
import BigNumber from 'bignumber.js';
import { unitsMap } from '../constants';
import { getNumberUnit } from '../get-number-unit';

describe('Testing getNumberUnit component', () => {
  test('should return empty string if it is less than 1000', async () => {
    const keys = unitsMap.keys();
    const result = getNumberUnit(new BigNumber('100'), keys);

    expect(JSON.stringify(result)).toBe(JSON.stringify({ unit: '', unitThreshold: new BigNumber(0) }));
  });

  test('should handle last iteration', async () => {
    const keys = new Map().keys();
    const result = getNumberUnit(new BigNumber('100'), keys);

    expect(JSON.stringify(result)).toBe(JSON.stringify({ unit: 'B', unitThreshold: unitsMap.get('B').gt }));
  });

  test('should return K when is greater-equal 1000 less 1000000', async () => {
    const keys = unitsMap.keys();
    const result = getNumberUnit(new BigNumber('10000'), keys);

    expect(JSON.stringify(result)).toBe(JSON.stringify({ unit: 'K', unitThreshold: new BigNumber(1e3) }));
  });

  test('should return M is greater-equal 1000000 less 1000000000', async () => {
    const keys = unitsMap.keys();
    const result = getNumberUnit(new BigNumber('10000000'), keys);

    expect(JSON.stringify(result)).toBe(JSON.stringify({ unit: 'M', unitThreshold: new BigNumber(1e6) }));
  });

  test('should return B greater-equal than 1000000000', async () => {
    const keys = unitsMap.keys();
    const result = getNumberUnit(new BigNumber('10000000000'), keys);

    expect(JSON.stringify(result)).toBe(JSON.stringify({ unit: 'B', unitThreshold: new BigNumber(1e9) }));
  });

  test('should return T greater-equal than 10000000000000', async () => {
    const keys = unitsMap.keys();
    const result2 = getNumberUnit(new BigNumber('10000000000000'), keys);
    expect(JSON.stringify(result2)).toBe(JSON.stringify({ unit: 'T', unitThreshold: new BigNumber(1e12) }));
  });
});
