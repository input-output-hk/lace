import { describe, expect, it } from 'vitest';

import {
  calculateNextAccountIndex,
  generateAccountIndexDropdownItems,
  MAX_ACCOUNT_INDEX,
} from '../../../src/pages/AddAccount/addAccountHelpers';

const USED_LABEL = '(in use)';

describe('generateAccountIndexDropdownItems', () => {
  it('lists indices 0 through MAX_ACCOUNT_INDEX by default', () => {
    const items = generateAccountIndexDropdownItems(new Set(), USED_LABEL);

    expect(items).toHaveLength(MAX_ACCOUNT_INDEX + 1);
    expect(items[0]).toEqual({
      id: '0',
      text: '#000',
      value: 0,
      disabled: false,
    });
    expect(items.at(-1)?.value).toBe(MAX_ACCOUNT_INDEX);
  });

  it('caps the list at a device-imposed max account index', () => {
    const items = generateAccountIndexDropdownItems(new Set(), USED_LABEL, 24);

    expect(items).toHaveLength(25);
    expect(items.at(-1)?.value).toBe(24);
  });

  it('disables used indices and appends the used label', () => {
    const items = generateAccountIndexDropdownItems(
      new Set([1]),
      USED_LABEL,
      24,
    );

    expect(items[1]).toEqual({
      id: '1',
      text: `#001 ${USED_LABEL}`,
      value: 1,
      disabled: true,
    });
  });
});

describe('calculateNextAccountIndex', () => {
  it('returns the first unused index', () => {
    expect(calculateNextAccountIndex(new Set([0, 1, 3]))).toBe(2);
  });

  it('respects a device-imposed max account index', () => {
    const allUpToCap = new Set(Array.from({ length: 25 }, (_, index) => index));

    expect(calculateNextAccountIndex(allUpToCap, 24)).toBeUndefined();
    expect(calculateNextAccountIndex(allUpToCap)).toBe(25);
  });

  it('returns undefined when every default index is used', () => {
    const allUsed = new Set(
      Array.from({ length: MAX_ACCOUNT_INDEX + 1 }, (_, index) => index),
    );

    expect(calculateNextAccountIndex(allUsed)).toBeUndefined();
  });
});
