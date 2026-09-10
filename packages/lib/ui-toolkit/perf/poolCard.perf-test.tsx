/**
 * PoolCard render cost: the row the browse-pools page renders per stake pool
 * — the longest list in the app (hundreds of pools scrolled). 50 rows ≈ a
 * deep scroll window. Measurable since the util-render fidelity mock:
 * compactNumberWithUnit and the displayLovelaces prop run the real
 * production formatters.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { measureRenders } from 'reassure';

import { PoolCard } from '../src';

import { displayLovelaces, makeBrowsePools } from './fixtures/pools';
import { expectTextMounted, PerfProviders } from './testUtils';

import type { LaceBrowsePool } from '@lace-contract/cardano-stake-pools';

const ROWS = 50;
const pools = makeBrowsePools(ROWS);
const onPress = () => {};

const renderPools = (variant?: 'liveStake') => (
  <View>
    {pools.map((pool: LaceBrowsePool) => (
      <PoolCard
        key={pool.poolId}
        cardStyle={undefined}
        displayLovelaces={displayLovelaces}
        pool={pool}
        onPress={onPress}
        placeholder=""
        variant={variant}
      />
    ))}
  </View>
);

// PoolCard exposes no testID; its ticker is the row's load-bearing text.
const expectPoolRows = expectTextMounted('IOG');

test('PoolCard × 50 — browse pools (saturation variant), initial render', async () => {
  await measureRenders(renderPools(), {
    scenario: expectPoolRows,
    wrapper: PerfProviders,
  });
});

test('PoolCard × 50 — liveStake variant (formatter per row), initial render', async () => {
  await measureRenders(renderPools('liveStake'), {
    scenario: expectPoolRows,
    wrapper: PerfProviders,
  });
});

/**
 * Parent re-render with IDENTICAL row props — the browse page's search state
 * lives above the list, so every keystroke re-renders the visible rows.
 * PoolCard is not React.memo; this duration is the 50-row wasted-work bill.
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
      {renderPools()}
    </View>
  );
};

test('PoolCard × 50 — parent re-render with identical props (×2)', async () => {
  const scenario = async () => {
    await expectPoolRows();
    fireEvent.press(screen.getByTestId('perf-tick'));
    fireEvent.press(screen.getByTestId('perf-tick'));
  };
  await measureRenders(<IdenticalPropsHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});
