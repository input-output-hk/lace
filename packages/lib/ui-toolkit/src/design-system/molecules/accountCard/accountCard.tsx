import type { StyleProp, ViewStyle } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import noop from 'lodash/noop';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import {
  Icon,
  IconButton,
  Text,
  ActionButton,
  Card,
  LineChart,
  Row,
  Column,
  Divider,
} from '../../atoms';
import { isWeb } from '../../util';
import { TokenGroupSummary } from '../tokenGroupSummary/tokenGroupSummary';

import { AccountCardBalance } from './AccountCardBalance';
import { AccountCardHeader } from './AccountCardHeader';

import type { Theme } from '../../../design-tokens';
import type { BlockchainName } from '@lace-lib/util-store';

const LINE_CHART_HEIGHT = {
  web: 50,
  mobile: 64,
};
const chartHeight = isWeb ? LINE_CHART_HEIGHT.web : LINE_CHART_HEIGHT.mobile;

export type AccountCardVariant =
  | 'alternative'
  | 'clear'
  | 'compact'
  | 'standard';

const ICON_STYLE = { size: 20 } as const;

const showAccountsButton = (variant: AccountCardVariant) =>
  variant === 'standard' || variant === 'clear';

export type AccountCardProps = {
  avatarImage?: { uri: string };
  accountName: string;
  accountType: string;
  blockchain?: BlockchainName;
  balanceCoin: string;
  balanceCurrency: string;
  coin: string;
  currency: string;
  tokens?: Array<{
    icon?: { uri: string };
    name: string;
  }>;
  nfts?: Array<{
    icon?: { uri: string };
    name: string;
  }>;
  rewards?: string;
  chartData?: number[];
  onAccountsPress?: () => void;
  onBuyPress?: () => void;
  onSendPress?: () => void;
  onReceivePress?: () => void;
  onDashboardPress?: () => void;
  onSwapPress?: () => void;
  variant?: AccountCardVariant;
  isShielded?: boolean;
  showTokenGroupSummary?: boolean;
  arePricesAvailable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  formatChartValue?: (value: number) => string;
};

