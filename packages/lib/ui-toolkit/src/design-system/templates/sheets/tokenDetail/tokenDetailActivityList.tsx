import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import { spacing, radius } from '../../../../design-tokens';
import { Avatar, Card, Column, Icon, Row, Text } from '../../../atoms';
import { getAssetImageUrl } from '../../../util';

import type { Theme } from '../../../../design-tokens';
import type { IconName } from '../../../atoms';

export interface Transaction {
  accountId: string;
  walletId: string;
  blockchainName: string;
  accountName: string;
  walletName: string;
  name: string;
  amount: string;
  currency: string;
  fiatValue: string;
}

export type SelectedToken = {
  blockchainName?: IconName;
  metadata?: {
    image?: string;
    fallback?: string;
  };
};

type TokenListProps = {
  labels: {
    tokenDistributionLabel: string;
  };
  utils: {
    theme: Theme;
    isPortfolioView: boolean;
  };
  globalState: {
    transactions: Transaction[];
    selectedToken?: SelectedToken;
    onTokenPress: (transaction: Transaction) => void;
  };
  isTokenPricingEnabled: boolean;
};

const getAvatarContent = (
  transaction: Transaction,
  selectedToken?: SelectedToken,
) => {
  const imageUrl = getAssetImageUrl(selectedToken?.metadata?.image);
  return {
    size: spacing.XXL,
    shape: 'rounded' as const,
    content: {
      ...(imageUrl && { img: { uri: imageUrl } }),
      fallback: transaction.name,
    },
  };
};

const TransactionList = (props: {
  transactions: Transaction[];
  theme: Theme;
  tokenDistributionLabel: string;
  selectedToken?: SelectedToken;
  onTokenPress: (transaction: Transaction) => void;
  isTokenPricingEnabled: boolean;
}) => {
  const {
    transactions,
    theme,
    tokenDistributionLabel,
    selectedToken,
    onTokenPress,
    isTokenPricingEnabled,
  } = props;
  const defaultStyles = styles(theme);

  return (
    <Column gap={spacing.S}>
      <Row
        alignItems="center"
        gap={spacing.S}
        style={defaultStyles.sectionHeader}>
        <Icon name="Coins" size={16} color={theme.text.secondary} />
        <Text.M testID="token-distribution-tag">
          {tokenDistributionLabel}
        </Text.M>
      </Row>

      {transactions.length > 0 &&
        transactions.map((transaction, index) => {
          const avatarContent = getAvatarContent(transaction, selectedToken);

          return (
            <Pressable
              key={index}
              onPress={() => {
                onTokenPress(transaction);
              }}
              testID={`token-distribution-entry-${index}`}>
              <Card cardStyle={defaultStyles.transactionItem}>
                <Row alignItems="center">
                  <View style={defaultStyles.transactionIcon}>
                    <Avatar {...avatarContent} />
                  </View>
                  <Column style={defaultStyles.transactionDetails}>
                    <Text.M numberOfLines={1} testID="account-name">
                      {transaction.accountName}
                    </Text.M>
                    <Text.XS
                      numberOfLines={1}
                      style={defaultStyles.textSecondary}
                      testID="wallet-name">
                      {transaction.walletName}
                    </Text.XS>
                  </Column>
                  <Row gap={spacing.S} alignItems="center">
                    <Column style={defaultStyles.transactionAmount}>
                      <Text.M testID="transaction-amount">
                        {transaction.amount}
                      </Text.M>
                      {isTokenPricingEnabled && transaction.fiatValue && (
                        <Text.XS
                          style={defaultStyles.textSecondary}
                          testID="transaction-fiat-value-and-currency">
                          {transaction.fiatValue} {transaction.currency}
                        </Text.XS>
                      )}
                    </Column>
                    <Icon
                      name="CaretRight"
                      size={18}
                      color={theme.text.secondary}
                    />
                  </Row>
                </Row>
              </Card>
            </Pressable>
          );
        })}
    </Column>
  );
};

/**
 * Renders the per-token distribution list in the portfolio-view variant of
 * the token detail sheet. The per-account (`!isPortfolioView`) variant
 * now renders the activity list itself as the sheet's scroll container via
 * `ActivityList`, so this component is portfolio-only.
 */
export const TokenDetailActivityList = ({
  labels,
  utils,
  globalState,
  isTokenPricingEnabled,
}: TokenListProps): React.ReactNode => {
  const { tokenDistributionLabel } = labels;
  const { theme } = utils;
  const { transactions, selectedToken, onTokenPress } = globalState;

  return (
    <TransactionList
      onTokenPress={onTokenPress}
      transactions={transactions}
      theme={theme}
      selectedToken={selectedToken}
      tokenDistributionLabel={tokenDistributionLabel}
      isTokenPricingEnabled={isTokenPricingEnabled}
    />
  );
};

const styles = (theme: Theme) =>
  StyleSheet.create({
    sectionHeader: {
      marginBottom: spacing.XS,
    },
    transactionItem: {
      marginVertical: spacing.XS,
      borderRadius: radius.M,
    },
    transactionIcon: {
      marginRight: spacing.S,
    },
    transactionDetails: {
      flex: 1,
    },
    textSecondary: {
      color: theme.text.secondary,
    },
    transactionAmount: {
      alignItems: 'flex-end',
    },
  });
