/**
 * TokenItem render cost at production fidelity: the exact component the
 * portfolio token list renders per row on every platform (lace-next /
 * lace-mobile / lace-extension). Guarding it here, in the owning package,
 * catches a per-row regression once for all consumers.
 *
 * Mount + re-render scenarios. Memoization (useMemo/useCallback/React.memo)
 * only pays off across RE-renders, so the update harnesses drive state
 * changes and let Reassure quantify the per-update cost. How to read them:
 * Reassure's render COUNT counts COMMITS of the measured tree (a parent
 * update that re-renders all 50 rows is still 1 commit), so memoization
 * changes surface in DURATION — structurally, not as noise: memoizing
 * TokenItem would collapse the identical-props update cost by ~50×. COUNT
 * still gates the commit structure (an accidental extra state update per
 * press shows up deterministically).
 */
import { fireEvent, screen } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { measureRenders } from 'reassure';

import { ThemeProvider, TokenItem, useTheme } from '../src';

import { makeTokenItemProps } from './fixtures/tokens';
import { expectMounted, PerfProviders } from './testUtils';

const ROWS = 50;
const tokens = makeTokenItemProps(ROWS);

test('TokenItem × 50 — initial render', async () => {
  await measureRenders(
    <View>
      {tokens.map(token => (
        <TokenItem key={token.testID} {...token} />
      ))}
    </View>,
    { scenario: expectMounted('perf-token-0'), wrapper: PerfProviders },
  );
});

/**
 * Parent re-renders with IDENTICAL row props. Today TokenItem is not
 * React.memo, so every press re-renders all 50 rows inside one commit; the
 * duration of this test IS that cost. If someone memoizes TokenItem the
 * duration collapses; if someone adds per-row update work it grows. The tick
 * presses produce host-identical output, so Reassure also flags them under
 * redundantUpdates — expected: they are the probe.
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
      {tokens.map(token => (
        <TokenItem key={token.testID} {...token} />
      ))}
    </View>
  );
};

test('TokenItem × 50 — parent re-render with identical props (×2)', async () => {
  const scenario = async () => {
    await expectMounted('perf-token-0')();
    fireEvent.press(screen.getByTestId('perf-tick'));
    fireEvent.press(screen.getByTestId('perf-tick'));
  };
  await measureRenders(<IdenticalPropsHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});

/**
 * ONE row's balance changes (the per-sync portfolio scenario). Guards row
 * isolation: with no row memoization the whole list pays for one balance
 * tick, and this duration is that bill. Balance grows deterministically by
 * string append — no Date.now/Math.random.
 */
const SingleRowUpdateHarness = () => {
  const [rows, setRows] = useState(() => makeTokenItemProps(ROWS));
  return (
    <View>
      <Pressable
        testID="perf-bump-first-row"
        onPress={() => {
          setRows(([first, ...rest]) => [
            { ...first, balance: `${first.balance}1` },
            ...rest,
          ]);
        }}
      />
      {rows.map(token => (
        <TokenItem key={token.testID} {...token} />
      ))}
    </View>
  );
};

test('TokenItem × 50 — single row balance update (×2)', async () => {
  const scenario = async () => {
    await expectMounted('perf-token-0')();
    fireEvent.press(screen.getByTestId('perf-bump-first-row'));
    fireEvent.press(screen.getByTestId('perf-bump-first-row'));
  };
  await measureRenders(<SingleRowUpdateHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});

/**
 * Theme switch (light → dark → light). The ThemeProvider context value is
 * rebuilt on provider render, so a toggle re-renders every consumer; with 50
 * rows this measures the full re-theming bill — including TokenItem's
 * unmemoized per-render getStyles(theme) StyleSheet.create. Guards the
 * theming mechanism shared by all three apps.
 *
 * The provider lives INSIDE the measured tree (no wrapper) on purpose:
 * Reassure's Profiler sits between the wrapper and the ui
 * (Wrapper > Profiler > ui), and updates originating in the wrapper never
 * fire the Profiler's onRender — verified empirically: with the provider in
 * the wrapper, toggles re-rendered all consumers (probe below) yet count and
 * duration stayed at mount level. Measuring the provider too is the honest
 * scope anyway: its render is part of the re-theming bill.
 *
 * Self-validating: the probe text renders the active background color, and
 * the scenario ASSERTS it changed after each toggle — a toggle that stops
 * re-rendering consumers fails the test instead of silently measuring only
 * the mount.
 */
const ThemeToggleProbe = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <Pressable
      testID="perf-toggle-theme"
      onPress={() => {
        toggleTheme();
      }}>
      <Text testID="perf-theme-probe">{String(theme.background.primary)}</Text>
    </Pressable>
  );
};

const ThemeSwitchHarness = () => (
  <ThemeProvider defaultTheme="light">
    <View>
      <ThemeToggleProbe />
      {tokens.map(token => (
        <TokenItem key={token.testID} {...token} />
      ))}
    </View>
  </ThemeProvider>
);

test('TokenItem × 50 — theme switch light↔dark (×2)', async () => {
  // RNTL's query types don't resolve under this island's eslint project on
  // this branch (react-test-renderer/RNTL type-version skew), so the instance
  // is asserted to the minimal shape the probe reads.
  const probeColor = (): string => {
    const probe = screen.getByTestId('perf-theme-probe') as unknown as {
      props: { children?: unknown };
    };
    return String(probe.props.children);
  };
  const scenario = async () => {
    const lightColor = probeColor();
    fireEvent.press(screen.getByTestId('perf-toggle-theme'));
    if (probeColor() === lightColor)
      throw new Error('theme toggle did not re-render consumers');
    fireEvent.press(screen.getByTestId('perf-toggle-theme'));
    if (probeColor() !== lightColor)
      throw new Error('second toggle did not restore the light theme');
  };
  await measureRenders(<ThemeSwitchHarness />, { scenario });
});
