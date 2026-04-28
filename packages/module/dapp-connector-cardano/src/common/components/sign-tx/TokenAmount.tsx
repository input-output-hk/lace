import { Avatar, Row, spacing, Text } from '@lace-lib/ui-toolkit';
import React from 'react';

/** Compact token row: avatar + amount + symbol (sendResultSheet-style). */
export interface TokenAmountProps {
  amount: string;
  symbol: string;
  isPositive: boolean;
  imageUrl?: string;
  /** Base test ID; children use -avatar, -value */
  testID?: string;
}

/** Compact row: 25px avatar + amount and symbol. */
export const TokenAmount = ({
  amount,
  symbol,
  isPositive,
  imageUrl,
  testID,
}: TokenAmountProps) => {
  return (
    <Row alignItems="center" gap={spacing.S} testID={testID}>
      <Avatar
        content={{
          ...(imageUrl && { img: { uri: imageUrl } }),
          fallback: symbol,
        }}
        size={25}
        shape="squared"
        testID={testID ? `${testID}-avatar` : undefined}
      />
      <Row testID={testID ? `${testID}-value` : undefined}>
        <Text.XS variant="secondary">
          {`${isPositive ? '+' : '-'}${amount} `}
        </Text.XS>
        <Text.XS>{symbol}</Text.XS>
      </Row>
    </Row>
  );
};
