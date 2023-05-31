/* eslint-disable no-magic-numbers */
import {
  lovelacesToAdaString,
  convertLovelaceToFiat,
  convertAdaToFiat,
  adaToLovelacesString
} from '../unit-converters';

describe('Testing lovelacesToAdaString function', () => {
  test('should convert lovelaces to ada', async () => {
    const result = lovelacesToAdaString('1000000');
    expect(result).toBe('1.00');
  });

  test('should return ada value with 4 decimals', async () => {
    const result = lovelacesToAdaString('1000000', 4);
    expect(result).toBe('1.0000');
  });
});

describe('Testing convertLovelaceToFiat function', () => {
  test('should convert lovelaces to fiat currency', async () => {
    const result = convertLovelaceToFiat({ lovelaces: '1000000', fiat: 2 });
    expect(result).toBe('2.00');
  });

  test('should return lovelaces value converted to fiat currency with 4 decimals', async () => {
    const result = convertLovelaceToFiat({ lovelaces: '1000000', fiat: 2 }, 4);
    expect(result).toBe('2.0000');
  });
});

describe('Testing convertAdaToFiat function', () => {
  test('should convert ada to fiat currency', async () => {
    const result = convertAdaToFiat({ ada: '10', fiat: 2 });
    expect(result).toBe('20.00');
  });
  test('should return ada value converted to fiat currency with 4 decimals', async () => {
    const result = convertAdaToFiat({ ada: '10', fiat: 2 }, 4);
    expect(result).toBe('20.0000');
  });

  describe('Testing adaToLovelacesString', () => {
    test('should convert an ADA value to lovelaces', () => {
      const lovelaceValue = adaToLovelacesString('10');
      expect(lovelaceValue).toEqual('10000000');
    });

    test('should convert an ADA value with decimals to lovelaces', () => {
      const adaValue = adaToLovelacesString('20.035');
      expect(adaValue).toEqual('20035000');
    });
  });
});