export const AccountCard: React.FC<AccountCardProps> = ({
  avatarImage,
  accountName,
  accountType,
  blockchain = 'Cardano',
  balanceCoin,
  balanceCurrency,
  tokens,
  nfts,
  rewards,
  chartData,
  onBuyPress,
  onAccountsPress = noop,
  onSendPress = noop,
  onReceivePress = noop,
  onDashboardPress = noop,
  onSwapPress,
  variant = 'standard',
  isShielded,
  coin = 'ADA',
  currency = 'USD',
  arePricesAvailable = true,
  containerStyle,
  formatChartValue,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const styles = useMemo(() => getStyles(theme), [theme]);
  const shouldRenderChart = useMemo(() => {
    return !!variant && (variant === 'standard' || variant === 'clear');
  }, [variant]);

  const balanceChart = useMemo(
    () =>
      shouldRenderChart ? (
        <View style={styles.chartContainer}>
          <LineChart
            data={{
              data: chartData && chartData.length > 0 ? chartData : [0, 0],
            }}
            formatValue={formatChartValue}
          />
        </View>
      ) : undefined,
    [shouldRenderChart, chartData, styles.chartContainer, formatChartValue],
  );

  const SharedActionButtons = useCallback(
    ({ showTitle = true }: { showTitle?: boolean }) => (
      <>
        <ActionButton
          icon="ArrowUp"
          title={t('v2.menu.send')}
          showTitle={showTitle}
          onPress={onSendPress}
          containerStyle={styles.actionButton}
          testID="account-card-send-button"
        />
        <ActionButton
          icon="ArrowDown"
          title={t('v2.menu.receive')}
          showTitle={showTitle}
          onPress={onReceivePress}
          containerStyle={styles.actionButton}
          testID="account-card-receive-button"
        />
      </>
    ),
    [t, onSendPress, onReceivePress, styles.actionButton],
  );

  const renderBalance = () => (
    <AccountCardBalance
      balanceCoin={balanceCoin || '0'}
      coin={coin}
      balanceCurrency={balanceCurrency || '0'}
      currency={currency}
      chart={balanceChart}
      style={styles.chartGrow}
    />
  );

  const accountsButton = useMemo(
    () => (
      <ActionButton
        icon={<Icon name="CarouselHorizontal" size={20} />}
        title={t('v2.portfolio-card.accounts')}
        textAlign="center"
        onPress={onAccountsPress}
        containerStyle={styles.outlinedButton}
        iconStyle={ICON_STYLE}
        testID="account-card-accounts-button"
      />
    ),
    [t, onAccountsPress, styles.outlinedButton],
  );

  const renderHeader = () => (
    <AccountCardHeader
      avatarImage={avatarImage}
      accountName={accountName}
      accountType={accountType}
      blockchain={blockchain}
      isShielded={isShielded}
      showAvatar={variant === 'standard'}
      trailing={showAccountsButton(variant) ? accountsButton : renderBalance()}
    />
  );

  const renderAssetsRow = () => (
    <Row justifyContent="space-between" alignItems="center">
      <Row
        alignItems="center"
        justifyContent="center"
        style={styles.fillContainer}>
        <TokenGroupSummary
          tokens={(tokens ?? []).map(({ icon, name }) => ({
            icon,
            name,
          }))}
          type="tokens"
        />
      </Row>
      <Row
        alignItems="center"
        justifyContent="center"
        style={styles.fillContainer}>
        <TokenGroupSummary
          tokens={(nfts ?? []).map(({ icon, name }) => ({
            icon,
            name,
          }))}
          type="nfts"
        />
      </Row>
      <Column
        alignItems="center"
        justifyContent="center"
        style={styles.fillContainer}>
        <Text.XS testID="account-card-rewards-amount-and-currency">
          {rewards} {coin}
        </Text.XS>
        <Text.XS testID="account-card-rewards-label">
          {t('v2.generic.btn.rewards')}
        </Text.XS>
      </Column>
    </Row>
  );

  // Variant-specific action renderers
  const renderStandardActions = useCallback(
    () => (
      <Row
        style={styles.iconButtonsGroup}
        justifyContent="space-between"
        alignItems="center">
        {onBuyPress && (
          <ActionButton
            icon="Plus"
            title={t('v2.menu.buy')}
            onPress={onBuyPress}
            containerStyle={styles.actionButton}
            iconStyle={ICON_STYLE}
            testID="account-card-buy-button"
          />
        )}
        <SharedActionButtons />
        {onSwapPress && (
          <ActionButton
            icon="Swap"
            title={t('v2.menu.swap')}
            onPress={onSwapPress}
            containerStyle={styles.actionButton}
            iconStyle={ICON_STYLE}
            testID="account-card-swap-button"
          />
        )}
      </Row>
    ),
    [SharedActionButtons, onBuyPress, styles.actionButton, t, onSwapPress],
  );

  const renderClearActions = useCallback(
    () => (
      <>
        {onBuyPress && (
          <ActionButton
            icon="Plus"
            title={t('v2.menu.buy')}
            onPress={onBuyPress}
            containerStyle={styles.actionButton}
            iconStyle={ICON_STYLE}
            testID="account-card-buy-button"
          />
        )}
        <SharedActionButtons />
        {onSwapPress && (
          <ActionButton
            icon="Swap"
            title={t('v2.menu.swap')}
            onPress={onSwapPress}
            containerStyle={styles.actionButton}
            iconStyle={ICON_STYLE}
            testID="account-card-swap-button"
          />
        )}
      </>
    ),
    [SharedActionButtons, onBuyPress, styles.actionButton, t, onSwapPress],
  );

  const renderAlternativeActions = useCallback(
    () => (
      <Row
        justifyContent="space-between"
        alignItems="center"
        gap={spacing.S}
        style={styles.iconButtonsGroup}>
        {onBuyPress && (
          <IconButton.Static
            icon={<Icon name="Plus" size={14} />}
            onPress={onBuyPress}
            testID="account-card-buy-button"
          />
        )}
        <IconButton.Static
          icon={<Icon name="ArrowUp" size={13} />}
          onPress={onSendPress}
          testID="account-card-send-button"
        />
        <IconButton.Static
          icon={<Icon name="ArrowDown" size={16} />}
          onPress={onReceivePress}
          testID="account-card-receive-button"
        />
        {onSwapPress && (
          <IconButton.Static
            icon={<Icon name="Swap" size={14} />}
            onPress={onSwapPress}
            testID="account-card-swap-button"
          />
        )}
        <ActionButton
          icon="CarouselHorizontal"
          title={t('v2.portfolio-card.accounts')}
          textAlign="center"
          onPress={onAccountsPress}
          containerStyle={styles.alternativeActionButton}
          iconStyle={ICON_STYLE}
          testID="account-card-accounts-button"
        />
      </Row>
    ),
    [
      onBuyPress,
      onSendPress,
      onReceivePress,
      onAccountsPress,
      onSwapPress,
      styles.iconButtonsGroup,
      styles.alternativeActionButton,
      t,
    ],
  );

  const renderCompactActions = useCallback(
    () => (
      <>
        {onBuyPress && (
          <IconButton.Static
            icon={<Icon name="Plus" size={14} />}
            onPress={onBuyPress}
            containerStyle={styles.iconButton}
            testID="account-card-buy-button"
          />
        )}
        <IconButton.Static
          icon={<Icon name="ArrowUp" size={13} />}
          onPress={onSendPress}
          containerStyle={styles.iconButton}
          testID="account-card-send-button"
        />
        <IconButton.Static
          icon={<Icon name="ArrowDown" size={16} />}
          onPress={onReceivePress}
          containerStyle={styles.iconButton}
          testID="account-card-receive-button"
        />
        {onSwapPress && (
          <IconButton.Static
            icon={<Icon name="Swap" size={14} />}
            onPress={onSwapPress}
            testID="account-card-swap-button"
          />
        )}
        <IconButton.Static
          icon={<Icon name="Dashboard" size={18} />}
          onPress={onDashboardPress}
          containerStyle={styles.iconButton}
          testID="account-card-dashboard-button"
        />
      </>
    ),
    [
      onBuyPress,
      onSendPress,
      onReceivePress,
      onDashboardPress,
      onSwapPress,
      styles.iconButton,
    ],
  );

  const renderActions = useCallback(() => {
    switch (variant) {
      case 'standard':
        return renderStandardActions();
      case 'clear':
        return renderClearActions();
      case 'alternative':
        return renderAlternativeActions();
      case 'compact':
        return renderCompactActions();
      default:
        return renderStandardActions();
    }
  }, [
    variant,
    renderStandardActions,
    renderClearActions,
    renderAlternativeActions,
    renderCompactActions,
  ]);

  const renderStandardContent = () => (
    <>
      {renderHeader()}
      <Divider />
      {renderBalance()}
      {renderAssetsRow()}
      <Divider />
      {renderBottomActionsRow(renderStandardActions())}
    </>
  );

  const renderBottomActionsRow = (children: React.ReactNode) => (
    <Row
      justifyContent="space-between"
      alignItems="center"
      style={styles.actionsWrapper}>
      {children}
    </Row>
  );

  const renderClearContent = () => (
    <>
      {renderHeader()}
      {renderBalance()}
      {renderBottomActionsRow(renderActions())}
    </>
  );

  const renderAlternativeContent = () => (
    <>
      {renderHeader()}
      <Divider />
      <Row justifyContent="space-between" alignItems="center">
        {renderActions()}
      </Row>
    </>
  );

  const renderCompactContent = () => {
    return (
      <>
        {renderHeader()}
        {renderBottomActionsRow(renderCompactActions())}
      </>
    );
  };

  const renderVariantContent = () => {
    switch (variant) {
      case 'standard':
        return renderStandardContent();
      case 'clear':
        return renderClearContent();
      case 'alternative':
        return renderAlternativeContent();
      case 'compact':
        return renderCompactContent();
      default:
        return renderStandardContent();
    }
  };

  const renderMinimalContent = () => (
    <>
      {renderHeader()}
      <Divider />
      {renderBottomActionsRow(renderStandardActions())}
    </>
  );

  const cardStyle = useMemo(
    () => [styles.card, containerStyle].filter(Boolean),
    [styles.card, containerStyle],
  );

  return (
    <Card cardStyle={cardStyle} blur testID="account-card">
      {arePricesAvailable ? renderVariantContent() : renderMinimalContent()}
    </Card>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.M,
      paddingTop: spacing.M,
      paddingHorizontal: spacing.M,
      paddingBottom: spacing.S,
      backgroundColor: theme.background.primary,
    },
    chartGrow: {
      flex: 1,
    },
    chartContainer: {
      flex: 1,
      alignSelf: 'stretch',
      minHeight: chartHeight,
      marginLeft: spacing.M,
      overflow: 'hidden',
    },
    fillContainer: {
      flex: 1,
    },
    actionButton: {
      backgroundColor: 'transparent',
    },
    iconButton: {
      backgroundColor: 'transparent',
    },
    iconButtonsGroup: {
      width: '100%',
    },
    alternativeActionButton: {
      backgroundColor: theme.brand.ascending,
      paddingHorizontal: spacing.M,
      paddingVertical: spacing.XS,
      flexGrow: 0.5,
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
  });
