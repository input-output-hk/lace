/* eslint-disable no-magic-numbers */
import '@testing-library/jest-dom';
import * as formatNumber from '../format-number';

describe('Testing formatLocaleNumber', () => {
  test('should return 10000.123 format to 10,000.12', async () => {
    const result = formatNumber.formatLocaleNumber('10000.123', 1);

    expect(result).toEqual('10,000.1');
  });
  test('should format 10000.123 with default decimals', async () => {
    const result = formatNumber.formatLocaleNumber('10000.123');

    expect(result).toEqual('10,000.12');
  });
});

describe('Testing isNumeric', () => {
  test('isNumeric', async () => {
    expect(formatNumber.isNumeric('asd')).toEqual(false);
    expect(formatNumber.isNumeric('')).toEqual(false);
    expect(formatNumber.isNumeric('11a')).toEqual(true);
    expect(formatNumber.isNumeric('111.123a')).toEqual(true);
    expect(formatNumber.isNumeric('111')).toEqual(true);
    expect(formatNumber.isNumeric('111.123')).toEqual(true);
    expect(formatNumber.isNumeric('111.123.123')).toEqual(true);
  });
});

describe('Testing formatNumber', () => {
  test('should return 10000 format to 10.2K', async () => {
    const result = formatNumber.formatNumber('10200');

    expect(result).toEqual({ number: '10.2', unit: 'K' });
  });

  test('should return 1200 format to 1.2K', async () => {
    const result = formatNumber.formatNumber('1200');

    expect(result).toEqual({ number: '1.2', unit: 'K' });
  });

  test('should return same value in case of NaN', async () => {
    const result = formatNumber.formatNumber('asd');

    expect(result).toEqual({ number: 'asd' });
  });

  test('should format 999 to 999', async () => {
    const result = formatNumber.formatNumber('999');

    expect(result).toEqual({ number: '999', unit: '' });
  });

  test('should format 1 to 1.00', async () => {
    const result = formatNumber.compactNumber('1');

    expect(result).toEqual('1.00');
  });

  test('should default to 0', async () => {
    const result = formatNumber.compactNumber('');

    expect(result).toEqual('0.00');
  });

  test('should return 0 in case the value is NaN', async () => {
    const result = formatNumber.compactNumber('a');

    expect(result).toEqual('0');
  });

  test('should format 10 to 10.00', async () => {
    const result = formatNumber.compactNumber('10');

    expect(result).toEqual('10.00');
  });

  test('should format 999999999 to 999.99M', async () => {
    const result = formatNumber.compactNumber('999999999');

    expect(result).toEqual('999.99M');
  });

  test('should format 999999933399 to 999.99B', async () => {
    const result = formatNumber.compactNumber('999999933399');

    expect(result).toEqual('999.99B');
  });

  test('should format 999999933333399 to 999.99T', async () => {
    const result = formatNumber.compactNumber('999999933333399');

    expect(result).toEqual('999.99T');
  });

  test('should format 999929922233333399 to 999.92Q', async () => {
    const result = formatNumber.compactNumber('999929922233333399');

    expect(result).toEqual('999.92Q');
  });

  test('should compact million properly', async () => {
    const result = formatNumber.compactNumber('2000000');

    expect(result).toEqual('2.00M');
  });

  test('should compact billion properly', async () => {
    const result = formatNumber.compactNumber('5320000000');

    expect(result).toEqual('5.32B');
  });

  test('should display number seperated by comma', async () => {
    const result = formatNumber.compactNumber('40595');

    expect(result).toEqual('40,595.00');
  });

  test('should compact trillion properly', async () => {
    const result = formatNumber.compactNumber('40595000000000');

    expect(result).toEqual('40.59T');
  });

  test('should compact quadrillion properly', async () => {
    const result = formatNumber.compactNumber('49830000000000000');

    expect(result).toEqual('49.83Q');
  });

  test('should compact the number which has more that 18 chars', async () => {
    const result = formatNumber.compactNumber('10000000000000000000');

    expect(result).toEqual('10,000.00Q');
  });

  test('compact function should round up decimal to 2dp', async () => {
    const result = formatNumber.compactNumber('320.42343');

    expect(result).toEqual('320.42');
  });
});

describe('Testing formatValueToLocale function', () => {
  let languageGetter: ReturnType<typeof jest.spyOn>;
  const value = '10200';
  beforeEach(() => {
    languageGetter = jest.spyOn(window.navigator, 'language', 'get');
  });

  test('should use en locale by default', async () => {
    const result = formatNumber.formatValueToLocale(value);
    expect(result).toEqual('10,200.00');
  });

  // TODO: unskip when system locale formatting implemented
  test.skip('Should format number with es locale and two decimal values', async () => {
    languageGetter.mockReturnValue('es');
    const result = formatNumber.formatValueToLocale(value);
    expect(result).toEqual('10.200,00');
  });

  test('Should format number with en locale and two decimal values', async () => {
    languageGetter.mockReturnValue('en');
    const result = formatNumber.formatValueToLocale(value);
    expect(result).toEqual('10,200.00');
  });

  test('should not use 1 as maximumFractionDigits as default is 2, number should have 2 decimal places', async () => {
    const result = formatNumber.formatValueToLocale(value, 1);
    expect(result).toEqual('10,200.00');
  });

  test('should have 6 decimal places', async () => {
    const decimalPlaces = 6;
    const result = formatNumber.formatValueToLocale('10.9283627182', decimalPlaces);
    const decimalsLength = result.split('.')[1].length;
    expect(decimalsLength).toEqual(decimalPlaces);
  });

  test('should default to max 15 decimal places', async () => {
    const decimalPlaces = 30;
    const result = formatNumber.formatValueToLocale('10.9283627182928362718292836271829283627182', decimalPlaces);
    const decimalsLength = result.split('.')[1].length;
    expect(decimalsLength).toEqual(15);
  });
});

