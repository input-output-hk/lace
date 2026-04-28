import React from 'react';

import { Column, Text } from '../../atoms';

import { LineSimple } from './LineSimple';

export interface ValueWithExchange {
  value: string;
  valueTicker: string;
  exchange: string;
  exchangeTicker: string;
}

export interface LineWithValueAndExchangeProps {
  label: string;
  value: ValueWithExchange;
}

export const LineWithValueAndExchange = ({
  label,
  value,
}: LineWithValueAndExchangeProps) => (
  <LineSimple
    label={label}
    content={
      <Column alignItems="flex-end">
        <Text.M>{`${value.value} ${value.valueTicker}`}</Text.M>
        <Text.S variant="secondary">{`${value.exchange} ${value.exchangeTicker}`}</Text.S>
      </Column>
    }
  />
);
