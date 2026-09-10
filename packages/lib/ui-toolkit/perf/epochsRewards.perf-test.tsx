/**
 * EpochsRewards render cost: the rewards-per-epoch chart section of the
 * regular pool sheet (progress bars + dropdown filter + scale labels through
 * the REAL BigNumber formatAmountToLocale via the util-render fidelity
 * mock).
 */
import noop from 'lodash/noop';
import React from 'react';
import { measureRenders } from 'reassure';

import { EpochsRewards } from './deepImports';
import { expectTextMounted, PerfProviders } from './testUtils';

const EPOCHS = 10;
const LOVELACES_PER_ADA = 1_000_000;

const epochs = Array.from({ length: EPOCHS }, (_, index) => ({
  epoch: `${560 + index}`,
  progress: (index * 11) % 100,
}));

// Exactly five entries (min..max quartiles), the shape production always
// builds — the scale row only renders when epochsScale.length === 5.
const epochsScale = [0, 50, 100, 150, 200].map(ada => ada * LOVELACES_PER_ADA);

test('EpochsRewards — 10 epochs + scale + filter, initial render', async () => {
  await measureRenders(
    <EpochsRewards
      epochs={epochs}
      epochsScale={epochsScale}
      filterOptions={[5, 10, 20]}
      selectedFilter={1}
      onFilterChange={noop}
    />,
    {
      // The scale row is the branch this suite exists for: it only mounts on
      // exactly five entries, and its labels are the formatAmountToLocale output.
      scenario: expectTextMounted(/ADA$/),
      wrapper: PerfProviders,
    },
  );
});
