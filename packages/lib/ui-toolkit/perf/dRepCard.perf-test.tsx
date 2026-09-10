/**
 * DRepCard render cost: the row the browse-DReps sheet renders per DRep.
 * Registered rows run the BigNumber-based formatAmountToLocale (voting power
 * in lovelace) — real production code via the util-render fidelity mock. 30
 * rows ≈ a scrolled page.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { measureRenders } from 'reassure';

import { DRepCard } from '../src';

import { makeDRepCardProps } from './fixtures/dreps';
import { expectMounted, PerfProviders } from './testUtils';

const ROWS = 30;
const dreps = makeDRepCardProps(ROWS);

test('DRepCard × 30 — browse DReps, initial render', async () => {
  await measureRenders(
    <View>
      {dreps.map(drep => (
        <DRepCard key={drep.testID} {...drep} />
      ))}
    </View>,
    {
      scenario: expectMounted('perf-drep-0-voting-power'),
      wrapper: PerfProviders,
    },
  );
});

/**
 * Parent re-render with IDENTICAL row props — the sheet's search state lives
 * above the list, so every keystroke re-renders the visible rows including
 * their per-row lovelace formatting. DRepCard is not React.memo.
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
      {dreps.map(drep => (
        <DRepCard key={drep.testID} {...drep} />
      ))}
    </View>
  );
};

test('DRepCard × 30 — parent re-render with identical props (×2)', async () => {
  const scenario = async () => {
    await expectMounted('perf-drep-0-voting-power')();
    fireEvent.press(screen.getByTestId('perf-tick'));
    fireEvent.press(screen.getByTestId('perf-tick'));
  };
  await measureRenders(<IdenticalPropsHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});
