import { useTranslation } from '@lace-contract/i18n';
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
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { AccountCardCustomisationProps } from '@lace-contract/app';
import type { Theme } from '@lace-lib/ui-toolkit';

const EMPTY_CHART_DATA = { data: [0, 0] };

export const AccountCardBitcoin = ({
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
    blockchain: 'Bitcoin',
  });

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

  const renderActions = () => (
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
    </Row>
  );

  if (!arePricesAvailable) {
    return (
      <Card cardStyle={cardStyle} blur testID="account-card">
        <AccountCardHeader
          accountName={accountName}
          accountType={accountType}
          blockchain="Bitcoin"
          trailing={accountsButton}
        />
        <Divider />
        {renderActions()}
      </Card>
    );
  }

  return (
    <Card cardStyle={cardStyle} blur testID="account-card">
      <AccountCardHeader
        accountName={accountName}
        accountType={accountType}
        blockchain="Bitcoin"
        trailing={accountsButton}
      />

      <Divider />

      <AccountCardBalance
        balanceCoin={balanceCurrency ?? '0'}
        coin={currency}
        chart={balanceChart}
        style={styles.chartGrow}
      />

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
