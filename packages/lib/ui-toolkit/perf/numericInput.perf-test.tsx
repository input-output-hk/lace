/**
 * NumericInput per-keystroke commit cost: the Send flow's amount input. Each
 * keystroke runs regex validation, the REAL convertAmountToNormalized
 * (BigNumber.js, via the util-render fidelity mock), a BigInt construction
 * and two state updates (internal text + parent bigint value) — this suite
 * pins that per-keystroke commit structure.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import React, { useState } from 'react';
import { measureRenders } from 'reassure';

import { NumericInput } from '../src';

import { PerfProviders } from './testUtils';

const ADA_DECIMALS = 6;

const AmountHarness = () => {
  const [value, setValue] = useState(0n);
  return (
    <NumericInput
      value={value}
      onChange={setValue}
      decimals={ADA_DECIMALS}
      testID="perf-amount"
    />
  );
};

test('NumericInput — type "12.345" (5 keystrokes)', async () => {
  const scenario = async () => {
    const input = screen.getByTestId('perf-amount-value');
    for (const text of ['1', '12', '12.', '12.3', '12.34']) {
      fireEvent.changeText(input, text);
    }
  };
  await measureRenders(<AmountHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});