describe('Testing shortenNumber', () => {
  test('shortenNumber', () => {
    expect(formatNumber.shortenNumber('123', 2)).toEqual(`${'123'.slice(0, Math.max(0, 2))}`);
    expect(formatNumber.shortenNumber('12', 2)).toEqual('12');
  });
});

describe('Testing getInlineCurrencyFormat', () => {
  test('getInlineCurrencyFormat', () => {
    expect(formatNumber.getInlineCurrencyFormat('')).toEqual('0');
    expect(formatNumber.getInlineCurrencyFormat('123a')).toEqual(
      BigInt('123').toLocaleString('fullwide', { useGrouping: true })
    );

    const shortenNumberSpy = jest.spyOn(formatNumber, 'shortenNumber');

    expect(formatNumber.getInlineCurrencyFormat('123a.123', 1)).toEqual(
      `${BigInt('123').toLocaleString('fullwide', {
        useGrouping: true
      })}.1`
    );
    expect(shortenNumberSpy).toBeCalledTimes(1);
    expect(shortenNumberSpy).toBeCalledWith('123', 1);
    shortenNumberSpy.mockClear();

    expect(formatNumber.getInlineCurrencyFormat('123a.123.123', 1)).toEqual(
      `${BigInt('123').toLocaleString('fullwide', {
        useGrouping: true
      })}.${'123123'}`
    );
    shortenNumberSpy.mockClear();

    expect(formatNumber.getInlineCurrencyFormat('123a.123.123')).toEqual(
      BigInt('123').toLocaleString('fullwide', {
        useGrouping: true
      })
    );
  });
});

describe('Testing getChangedValue', () => {
  test('should remove prev number if current removed value is comma', () => {
    expect(
      formatNumber.getChangedValue({
        currentCursorPosition: 3,
        currentDisplayValue: '123456,789',
        displayValue: '123,456,789'
      })
    ).toEqual({
      currentDisplayValue: '12456,789',
      value: '12456789',
      currentCursorPosition: 2
    });
  });
  test('should return changed calue otherwise', () => {
    expect(
      formatNumber.getChangedValue({
        currentCursorPosition: 3,
        currentDisplayValue: '12456,789',
        displayValue: '123,456,789'
      })
    ).toEqual({
      currentDisplayValue: '12456,789',
      value: '12456789',
      currentCursorPosition: 3
    });

    expect(
      formatNumber.getChangedValue({
        currentCursorPosition: 3,
        currentDisplayValue: '12356,789',
        displayValue: '123,456,789'
      })
    ).toEqual({
      currentDisplayValue: '12356,789',
      value: '12356789',
      currentCursorPosition: 3
    });
  });
});

describe('Testing getCaretPositionForFormattedCurrency', () => {
  test('should return current cursor position in case of integer value', () => {
    expect(
      formatNumber.getCaretPositionForFormattedCurrency({
        currentDisplayValue: '12,456,789',
        displayValue: '124,567,89',
        currentCursorPosition: 4
      })
    ).toEqual(4);
  });
  test('should return same cursor position in case of integer value', () => {
    expect(
      formatNumber.getCaretPositionForFormattedCurrency({
        currentDisplayValue: '1234',
        displayValue: '1,234',
        currentCursorPosition: 1
      })
    ).toEqual(2);
  });
  test('should return current cursor position in case of float value with last changed deciaml part ', () => {
    expect(
      formatNumber.getCaretPositionForFormattedCurrency({
        currentDisplayValue: '123,456,789.12456',
        displayValue: '123,456,789.12456',
        currentCursorPosition: 14
      })
    ).toEqual(14);
  });
  test('should return current cursor position in case of float value with last changed whole part ', () => {
    expect(
      formatNumber.getCaretPositionForFormattedCurrency({
        currentDisplayValue: '12,456,789.12456',
        displayValue: '124,567,89.12456',
        currentCursorPosition: 4
      })
    ).toEqual(4);
  });
  test('should return proper cursor position in case of integer value', () => {
    expect(
      formatNumber.getCaretPositionForFormattedCurrency({
        currentDisplayValue: '12,4',
        displayValue: '124',
        currentCursorPosition: 4
      })
    ).toEqual(3);
  });
  test('should return proper cursor position in case of integer value', () => {
    expect(
      formatNumber.getCaretPositionForFormattedCurrency({
        currentDisplayValue: '1234',
        displayValue: '123,4',
        currentCursorPosition: 4
      })
    ).toEqual(5);
  });
  test('should return proper cursor position in case of decimal value', () => {
    expect(
      formatNumber.getCaretPositionForFormattedCurrency({
        currentDisplayValue: '1234.567',
        displayValue: '123,4.567',
        currentCursorPosition: 4
      })
    ).toEqual(5);
  });
});
