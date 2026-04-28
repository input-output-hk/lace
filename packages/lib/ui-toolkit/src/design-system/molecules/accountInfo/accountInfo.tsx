import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Row, Text } from '../../atoms';
import { TokenGroupSummary } from '../tokenGroupSummary/tokenGroupSummary';

interface AccountInfoProps {
  wallets?: {
    icon: React.ReactElement | { uri: string };
  }[];
  accounts: {
    name: string;
    icon: React.ReactElement | { uri: string };
  }[];
  showLabels?: boolean;
}

export const AccountInfo = ({
  wallets = [],
  accounts,
  showLabels = true,
}: AccountInfoProps) => {
  const { t } = useTranslation();
  const styles = getStyles();

  const getWalletLabel = useCallback(
    (count: number) => {
      if (!showLabels) return count.toString();
      const walletLabel: string =
        count === 1
          ? t('v2.portfolio-card.wallet')
          : t('v2.portfolio-card.wallets');
      return `${count} ${walletLabel}`;
    },
    [showLabels, t],
  );

  const getAccountLabel = useCallback(
    (count: number) => {
      if (!showLabels) return count.toString();
      const accountLabel: string =
        count === 1
          ? t('v2.portfolio-card.account')
          : t('v2.portfolio-card.accounts');
      return `${count} ${accountLabel}`;
    },
    [showLabels, t],
  );

  const accountTokens = useMemo(
    () =>
      accounts.map(account => ({
        name: account.name,
        icon: account.icon,
      })),
    [accounts],
  );

  const walletTokens = useMemo(
    () =>
      wallets.map(wallet => ({
        name: 'wallet',
        icon: wallet.icon,
      })),
    [wallets],
  );

  return (
    <Row
      justifyContent="space-between"
      alignItems="center"
      style={styles.container}>
      <Row alignItems="center">
        <Row alignItems="center">
          <TokenGroupSummary
            tokens={walletTokens}
            type="tokens"
            size={20}
            hideTokensLabel
          />
          <Text.XS
            variant="secondary"
            style={styles.accountInfo}
            testID="wallet-info">
            {getWalletLabel(wallets.length)}
          </Text.XS>
        </Row>
      </Row>

      <Row alignItems="center">
        <TokenGroupSummary
          tokens={accountTokens}
          type="tokens"
          size={20}
          hideTokensLabel
        />
        <Text.XS style={styles.accountInfo} testID="account-info">
          {getAccountLabel(accounts.length)}
        </Text.XS>
      </Row>
    </Row>
  );
};

const getStyles = () =>
  StyleSheet.create({
    container: {
      gap: spacing.XL,
    },
    accountInfo: {
      marginLeft: spacing.XS,
    },
  });
