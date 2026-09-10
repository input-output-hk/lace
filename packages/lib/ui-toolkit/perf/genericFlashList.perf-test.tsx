/**
 * GenericFlashList render cost: the shared list organism EVERY list template
 * renders through (browsePool, addressBook, dappExplorer, governanceCenter,
 * stakeCenter, nftItemsList, activityList) plus direct consumers
 * (BrowseDRepSheet, SwapSelectToken). Rows are intentionally trivial so the
 * measurement isolates the wrapper's own overhead (theme lookup, extraData
 * merge, remount-token wiring, AnimatedFlashList) — real rows are guarded by
 * their own suites.
 */

import { fireEvent, screen } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { measureRenders } from 'reassure';

import { GenericFlashList } from '../src';

import { makeFlashListRows, type PerfRow } from './fixtures/flashListRows';
import { expectTextMounted, PerfProviders } from './testUtils';

import type { ListRenderItem } from '@shopify/flash-list';

const ROWS = 100;
const rows = makeFlashListRows(ROWS);

// Module-level renderers: stable references so the update scenario measures
// ONLY the data-array replacement, never a new renderItem identity.
const renderRow: ListRenderItem<PerfRow> = ({ item }) => (
  <View>
    <Text>{item.title}</Text>
    <Text>{item.subtitle}</Text>
  </View>
);
const keyExtractor = (item: PerfRow) => item.id;

// Rows are plain Text; a virtualization change that stops rendering them
// would drop the count and read as an improvement.
const expectRowsMounted = expectTextMounted('Row 0');

test('GenericFlashList — 100 trivial rows, initial render', async () => {
  await measureRenders(
    <GenericFlashList<PerfRow>
      data={rows}
      renderItem={renderRow}
      keyExtractor={keyExtractor}
    />,
    { scenario: expectRowsMounted, wrapper: PerfProviders },
  );
});

/**
 * Per-sync data replacement: every sync feeds the list a NEW array with NEW
 * item objects (same ids, same length — the selector-rebuild pattern). This
 * duration is what the whole app pays per sync per visible list when nothing
 * actually changed on screen.
 */
const DataReplacementHarness = () => {
  const [tick, setTick] = useState(0);
  return (
    <View>
      <Pressable
        testID="perf-replace-data"
        onPress={() => {
          setTick(previous => previous + 1);
        }}
      />
      <GenericFlashList<PerfRow>
        data={makeFlashListRows(ROWS, tick)}
        renderItem={renderRow}
        keyExtractor={keyExtractor}
      />
    </View>
  );
};

test('GenericFlashList — 100 rows, per-sync data replacement (×2)', async () => {
  const scenario = async () => {
    await expectRowsMounted();
    fireEvent.press(screen.getByTestId('perf-replace-data'));
    fireEvent.press(screen.getByTestId('perf-replace-data'));
  };
  await measureRenders(<DataReplacementHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});
