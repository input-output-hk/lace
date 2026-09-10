/**
 * NetworkInfoCard render cost: the network stats header on browse-pools and
 * stake-center, including the EpochCountdown leaf and the real dayjs
 * formatEpochEnd behind it (util-render fidelity mock).
 *
 * Date.now is frozen ahead of the epoch end so the countdown renders its
 * real multi-part string instead of the `diffMs <= 0` early return, and so
 * the leaf's 1s interval — which does fire on a loaded runner — recomputes
 * the SAME string and React bails out, keeping the render count
 * deterministic. Reassure times through perf_hooks (it polyfills
 * global.performance.now), so freezing Date.now leaves measurements intact.
 */
import React from 'react';
import { measureRenders } from 'reassure';

import { NetworkInfoCard } from '../src';

import { expectTextMounted, PerfProviders } from './testUtils';

const FROZEN_NOW = Date.UTC(2026, 5, 1, 12);
const EPOCH_END_TS = Date.UTC(2026, 5, 3, 18, 30, 15);
const EXPECTED_COUNTDOWN = '2d 6h 30m 15s';

beforeAll(() => {
  jest.spyOn(Date, 'now').mockReturnValue(FROZEN_NOW);
});

afterAll(() => {
  jest.restoreAllMocks();
});

test('NetworkInfoCard — full values, initial render', async () => {
  await measureRenders(
    <NetworkInfoCard
      currentEpochValue="573"
      epochEndTimestamp={EPOCH_END_TS}
      totalPoolsValue="3,105"
      stakedValue="63%"
    />,
    {
      scenario: expectTextMounted(EXPECTED_COUNTDOWN),
      wrapper: PerfProviders,
    },
  );
});
