/**
 * LiquiditySource render costs: the swap flow's quote rows + source toggle.
 * Quotes REFRESH periodically while the user watches the screen, so the
 * per-refresh update cost is paid in a loop — that scenario is the point of
 * this suite.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import noop from 'lodash/noop';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { measureRenders } from 'reassure';

import { LiquiditySourceQuote, LiquiditySourceToggle } from '../src';

import { expectMounted, PerfProviders } from './testUtils';

const SOURCES = ['Minswap', 'SundaeSwap', 'WingRiders', 'MuesliSwap'];

const makeQuote = (index: number, tick: number) =>
  `${1000 + index * 37 + tick}.${String((index + tick) % 100).padStart(
    2,
    '0',
  )} DJED`;

const QuotesScreen = ({ tick = 0 }: { tick?: number }) => (
  <View>
    <LiquiditySourceToggle
      name="All sources"
      value={true}
      onValueChange={noop}
      testID="perf-liquidity-toggle"
    />
    {SOURCES.map((name, index) => (
      <LiquiditySourceQuote
        key={name}
        name={name}
        icon={{ uri: `https://dex.example/${index}.png` }}
        quote={makeQuote(index, tick)}
        testID={`perf-quote-${index}`}
      />
    ))}
  </View>
);

test('LiquiditySource — toggle + 4 quotes, initial render', async () => {
  await measureRenders(<QuotesScreen />, {
    scenario: expectMounted('perf-quote-0', 'perf-liquidity-toggle'),
    wrapper: PerfProviders,
  });
});

/** Quote refresh: every source's quote string changes together each poll. */
const RefreshHarness = () => {
  const [tick, setTick] = useState(0);
  return (
    <View>
      <Pressable
        testID="perf-quote-refresh"
        onPress={() => {
          setTick(previous => previous + 1);
        }}
      />
      <QuotesScreen tick={tick} />
    </View>
  );
};

test('LiquiditySource — quote refresh across 4 sources (×2)', async () => {
  const scenario = async () => {
    await expectMounted('perf-quote-0')();
    fireEvent.press(screen.getByTestId('perf-quote-refresh'));
    fireEvent.press(screen.getByTestId('perf-quote-refresh'));
  };
  await measureRenders(<RefreshHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});
