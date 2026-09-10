/**
 * DAppCard render cost: the cell the dapp explorer grid renders per dapp
 * (production shape: logoUrl / name / categoriesText). 24 cells ≈ a visible
 * grid page.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { measureRenders } from 'reassure';

import { DAppCard } from '../src';

import { makeDAppCardProps } from './fixtures/dapps';
import { expectMounted, PerfProviders } from './testUtils';

const CELLS = 24;
const dapps = makeDAppCardProps(CELLS);

test('DAppCard × 24 — explorer grid page, initial render', async () => {
  await measureRenders(
    <View>
      {dapps.map(dapp => (
        <DAppCard key={dapp.name} {...dapp} />
      ))}
    </View>,
    { scenario: expectMounted('dapp-card-name'), wrapper: PerfProviders },
  );
});

/**
 * Parent re-render with IDENTICAL cell props — the explorer's search/filter
 * state lives above the grid, so every keystroke re-renders all visible
 * cells. DAppCard is not React.memo, so this duration IS that 24-cell
 * wasted-work bill (same probe pattern as the TokenItem suite).
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
      {dapps.map(dapp => (
        <DAppCard key={dapp.name} {...dapp} />
      ))}
    </View>
  );
};

test('DAppCard × 24 — parent re-render with identical props (×2)', async () => {
  const scenario = async () => {
    await expectMounted('dapp-card-name')();
    fireEvent.press(screen.getByTestId('perf-tick'));
    fireEvent.press(screen.getByTestId('perf-tick'));
  };
  await measureRenders(<IdenticalPropsHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});
