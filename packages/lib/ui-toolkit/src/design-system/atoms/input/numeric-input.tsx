import {
  convertAmountToDenominated,
  convertAmountToNormalized,
} from '@lace-lib/util-render';
import React, { useState } from 'react';

import { TextInput } from './text-input';

import type { TextInputProps } from './text-input';

export type NumericInputProps = Omit<
  TextInputProps,
  'onChange' | 'onChangeText' | 'value'
> & {
  value: bigint;
  decimals: number;
  onChange: (value: bigint) => void;
};

export const NumericInput = ({
  value,
  onChange,
  decimals,
  ...restProps
}: NumericInputProps) => {
  const [text, setText] = useState<string>(
    convertAmountToDenominated(value.toString(), decimals),
  );
  const numericInputRegex = new RegExp(`^\\d+([\\.|\\,]\\d{0,${decimals}})?$`);
  return (
    <TextInput
      value={text}
      keyboardType="decimal-pad"
      secureTextEntry={false}
      onChangeText={userInputText => {
        if (userInputText !== '' && !numericInputRegex.test(userInputText)) {
          return;
        }
        setText(userInputText);
        const normalizedValue =
          userInputText === ''
            ? '0'
            : convertAmountToNormalized(
                userInputText.replace(',', '.'),
                decimals,
              );
        onChange(BigInt(normalizedValue));
      }}
      {...restProps}
    />
  );
};
