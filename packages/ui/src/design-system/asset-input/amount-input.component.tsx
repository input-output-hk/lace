import React from 'react';

import { Box } from '../box';

import * as cx from './amount-input.css';

interface Props {
  onChange?: (value: string) => void;
  value?: string;
  id: string;
}

export const AmountInput = ({
  onChange,
  value,
  id,
}: Readonly<Props>): JSX.Element => {
  return (
    <Box className={cx.amountInputSizer} data-value={value}>
      <input
        className={cx.amountInput}
        value={value}
        size={1}
        onChange={({ target }): void => onChange?.(target.value)}
        placeholder="0.0"
        data-testid={`asset-input-amount-input-${id}`}
      />
    </Box>
  );
};
