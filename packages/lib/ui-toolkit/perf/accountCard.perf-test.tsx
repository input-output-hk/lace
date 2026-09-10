/**
 * AccountCard render cost at production fidelity: the standard-variant card
 * (header + balance + d3-backed LineChart sparkline + tokens/nfts summary +
 * action buttons) that the Portfolio home carousel renders per account on
 * every platform. It is the single heaviest shared molecule on the home
 * screen, so its mount and per-sync update cost are guarded here, once, at the
 * owning package.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { measureRenders } from 'reassure';

import { AccountCard } from '../src';

import { makeAccountCardProps, makeSparkline } from './fixtures/accounts';
import { expectMounted, PerfProviders } from './testUtils';

const props = makeAccountCardProps();

test('AccountCard — standard variant with sparkline, initial render', async () => {
  await measureRenders(<AccountCard {...props} />, {
    scenario: expectMounted('account-card'),
    wrapper: PerfProviders,
  });
});

/**
 * Per-sync tick: every wallet sync feeds the card a NEW balance string and a
 * NEW sparkline array (Portfolio rebuilds both), so nothing is referentially
 * stable across updates — this duration is the real per-sync bill including
 * the d3 path recomputation inside LineChart. Balances are indexed by tick
 * (not appended) so every value is a realistic formatted amount.
 */
const BALANCES: Array<{ coin: string; currency: string }> = [
  { coin: '12,034.56', currency: '$4,812.99' },
  { coin: '12,101.02', currency: '$4,839.51' },
  { coin: '12,167.48', currency: '$4,866.03' },
];

const SyncTickHarness = () => {
  const [tick, setTick] = useState(0);
  return (
    <View>
      <Pressable
        testID="perf-sync-tick"
        onPress={() => {
          setTick(previous => previous + 1);
        }}
      />
      <AccountCard
        {...props}
        balanceCoin={BALANCES[tick].coin}
        balanceCurrency={BALANCES[tick].currency}
        chartData={makeSparkline(tick)}
      />
    </View>
  );
};

test('AccountCard — per-sync balance + sparkline update (×2)', async () => {
  const scenario = async () => {
    await expectMounted('account-card')();
    fireEvent.press(screen.getByTestId('perf-sync-tick'));
    fireEvent.press(screen.getByTestId('perf-sync-tick'));
  };
  await measureRenders(<SyncTickHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});
