/**
 * SearchBar per-keystroke cost, in both modes. A CONTROLLED input re-renders
 * its consumer on every keystroke — the unmemoized getStyles(theme)
 * StyleSheet.create, the clear-button branch flip, and whatever else the
 * consumer renders, a list included. A SELF-OWNED one keeps the text and
 * re-renders only itself, reporting the settled query (ADR 64). The Reassure
 * pilot caught a screen paying 2 commits per keystroke; this suite pins the
 * shared input's per-keystroke commit structure so that class of regression is
 * caught at the source, and measures what the two modes cost above a list.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { measureRenders } from 'reassure';

import { DRepCard, SearchBar } from '../src';

import { makeDRepCardProps } from './fixtures/dreps';
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

/**
 * Self-owned mode (ADR 64): the same five keystrokes, with the text living
 * inside the field. Reassure counts Profiler commits, and a commit is a commit
 * wherever the state sits, so the count here matches the controlled case by
 * construction — the two pairs below are what the mode is for. Read them in
 * DURATION: the controlled harness re-renders its whole subtree per character,
 * the self-owned one re-renders the input alone.
 */
const SelfOwnedTypingHarness = () => {
  const [committed, setCommitted] = useState('');
  return (
    <>
      <SearchBar onSearchCommit={setCommitted} clearable testID="perf-search" />
      <Text testID="perf-committed">{committed}</Text>
    </>
  );
};

test('SearchBar — self-owned mode, type 5 characters then clear (6 commits)', async () => {
  const scenario = async () => {
    const input = screen.getByTestId('perf-search-input');
    for (const text of ['h', 'ho', 'hos', 'hosk', 'hosky']) {
      fireEvent.changeText(input, text);
    }
    fireEvent.press(screen.getByTestId('perf-search-clear-button'));
  };
  await measureRenders(<SelfOwnedTypingHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});

/**
 * The production shape of the bug this mode fixes: a search field above a list
 * of rows (browse DReps, browse pools, the token picker). Rows are plain
 * DRepCards rather than a FlashList so the measurement is the commit
 * propagation itself, not virtualization: 30 rows ≈ a scrolled page, each
 * running the real BigNumber voting-power formatting when it re-renders.
 */
const LIST_ROWS = 30;
const listRows = makeDRepCardProps(LIST_ROWS);

const RowList = () => (
  <>
    {listRows.map(row => (
      <DRepCard key={row.testID} {...row} />
    ))}
  </>
);

const ControlledSearchOverListHarness = () => {
  const [value, setValue] = useState('');
  return (
    <>
      <SearchBar value={value} onChangeText={setValue} testID="perf-search" />
      <RowList />
    </>
  );
};

const SelfOwnedSearchOverListHarness = () => {
  const [, setCommitted] = useState('');
  return (
    <>
      <SearchBar onSearchCommit={setCommitted} testID="perf-search" />
      <RowList />
    </>
  );
};

const typeFiveCharacters = async () => {
  const input = screen.getByTestId('perf-search-input');
  for (const text of ['h', 'ho', 'hos', 'hosk', 'hosky']) {
    fireEvent.changeText(input, text);
  }
};

test('SearchBar over a 30-row list — controlled, type 5 characters', async () => {
  await measureRenders(<ControlledSearchOverListHarness />, {
    scenario: typeFiveCharacters,
    wrapper: PerfProviders,
  });
});

test('SearchBar over a 30-row list — self-owned, type 5 characters', async () => {
  await measureRenders(<SelfOwnedSearchOverListHarness />, {
    scenario: typeFiveCharacters,
    wrapper: PerfProviders,
  });
});
