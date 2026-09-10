/**
 * GovernanceCard render cost: the per-account card the governance center
 * renders, alternating the two steady states (delegated with a resolved DRep
 * / not delegated). 8 cards ≈ a multi-account wallet.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { measureRenders } from 'reassure';

import { GovernanceCard } from '../src';

import { makeGovernanceCardProps } from './fixtures/governance';
import { expectMounted, PerfProviders } from './testUtils';

const CARDS = 8;
const cards = makeGovernanceCardProps(CARDS);

test('GovernanceCard × 8 — governance center, initial render', async () => {
  await measureRenders(
    <View>
      {cards.map(card => (
        <GovernanceCard key={card.testID} {...card} />
      ))}
    </View>,
    {
      scenario: expectMounted('perf-governance-0-voting-power'),
      wrapper: PerfProviders,
    },
  );
});

/**
 * Parent re-render with IDENTICAL card props — the center re-renders all
 * cards whenever any account's governance state refreshes. GovernanceCard is
 * not React.memo; this duration is the 8-card wasted-work bill.
 */
const IdenticalPropsHarness = () => {
  const [, setTick] = useState(0);
  return (
    <View>
      <Pressable
        testID="perf-tick"
        onPress={() => {
          setTick(previous => previous + 1);
        }}
      />
      {cards.map(card => (
        <GovernanceCard key={card.testID} {...card} />
      ))}
    </View>
  );
};

test('GovernanceCard × 8 — parent re-render with identical props (×2)', async () => {
  const scenario = async () => {
    await expectMounted('perf-governance-0-voting-power')();
    fireEvent.press(screen.getByTestId('perf-tick'));
    fireEvent.press(screen.getByTestId('perf-tick'));
  };
  await measureRenders(<IdenticalPropsHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});
