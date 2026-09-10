/**
 * Stake center render costs: StakeCard is the per-account card (alternating
 * staked / stake-available states), StakingStatusCard is the summary header
 * whose amounts change on every sync/epoch tick.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { measureRenders } from 'reassure';

import { StakeCard, StakingStatusCard } from '../src';

import { makeStakeCardProps, makeStakingStatusProps } from './fixtures/staking';
import { expectMounted, PerfProviders } from './testUtils';

const CARDS = 8;
const cards = makeStakeCardProps(CARDS);

test('StakeCard × 8 — stake center, initial render', async () => {
  await measureRenders(
    <View>
      {cards.map(card => (
        <StakeCard key={card.testID} {...card} />
      ))}
    </View>,
    { scenario: expectMounted('perf-stake-0'), wrapper: PerfProviders },
  );
});

/**
 * Sync/epoch tick: all three summary amounts change together (new strings
 * every tick, as the store re-derives them). Guards the memo chain inside the
 * card — every useMemo recomputes, and a regression that adds work per tick
 * shows up here first.
 */
const StatusTickHarness = () => {
  const [tick, setTick] = useState(0);
  return (
    <View>
      <Pressable
        testID="perf-status-tick"
        onPress={() => {
          setTick(previous => previous + 1);
        }}
      />
      <StakingStatusCard {...makeStakingStatusProps(tick)} />
    </View>
  );
};

test('StakingStatusCard — per-sync amounts update (×2)', async () => {
  const scenario = async () => {
    await expectMounted('staking-summary-total-staked-value')();
    fireEvent.press(screen.getByTestId('perf-status-tick'));
    fireEvent.press(screen.getByTestId('perf-status-tick'));
  };
  await measureRenders(<StatusTickHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});
