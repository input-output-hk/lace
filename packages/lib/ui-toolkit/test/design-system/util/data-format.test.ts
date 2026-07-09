import { describe, expect, it } from 'vitest';

import { formatMetadataValue } from '../../../src/design-system/util/data-format';

describe('formatMetadataValue', () => {
  it('formats nested objects recursively', () => {
    expect(
      formatMetadataValue({
        name: 'Lace',
        stats: {
          count: 2,
          verified: true,
        },
      }),
    ).toBe('name: Lace, stats: count: 2, verified: true');
  });

  it('formats mixed-type arrays with structured values', () => {
    expect(
      formatMetadataValue([1, 'two', false, { rarity: 'gold' }, ['a', 'b']]),
    ).toBe('1; two; false; rarity: gold; a, b');
  });

  it('uses comma separator for primitive arrays', () => {
    expect(formatMetadataValue([1, 'two', false])).toBe('1, two, false');
  });

  it('uses semicolon separator when any array item is structured', () => {
    expect(
      formatMetadataValue(['alpha', { beta: 2 }, ['gamma', 'delta']]),
    ).toBe('alpha; beta: 2; gamma, delta');
  });
});
