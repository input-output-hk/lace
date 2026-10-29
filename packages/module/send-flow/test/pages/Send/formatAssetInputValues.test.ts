import { getLocaleSeparators } from '@lace-lib/util-render';
import { describe, expect, it } from 'vitest';

import { formatAssetInputValues } from '../../../src/pages/Send/formatAssetInputValues';

const { decimalSeparator } = getLocaleSeparators();
const input = (value: string) => [{ tokenId: 'lovelace', value }];

describe('formatAssetInputValues', () => {
  it('leaves a missing token unchanged', () => {
    const previous = input('1234');
    expect(formatAssetInputValues(previous, 'other')).toBe(previous);
  });

  it.each(['', ' ', `12${decimalSeparator}`])(
    'preserves unfinished input %j',
    value => {
      const previous = input(value);
      expect(formatAssetInputValues(previous, 'lovelace')).toBe(previous);
    },
  );

  it('formats only the selected token and preserves fractional zeros', () => {
    const previous = [
      { tokenId: 'other', value: '4321' },
      ...input(`1234${decimalSeparator}50`),
    ];
    const formatted = formatAssetInputValues(previous, 'lovelace');
    expect(formatted[0]).toBe(previous[0]);
    expect(formatted[1].value).toBe(
      new Intl.NumberFormat(undefined, { minimumFractionDigits: 2 }).format(
        1234.5,
      ),
    );
    expect(previous[1].value).toBe(`1234${decimalSeparator}50`);
  });

  it('removes extra decimal separators without dropping digits', () => {
    const previous = input(`12${decimalSeparator}3${decimalSeparator}40`);
    expect(formatAssetInputValues(previous, 'lovelace')).toEqual(
      input(`12${decimalSeparator}340`),
    );
  });

  it('keeps an already formatted array stable', () => {
    const previous = input('10');
    expect(formatAssetInputValues(previous, 'lovelace')).toBe(previous);
  });

  it('does not round large integer amounts through Number', () => {
    expect(
      formatAssetInputValues(input('9007199254740993'), 'lovelace'),
    ).toEqual(input(new Intl.NumberFormat().format(9007199254740993n)));
  });
});
