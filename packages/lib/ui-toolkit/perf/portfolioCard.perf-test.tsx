/**
 * PortfolioCard render cost at production fidelity: the aggregate hero card
 * the Portfolio home screen renders as the carousel's first page (variant
 * "alternative"/"enhanced" — Portfolio.tsx), plus the other variants apps can
 * select. Each variant assembles a different subtree (LineChart sparkline,
 * Tabs, AccountInfo, action buttons), so each gets its own mount measurement.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { measureRenders } from 'reassure';

import { PortfolioCard } from '../src';

import { makePortfolioCardProps } from './fixtures/portfolio';
import { expectTextMounted, PerfProviders } from './testUtils';

const props = makePortfolioCardProps();

// Every variant renders the price value (ultraLight as plain text, the rest
// through the shared Price row); a variant that stops assembling its subtree
// would otherwise read as a count improvement.
const expectCardMounted = expectTextMounted(String(props.price));

test('PortfolioCard — alternative/enhanced (home config), initial render', async () => {
  await measureRenders(
    <PortfolioCard
      {...props}
      variant="alternative"
      alternativeType="enhanced"
    />,
    { scenario: expectCardMounted, wrapper: PerfProviders },
  );
});

test('PortfolioCard — standard, initial render', async () => {
  await measureRenders(<PortfolioCard {...props} variant="standard" />, {
    scenario: expectCardMounted,
    wrapper: PerfProviders,
  });
});

test('PortfolioCard — compact, initial render', async () => {
  await measureRenders(<PortfolioCard {...props} variant="compact" />, {
    scenario: expectCardMounted,
    wrapper: PerfProviders,
  });
});

test('PortfolioCard — ultraLight, initial render', async () => {
  await measureRenders(<PortfolioCard {...props} variant="ultraLight" />, {
    scenario: expectCardMounted,
    wrapper: PerfProviders,
  });
});

/**
 * Per-sync tick on the home configuration: price string and sparkline array
 * are both rebuilt every sync (Portfolio.tsx re-derives them from the store),
 * so nothing is referentially stable — this duration is the real per-sync
 * bill including the d3 path recomputation and the memo cascade inside the
 * card.
 */
const SyncTickHarness = () => {
  const [tick, setTick] = useState(0);
  return (
    <View>
      <Pressable
        testID="perf-sync-tick"
        onPress={() => {
          setTick(previous => previous + 1);
        }}
      />
      <PortfolioCard
        {...makePortfolioCardProps(tick)}
        variant="alternative"
        alternativeType="enhanced"
      />
    </View>
  );
};

test('PortfolioCard — per-sync price + sparkline update (×2)', async () => {
  const scenario = async () => {
    await expectCardMounted();
    fireEvent.press(screen.getByTestId('perf-sync-tick'));
    fireEvent.press(screen.getByTestId('perf-sync-tick'));
  };
  await measureRenders(<SyncTickHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});
