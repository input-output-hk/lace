import '@testing-library/jest-dom';
import { compactNumber, formatNumber, formatCurrencyValue } from '../format-number';

describe('Testing formatNumber component', () => {
  test('should return 10000 format to 10.2K', async () => {
    const result = formatNumber('10200');

    expect(result).toEqual({ number: '10.2', unit: 'K' });
  });

  test('should return 1200 format to 1.2K', async () => {
    const result = formatNumber('1200');

    expect(result).toEqual({ number: '1.2', unit: 'K' });
  });

  test('should format 9999999999 to 999.99M', async () => {
    const result = compactNumber('999999999');

    expect(result).toEqual('999.99M');
  });

  test('should format 999999933399 to 999.99B', async () => {
    const result = compactNumber('999999933399');

    expect(result).toEqual('999.99B');
  });

  test('should format 999999933333399 to 999.99T', async () => {
    const result = compactNumber('999999933333399');

    expect(result).toEqual('999.99T');
  });

  test('should format 999929922233333399 to 999.92Q', async () => {
    const result = compactNumber('999929922233333399');

    expect(result).toEqual('999.92Q');
  });

  test('should compact million properly', async () => {
    const result = compactNumber('2000000');

    expect(result).toEqual('2.00M');
  });

  test('should compact billion properly', async () => {
    const result = compactNumber('5320000000');

    expect(result).toEqual('5.32B');
  });

  test('should display number seperated by comma', async () => {
    const result = compactNumber('40595');

    expect(result).toEqual('40,595.00');
  });

  test('should compact trillion properly', async () => {
    const result = compactNumber('40595000000000');

    expect(result).toEqual('40.59T');
  });

  test('should compact quadrillion properly', async () => {
    const result = compactNumber('49830000000000000');

    expect(result).toEqual('49.83Q');
  });

  test('compact function should round up decimal to 2dp', async () => {
    const result = compactNumber('320.42343');

    expect(result).toEqual('320.42');
  });
});

describe('Testing formatCurrencyValue function', () => {
  let languageGetter: ReturnType<typeof jest.spyOn>;
  const value = '10200';
  beforeEach(() => {
    languageGetter = jest.spyOn(window.navigator, 'language', 'get');
  });

  test('should use en locale by default', async () => {
    const result = formatCurrencyValue(value);
    expect(result).toEqual('10,200.00');
  });

  // TODO: unskip when system locale formatting implemented
  test.skip('Should format number with es locale and two decimal values', async () => {
    languageGetter.mockReturnValue('es');
    const result = formatCurrencyValue(value);
    expect(result).toEqual('10.200,00');
  });

  test('Should format number with en locale and two decimal values', async () => {
    languageGetter.mockReturnValue('en');
    const result = formatCurrencyValue(value);
    expect(result).toEqual('10,200.00');
  });

  test('should not use 1 as maximumFractionDigits as default is 2, number should have 2 decimal places', async () => {
    const result = formatCurrencyValue(value, 1);
    expect(result).toEqual('10,200.00');
  });

  test('should have 6 decimal places', async () => {
    const decimalPlaces = 6;
    const result = formatCurrencyValue('10.9283627182', decimalPlaces);
    const decimalsLength = result.split('.')[1].length;
    expect(decimalsLength).toEqual(decimalPlaces);
  });
});
