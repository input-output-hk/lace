import { useTranslation } from '@lace-contract/i18n';
import {
  NIGHT_TOKEN_ID,
  toUnshieldedTokenType,
} from '@lace-contract/midnight-context';
import { AccountId } from '@lace-contract/wallet-repo';
import {
  AccountCardBalance,
  AccountCardHeader,
  Card,
  Row,
  Divider,
  Icon,
  ActionButton,
  LineChart,
  spacing,
  radius,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLaceSelector, useMidnightDustData } from '../hooks';

import { AccountCardMidnightActions } from './AccountCardMidnightActions';
import { AccountCardMidnightContent } from './AccountCardMidnightContent';

import type { AccountCardCustomisationProps } from '@lace-contract/app';
import type { MidnightSpecificTokenMetadata } from '@lace-contract/midnight-context';
import type { Token } from '@lace-contract/tokens';
import type { Theme } from '@lace-lib/ui-toolkit';

const EMPTY_CHART_DATA = { data: [0, 0] };

export const AccountCardMidnight = ({
  accountId,
  accountName,
  currency,
  balanceCurrency,
  onSendPress,
  onReceivePress,
  onAccountsPress,
  arePricesAvailable,
  containerStyle,
}: AccountCardCustomisationProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const accountType = t('v2.portfolio.account.blockchainAccountType', {
    blockchain: 'Midnight',
  });

  const networkId = useLaceSelector('midnightContext.selectNetworkId');
  const nightTokenId = toUnshieldedTokenType(NIGHT_TOKEN_ID, networkId);
  const accountFungibleTokens = useLaceSelector(
    'tokens.selectAggregatedFungibleTokensByAccountId',
    accountId,
  );

  const nightToken = useMemo(
    () =>
      accountFungibleTokens.find(token => token.tokenId === nightTokenId) as
        | Token<MidnightSpecificTokenMetadata>
        | undefined,
    [accountFungibleTokens, nightTokenId],
  );

  const accounts = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const account = useMemo(
    () => accounts.find(a => a.accountId === accountId),
    [accounts, accountId],
  );
  const singleAccount = useMemo(() => (account ? [account] : []), [account]);
  const dustDataByAccount = useMidnightDustData(singleAccount);
  const dustData = dustDataByAccount[AccountId(accountId)];

  const styles = useMemo(() => getStyles(theme), [theme]);

  const cardStyle = useMemo(
    () => [styles.card, containerStyle].filter(Boolean),
    [styles.card, containerStyle],
  );

  const accountsButton = useMemo(
    () => (
      <ActionButton
        icon={<Icon name="CarouselHorizontal" size={20} />}
        title={t('v2.portfolio-card.accounts')}
        textAlign="center"
        onPress={onAccountsPress}
        containerStyle={styles.outlinedButton}
        iconStyle={styles.iconStyle}
        testID="account-card-accounts-button"
      />
    ),
    [t, onAccountsPress, styles],
  );

  const balanceChart = useMemo(
    () => (
      <View style={styles.chartContainer}>
        <LineChart data={EMPTY_CHART_DATA} />
      </View>
    ),
    [styles.chartContainer],
  );

  const renderActions = useCallback(
    () => (
      <Row
        justifyContent="space-between"
        alignItems="center"
        style={styles.actionsWrapper}>
        <ActionButton
          icon="ArrowUp"
          title={t('v2.menu.send')}
          onPress={onSendPress}
          containerStyle={styles.actionButton}
          testID="account-card-send-button"
        />
        <ActionButton
          icon="ArrowDown"
          title={t('v2.menu.receive')}
          onPress={onReceivePress}
          containerStyle={styles.actionButton}
          testID="account-card-receive-button"
        />
        <AccountCardMidnightActions
          accountId={accountId}
          dustData={dustData}
          nightToken={nightToken}
        />
      </Row>
    ),
    [t, onSendPress, onReceivePress, accountId, dustData, nightToken, styles],
  );

  return (
    <Card cardStyle={cardStyle} blur testID="account-card">
      <AccountCardHeader
        accountName={accountName}
        accountType={accountType}
        blockchain="Midnight"
        trailing={accountsButton}
      />

      <Divider />

      {arePricesAvailable && (
        <AccountCardBalance
          balanceCoin={balanceCurrency ?? '0'}
          coin={currency}
          chart={balanceChart}
          style={styles.chartGrow}
        />
      )}

      <AccountCardMidnightContent accountId={accountId} dustData={dustData} />

      <Divider />

      {renderActions()}
    </Card>
  );
};

const getStyles = (theme: Theme) => ({
  ...StyleSheet.create({
    card: {
      borderRadius: radius.M,
      paddingTop: spacing.M,
      paddingHorizontal: spacing.M,
      paddingBottom: spacing.S,
      backgroundColor: theme.background.primary,
    },
    actionButton: {
      backgroundColor: 'transparent',
    },
    outlinedButton: {
      backgroundColor: theme.background.primary,
      borderWidth: 1,
      borderColor: theme.border.middle,
      flexGrow: 0.5,
    },
    actionsWrapper: {
      width: '100%',
    },
    chartGrow: {
      flex: 1,
    },
    chartContainer: {
      flex: 1,
      alignSelf: 'stretch',
      marginLeft: spacing.M,
      overflow: 'hidden',
    },
  }),
  iconStyle: { size: 20 } as const,
});
