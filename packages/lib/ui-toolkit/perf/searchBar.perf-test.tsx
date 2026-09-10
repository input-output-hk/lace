/**
 * SearchBar per-keystroke commit cost. Every search surface (tokens, NFTs,
 * pools, dapps, address book) renders this as a CONTROLLED input, so each
 * keystroke re-renders the harness + SearchBar — including the unmemoized
 * getStyles(theme) StyleSheet.create and the clear-button branch flip on the
 * first/last character. The Reassure pilot caught a screen paying 2 commits
 * per keystroke; this suite pins the shared input's per-keystroke commit
 * structure so that class of regression is caught at the source.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import React, { useState } from 'react';
import { measureRenders } from 'reassure';

import { SearchBar } from '../src';

import { PerfProviders } from './testUtils';

const TypingHarness = () => {
  const [value, setValue] = useState('');
  return (
    <SearchBar
      value={value}
      onChangeText={setValue}
      clearable
      testID="perf-search"
    />
  );
};

/**
 * 5 keystrokes ("hosky") + clear-button press: 6 controlled-value commits.
 * The first keystroke also mounts the clear button; the clear press unmounts
 * it — both branch flips are part of the production typing flow.
 */
test('SearchBar — type 5 characters then clear (6 commits)', async () => {
  const scenario = async () => {
    const input = screen.getByTestId('perf-search-input');
    for (const text of ['h', 'ho', 'hos', 'hosk', 'hosky']) {
      fireEvent.changeText(input, text);
    }
    fireEvent.press(screen.getByTestId('perf-search-clear-button'));
  };
  await measureRenders(<TypingHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});
