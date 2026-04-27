import * as React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Button, Column, CustomTag, Icon, Row, Text } from '../../atoms';
import { TokenItem } from '../../molecules';

export interface ClaimSuccessToken {
  assetId: string;
  name: string;
  balance: string;
  image: string;
}

export interface ClaimSuccessProps {
  title: string;
  description: string;
  adaBalance: string | undefined;
  adaLogo: string | undefined;
  tokens: ClaimSuccessToken[];
  shouldShowViewTransactionButton: boolean;
  viewTransactionLabel: string;
  doneLabel: string;
  onViewTransaction: () => void;
  onDone: () => void;
}

export const ClaimSuccess = ({
  title,
  description,
  adaBalance,
  adaLogo,
  tokens,
  shouldShowViewTransactionButton,
  viewTransactionLabel,
  doneLabel,
  onViewTransaction,
  onDone,
}: ClaimSuccessProps) => (
  <Column
    justifyContent="space-between"
    style={styles.container}
    testID="claim-success-screen">
    <Column justifyContent="center" alignItems="center" gap={spacing.L}>
      <Text.L testID="claim-success-title">{title}</Text.L>
      <CustomTag
        icon={<Icon name="AlarmClock" size={16} />}
        label={description}
        size="M"
        backgroundType="semiTransparent"
      />
    </Column>
    <Column
      justifyContent="center"
      gap={spacing.S}
      testID="claim-success-tokens">
      {!!adaBalance && (
        <TokenItem
          name="ADA"
          logo={adaLogo}
          balance={adaBalance}
          currency={''}
          testID="claim-success-ada-token"
        />
      )}
      {tokens.map(token => (
        <TokenItem
          key={token.assetId}
          logo={token.image}
          name={token.name}
          balance={token.balance}
          currency={''}
          chainSymbol={'Cardano'}
        />
      ))}
    </Column>
    <Row gap={spacing.S}>
      {shouldShowViewTransactionButton && (
        <Button.Secondary
          flex={1}
          label={viewTransactionLabel}
          onPress={onViewTransaction}
          testID="claim-success-view-tx-btn"
        />
      )}
      <Button.Primary
        flex={1}
        label={doneLabel}
        onPress={onDone}
        testID="claim-success-done-btn"
      />
    </Row>
  </Column>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.M,
    paddingVertical: spacing.XXL,
  },
});
