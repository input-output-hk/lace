import type { StyleProp, ViewStyle } from 'react-native';

import React from 'react';
import { StyleSheet } from 'react-native';

import { Text, Row, Column } from '../../atoms';

export type AccountCardBalanceProps = {
  balanceCoin: string;
  coin: string;
  balanceCurrency?: string;
  currency?: string;
  chart?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const AccountCardBalance: React.FC<AccountCardBalanceProps> = ({
  balanceCurrency,
  currency,
  chart,
  balanceCoin,
  coin,
  style,
}) => (
  <Row alignItems="center" style={style}>
    <Column
      alignItems={chart ? 'center' : undefined}
      style={chart ? styles.balanceColumn : undefined}>
      <Text.L testID="account-card-balance-currency">
        {balanceCurrency ?? balanceCoin} <Text.XS>{currency ?? coin}</Text.XS>
      </Text.L>
    </Column>
    {chart}
  </Row>
);

const styles = StyleSheet.create({
  balanceColumn: {
    flex: 1,
  },
});
