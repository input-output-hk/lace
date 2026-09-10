/**
 * Deterministic props for the ui-toolkit PortfolioCard benchmark, in the
 * shape the Portfolio home screen feeds the aggregate card
 * (packages/next/ui/src/screens/Portfolio/Portfolio.tsx: variant
 * "alternative"/"enhanced", formatted price, sparkline as priceHistoryData,
 * wallets/accounts summary). No Date.now()/Math.random().
 */
import type React from 'react';

import noop from 'lodash/noop';

import { makeSparkline } from './accounts';

import type { PortfolioCard } from '../../src';

type PortfolioCardProps = React.ComponentProps<typeof PortfolioCard>;

const ACCOUNT_COUNT = 3;

export const makePortfolioCardProps = (
  tick = 0,
): Omit<PortfolioCardProps, 'alternativeType' | 'variant'> => ({
  price: `${4812 + tick * 27}.99`,
  currency: 'USD',
  priceHistoryData: { data: makeSparkline(tick) },
  timeRange: '24H',
  onTimeRangeChange: noop,
  onActionPress: {
    onAccountsPress: noop,
    onBuyPress: noop,
    onReceivePress: noop,
    onSendPress: noop,
  },
  data: {
    wallets: [{ icon: { uri: 'https://wallet.example/0.png' } }],
    accounts: Array.from({ length: ACCOUNT_COUNT }, (_, index) => ({
      name: 'Account',
      icon: { uri: `https://avatar.example/${index}.png` },
    })),
  },
  arePricesAvailable: true,
  testID: 'perf-portfolio-card',
});
