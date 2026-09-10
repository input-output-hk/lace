/**
 * Deterministic props for the ui-toolkit AccountCard render benchmark, in the
 * exact shape the Portfolio home carousel feeds the standard-variant card
 * (packages/next/ui/src/screens/Portfolio/Portfolio.tsx): a real sparkline
 * (chartData drives the d3-backed LineChart), pre-formatted balances and the
 * tokens/nfts summary. No Date.now()/Math.random().
 */
import type React from 'react';

import noop from 'lodash/noop';

import type { AccountCard } from '../../src';

type AccountCardProps = React.ComponentProps<typeof AccountCard>;

const SPARKLINE_LENGTH = 24;

// Pseudo-price walk with enough variation that d3 builds a non-degenerate
// curved path (a flat line would short-circuit most of the chart work).
export const makeSparkline = (offset: number): number[] =>
  Array.from(
    { length: SPARKLINE_LENGTH },
    (_, index) => 100 + (((index + offset) * 37) % 50),
  );

const TOKEN_NAMES = ['Ada', 'DjedMicroUSD', 'Minswap', 'Hosky'];

export const makeAccountCardProps = (): AccountCardProps => ({
  accountName: 'Account 1',
  accountType: 'Cardano',
  blockchain: 'Cardano',
  coin: 'ADA',
  currency: 'USD',
  balanceCoin: '12,034.56',
  balanceCurrency: '$4,812.99',
  chartData: makeSparkline(0),
  tokens: TOKEN_NAMES.map((name, index) => ({
    name,
    icon: { uri: `https://token.example/${index}.png` },
  })),
  nfts: [{ name: 'SpaceBud #1' }, { name: 'ClayNation #2' }],
  arePricesAvailable: true,
  onAccountsPress: noop,
  onBuyPress: noop,
  onSendPress: noop,
  onReceivePress: noop,
});
