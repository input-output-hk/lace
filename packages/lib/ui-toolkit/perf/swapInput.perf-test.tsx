/**
 * SwapInput per-keystroke commit cost: the swap flow's amount field, a
 * CONTROLLED input (amount + onAmountChange) with regex validation in the
 * component and a fiat conversion line that re-renders per keystroke.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import React, { useState } from 'react';
import { measureRenders } from 'reassure';

import { SwapInput } from '../src';

import { PerfProviders } from './testUtils';

const TOKEN = {
  name: 'ADA',
  icon: { uri: 'https://token.example/ada.png' },
  balance: '12,034.56',
};

const SwapTypingHarness = () => {
  const [amount, setAmount] = useState('');
  return (
    <SwapInput
      token={TOKEN}
      amount={amount}
      fiatAmount={amount === '' ? '0.00' : `${amount}0`}
      onAmountChange={setAmount}
      placeholder="Select token"
      testID="perf-swap"
    />
  );
};

test('SwapInput — type "12.345" (5 keystrokes)', async () => {
  const scenario = async () => {
    const input = screen.getByTestId('perf-swap-amount-input');
    for (const text of ['1', '12', '12.', '12.3', '12.34']) {
      fireEvent.changeText(input, text);
    }
  };
  await measureRenders(<SwapTypingHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});
