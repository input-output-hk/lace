/**
 * RecoveryPhrase render cost: the 24-word grid (12 rows × 2 IndexedChip +
 * BlurTextView cells) rendered by onboarding's phrase display and settings'
 * reveal flow on every platform. The reveal toggle is the security-critical
 * interaction: flipping isBlurred re-renders all 24 cells and
 * mounts/unmounts each cell's BlurView overlay.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { measureRenders } from 'reassure';

import { RecoveryPhrase } from '../src';

import { makeRecoveryPhraseWords } from './fixtures/recoveryPhrase';
import { expectMounted, PerfProviders } from './testUtils';

const words = makeRecoveryPhraseWords();

test('RecoveryPhrase — 24 words blurred, initial render', async () => {
  await measureRenders(<RecoveryPhrase words={words} isBlurred />, {
    scenario: expectMounted('recovery-phrase-word-1-blur'),
    wrapper: PerfProviders,
  });
});

const RevealHarness = () => {
  const [isBlurred, setIsBlurred] = useState(true);
  return (
    <View>
      <Pressable
        testID="perf-toggle-blur"
        onPress={() => {
          setIsBlurred(previous => !previous);
        }}
      />
      <RecoveryPhrase words={words} isBlurred={isBlurred} />
    </View>
  );
};

test('RecoveryPhrase — reveal + hide 24 words (×2)', async () => {
  const scenario = async () => {
    await expectMounted('recovery-phrase-word-1-blur')();
    fireEvent.press(screen.getByTestId('perf-toggle-blur'));
    fireEvent.press(screen.getByTestId('perf-toggle-blur'));
  };
  await measureRenders(<RevealHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});
