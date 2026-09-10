/** Deterministic props for the ui-toolkit TokenItem render benchmark. */
import type React from 'react';

import type { TokenItem } from '../../src';

type TokenItemProps = React.ComponentProps<typeof TokenItem>;

const NAMES = [
  'Ada',
  'DjedMicroUSD',
  'Minswap',
  'Hosky',
  'iUSD',
  'WingRiders',
  'Sundae',
  'Lenfi',
  'Indigo',
  'Liqwid',
];

export const makeTokenItemProps = (count: number): TokenItemProps[] =>
  Array.from({ length: count }, (_, index) => ({
    balance: `${(index + 1) * 1000}.${String(index).padStart(2, '0')}`,
    conversion: `$${(index + 1) * 12}.34`,
    currency: `TK${index}`,
    name: `${NAMES[index % NAMES.length]} ${index}`,
    rate: `$0.${String((index * 7) % 100).padStart(2, '0')}`,
    testID: `perf-token-${index}`,
  }));
