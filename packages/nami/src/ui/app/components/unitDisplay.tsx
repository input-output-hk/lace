import React from 'react';

import { Box } from '@chakra-ui/react';

import { displayUnit } from '../../../api/extension';

const hideZero = (str: string) =>
  str.endsWith('0') ? hideZero(str.slice(0, -1)) : str;

interface Props {
  quantity?: bigint | number | string;
  decimals?: number | string;
  symbol?: React.ReactNode;
  hide?: boolean;
  fontSize?: number | string;
  fontWeight?: number | string;
  color?: string;
  display?: string;
}

const UnitDisplay = ({
  quantity,
  decimals,
  symbol,
  hide = false,
  ...props
}: Readonly<Props>) => {
  const num = displayUnit(quantity, decimals)
    .toLocaleString('en-EN', { minimumFractionDigits: Number(decimals) })
    .split('.')[0];
  const subNum = displayUnit(quantity, decimals)
    .toLocaleString('en-EN', { minimumFractionDigits: Number(decimals) })
    .split('.')[1];
  return (
    <Box {...props}>
      {quantity || quantity === 0 || typeof quantity === 'bigint' ? (
        <>
          {num}
          {(hide && hideZero(subNum).length <= 0) || decimals == 0 ? '' : '.'}
          <span style={{ fontSize: '75%' }}>
            {hide ? hideZero(subNum) : subNum}
          </span>{' '}
        </>
      ) : (
        '... '
      )}
      {symbol}
    </Box>
  );
};

export default UnitDisplay;
