/**
 * Shared helpers for perf tests. Reassure excludes the wrapper's own render
 * cost from the measurement, so keep every provider here rather than inside
 * the measured tree.
 */
import type { ReactElement } from 'react';

import { screen } from '@testing-library/react-native';
import React from 'react';

import { ThemeProvider } from '../src';

export const PerfProviders = ({ children }: { children: ReactElement }) => (
  <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
);

/**
 * Pins the branch a suite claims to measure. A fixture that stops mounting it
 * (a prop shape drifting from production, a condition the fixture no longer
 * satisfies) empties the measured tree, and Reassure reports that as a count
 * DROP — an improvement — so nothing else catches it.
 *
 * Queries add no commits, so passing this as `scenario` leaves the measured
 * count unchanged; suites whose scenario already touches the component are
 * guarded by that interaction instead.
 */
export const expectMounted =
  (...testIDs: string[]) =>
  async (): Promise<void> => {
    // getAllBy*: throws when the branch is missing, tolerates the repeats a
    // 50-row list produces.
    for (const testID of testIDs) screen.getAllByTestId(testID);
  };

/** expectMounted for components that expose no testID on the measured branch. */
export const expectTextMounted =
  (...texts: (RegExp | string)[]) =>
  async (): Promise<void> => {
    for (const text of texts) screen.getAllByText(text);
  };
