import { useTranslation } from '@lace-contract/i18n';
import noop from 'lodash/noop';
import React, { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { RANGES, type TimeRange } from '../../../utils/priceHistoryUtils';
import {
  Row,
  LineChart,
  BlurView,
  ActionButton,
  Icon,
  IconButton,
  Text,
  Column,
} from '../../atoms';
import { Chart, Tabs } from '../../molecules';
import { AccountInfo } from '../accountInfo/accountInfo';

import { AlternativeCard } from './alternative/alternative';
import { CompactCard } from './compact/compact';
import { StandardCard } from './standard/standard';
import { UltraLightCard } from './ultraLight/ultraLight';

import type { Theme } from '../../../design-tokens';
import type { LineChartData } from '../../atoms';

// ============================================================================
// Types
// ============================================================================

export type PortfolioCardVariant =
  | 'alternative'
  | 'compact'
  | 'standard'
  | 'ultraLight';

export interface ActionHandlers {
  onBuyPress?: () => void;
  onSendPress?: () => void;
  onReceivePress?: () => void;
  onAccountsPress?: () => void;
  onSwapPress?: () => void;
}

interface PortfolioCardProps {
  variant?: PortfolioCardVariant;
  alternativeType?: 'enhanced' | 'simple';
  data?: {
    wallets: {
      icon: React.ReactElement | { uri: string };
    }[];
    accounts: {
      name: string;
      icon: React.ReactElement | { uri: string };
    }[];
  };
  price?: string;
  onActionPress?: ActionHandlers;
  priceHistoryData?: LineChartData;
  currency?: string;
  onTimeRangeChange?: (range: TimeRange) => void;
  timeRange?: TimeRange;
  testID?: string;
  arePricesAvailable?: boolean;
  formatChartValue?: (value: number) => string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CHART_DATA: LineChartData = { data: [0, 0] };
const ACTION_ICON_SIZE = 20;
const COMPACT_CHART_HEIGHT = 90;
const PRICE_ROW_MIN_HEIGHT = 30;

const BuyIcon = <Icon name="Plus" size={ACTION_ICON_SIZE} />;
const SendIcon = <Icon name="ArrowUp" size={ACTION_ICON_SIZE} />;
const ReceiveIcon = <Icon name="ArrowDown" size={ACTION_ICON_SIZE} />;
const AccountsIcon = <Icon name="CarouselHorizontal" size={ACTION_ICON_SIZE} />;
const SwapIcon = <Icon name="Swap" size={ACTION_ICON_SIZE} />;

// ============================================================================
// Static Styles (theme-independent)
// ============================================================================

const staticStyles = StyleSheet.create({
  actionsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  ultraLightActionButton: {
    flexGrow: 1,
    gap: spacing.S,
    flexWrap: 'nowrap',
  },
});

// ============================================================================
// Action Components
// ============================================================================

interface CompactActionsProps {
  handlers: ActionHandlers;
}

const CompactActions = memo(({ handlers }: CompactActionsProps) => {
  const actions = useMemo(
    () =>
      [
        handlers.onBuyPress && {
          icon: BuyIcon,
          onPress: handlers.onBuyPress,
          testID: 'portfolio-card-buy-button',
        },
        {
          icon: SendIcon,
          onPress: handlers.onSendPress,
          testID: 'portfolio-card-send-button',
        },
        {
          icon: ReceiveIcon,
          onPress: handlers.onReceivePress,
          testID: 'portfolio-card-receive-button',
        },
        handlers.onSwapPress && {
          icon: SwapIcon,
          onPress: handlers.onSwapPress,
          testID: 'portfolio-card-swap-button',
        },
        {
          icon: AccountsIcon,
          onPress: handlers.onAccountsPress,
          testID: 'portfolio-card-accounts-button',
        },
      ].filter(Boolean) as Array<{
        icon: React.ReactElement;
        onPress: (() => void) | undefined;
        testID: string;
      }>,
    [handlers],
  );

  return (
    <>
      {actions.map(({ icon, onPress, testID }) => (
        <IconButton.Static
          key={testID}
          testID={testID}
          icon={icon}
          onPress={onPress}
        />
      ))}
    </>
  );
});

interface AlternativeActionsProps {
  handlers: ActionHandlers;
  label: string;
  isUltraLight?: boolean;
  testID: string;
}

const AlternativeActions = memo(
  ({
    handlers,
    label,
    isUltraLight = false,
    testID,
  }: AlternativeActionsProps) => {
    const { theme } = useTheme();
    const themedStyles = useMemo(() => getThemedActionStyles(theme), [theme]);

    const iconStyle = useMemo(
      () => ({ color: theme.brand.white, variant: 'solid' } as const),
      [theme.brand.white],
    );

    const containerStyle = useMemo(
      () =>
        isUltraLight
          ? [
              staticStyles.actionsContainer,
              themedStyles.ultraLightActionsContainer,
            ]
          : staticStyles.actionsContainer,
      [isUltraLight, themedStyles.ultraLightActionsContainer],
    );

    const buttonContainerStyle = useMemo(
      () =>
        isUltraLight
          ? [
              themedStyles.alternativeActionButton,
              staticStyles.ultraLightActionButton,
            ]
          : themedStyles.alternativeActionButton,
      [isUltraLight, themedStyles.alternativeActionButton],
    );

    const baseActions = useMemo(
      () =>
        [
          handlers.onBuyPress && {
            icon: BuyIcon,
            onPress: handlers.onBuyPress,
            testID: 'buy',
          },
          { icon: SendIcon, onPress: handlers.onSendPress, testID: 'send' },
          {
            icon: ReceiveIcon,
            onPress: handlers.onReceivePress,
            testID: 'receive',
          },
          handlers.onSwapPress && {
            icon: SwapIcon,
            onPress: handlers.onSwapPress,
            testID: 'swap',
          },
        ].filter(Boolean) as Array<{
          icon: React.ReactElement;
          onPress: (() => void) | undefined;
          testID: string;
        }>,
      [handlers],
    );

    return (
      <View style={containerStyle}>
        {baseActions.map(action => (
          <IconButton.Static
            key={action.testID}
            icon={action.icon}
            onPress={action.onPress}
            testID={`${action.testID}-icon-button`}
          />
        ))}
        <ActionButton
          iconStyle={iconStyle}
          icon="CarouselHorizontal"
          title={label}
          onPress={handlers.onAccountsPress}
          containerStyle={buttonContainerStyle}
          textAlign="center"
          titleStyle={themedStyles.alternativeActionButtonText}
          testID={`${testID}-button`}
        />
      </View>
    );
  },
);

// ============================================================================
// Main Component
// ============================================================================

export const PortfolioCard = ({
  variant = 'standard',
  alternativeType = 'simple',
  data,
  onActionPress,
  priceHistoryData,
  price,
  currency = 'USD',
  onTimeRangeChange,
  timeRange = '24H',
  testID,
  arePricesAvailable = true,
  formatChartValue,
}: PortfolioCardProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const isAlternativeEnhanced =
    variant === 'alternative' && alternativeType === 'enhanced';

  const styles = useMemo(
    () => getStyles(theme, isAlternativeEnhanced),
    [theme, isAlternativeEnhanced],
  );

  const portfolioTitle = t('v2.portfolio-card.portfolio');

  const {
    onBuyPress,
    onSendPress,
    onReceivePress,
    onAccountsPress,
    onSwapPress,
  } = onActionPress ?? {};

  const handlers = useMemo<ActionHandlers>(
    () => ({
      onBuyPress,
      onSendPress,
      onReceivePress,
      onAccountsPress,
      onSwapPress,
    }),
    [onBuyPress, onSendPress, onReceivePress, onAccountsPress, onSwapPress],
  );

  const chartData = useMemo(() => {
    if (priceHistoryData?.data && priceHistoryData?.data.length > 0)
      return priceHistoryData;
    return DEFAULT_CHART_DATA;
  }, [priceHistoryData]);

  const PortfolioHeader = useMemo(
    () => <Text.M>{portfolioTitle}</Text.M>,
    [portfolioTitle],
  );

  const ViewAccountsButton = useMemo(
    () => (
      <ActionButton
        title={t('v2.portfolio-card.viewAccounts')}
        icon={
          <Icon
            name="CarouselHorizontal"
            variant="solid"
            color={theme.brand.white}
          />
        }
        onPress={onAccountsPress ?? noop}
        containerStyle={styles.viewAccountsButton}
        titleStyle={styles.alternativeActionButtonText}
        textAlign="center"
      />
    ),
    [
      onAccountsPress,
      styles.viewAccountsButton,
      styles.alternativeActionButtonText,
      theme.brand.white,
      t,
    ],
  );

  const handleTimeRangeChange = useCallback(
    (value: number | string) => {
      if (typeof value === 'string' && RANGES.includes(value as TimeRange)) {
        onTimeRangeChange?.(value as TimeRange);
      }
    },
    [onTimeRangeChange],
  );

  const CardTabs = useMemo(
    () => (
      <Tabs
        tabs={RANGES}
        value={timeRange}
        onChange={handleTimeRangeChange}
        size="compact"
      />
    ),
    [timeRange, handleTimeRangeChange],
  );

  const Price = useMemo(() => {
    const Container = isAlternativeEnhanced ? View : Row;
    const containerProps = isAlternativeEnhanced
      ? { style: styles.enhancedPriceContainer }
      : { style: styles.priceRow };

    return (
      <Container {...containerProps}>
        <Text.L
          style={[styles.price, !price && styles.hiddenText]}
          testID="portfolio-card-price">
          {price ?? '0'}
        </Text.L>
        <Text.S
          variant="secondary"
          style={[styles.currency, !price && styles.hiddenText]}
          testID="portfolio-card-currency">
          {currency}
        </Text.S>
      </Container>
    );
  }, [
    price,
    currency,
    styles.price,
    styles.currency,
    styles.enhancedPriceContainer,
    styles.priceRow,
    styles.hiddenText,
    isAlternativeEnhanced,
  ]);

  const renderCompactActions = useCallback(
    () => <CompactActions handlers={handlers} />,
    [handlers],
  );

  const alternativeActionsTitle = t('v2.portfolio-card.accounts');
  const AlternativeActionsElement = useMemo(
    () => (
      <Row justifyContent="space-between">
        <AlternativeActions
          handlers={handlers}
          label={alternativeActionsTitle}
          testID="accounts"
        />
      </Row>
    ),
    [handlers, alternativeActionsTitle],
  );

  const ultraLightActionsTitle = t('v2.portfolio-card.manageAccounts');
  const renderUltraLightActions = useCallback(
    () => (
      <AlternativeActions
        handlers={handlers}
        label={ultraLightActionsTitle}
        isUltraLight
        testID="manage-accounts"
      />
    ),
    [handlers, ultraLightActionsTitle],
  );

  const renderLineChart = useCallback(
    (lineChartTestID?: string) => (
      <View style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          testID={lineChartTestID}
          formatValue={formatChartValue}
        />
      </View>
    ),
    [styles.chartWrapper, chartData, formatChartValue],
  );

  const StandardChart = useMemo(() => renderLineChart(), [renderLineChart]);

  const AlternativeChart = useMemo(
    () => renderLineChart('portfolio-card-line-chart'),
    [renderLineChart],
  );

  const CompactChart = useMemo(
    () => (
      <LineChart
        data={chartData}
        height={COMPACT_CHART_HEIGHT}
        formatValue={formatChartValue}
      />
    ),
    [chartData, formatChartValue],
  );

  const cardStyle = useMemo(
    () =>
      variant === 'ultraLight'
        ? [styles.card, styles.ultraLightCard]
        : styles.card,
    [variant, styles.card, styles.ultraLightCard],
  );

  const renderContent = () => {
    switch (variant) {
      case 'standard':
        return (
          <StandardCard
            portfolioHeader={PortfolioHeader}
            chart={StandardChart}
            renderActions={renderCompactActions}
            tabs={CardTabs}
            data={data}
            price={Price}
          />
        );

      case 'alternative':
        return (
          <AlternativeCard
            portfolioHeader={PortfolioHeader}
            price={Price}
            alternativeType={alternativeType}
            bottom={
              alternativeType === 'simple'
                ? ViewAccountsButton
                : AlternativeActionsElement
            }
            data={data}
            chart={AlternativeChart}
            tabs={alternativeType === 'enhanced' ? CardTabs : null}
          />
        );

      case 'compact':
        return (
          <CompactCard
            portfolioHeader={PortfolioHeader}
            price={Price}
            chart={CompactChart}
          />
        );

      case 'ultraLight':
        return (
          <UltraLightCard
            portfolioTitle={portfolioTitle}
            data={data}
            renderActions={renderUltraLightActions}
            price={price}
            currency={currency}
          />
        );

      default:
        return <Chart data={DEFAULT_CHART_DATA} />;
    }
  };

  const renderMinimalContent = () => {
    return (
      <Column style={styles.minimalContent} alignItems="center">
        <Text.M>{portfolioTitle}</Text.M>
        <AccountInfo
          wallets={data?.wallets || []}
          accounts={data?.accounts || []}
          showLabels
        />
        <Row justifyContent="space-between" style={styles.minimalActionsRow}>
          {renderCompactActions()}
        </Row>
      </Column>
    );
  };

  return (
    <BlurView testID={testID} style={cardStyle}>
      {arePricesAvailable ? renderContent() : renderMinimalContent()}
    </BlurView>
  );
};

// ============================================================================
// Styles
// ============================================================================

const getThemedActionStyles = (theme: Theme) =>
  StyleSheet.create({
    alternativeActionButton: {
      backgroundColor: theme.brand.ascending,
      paddingHorizontal: spacing.M,
      borderRadius: radius.M,
      justifyContent: 'center',
      alignItems: 'center',
      flexGrow: 0.7,
      gap: spacing.S,
    },
    ultraLightActionsContainer: {
      gap: spacing.XS,
    },
    alternativeActionButtonText: {
      color: theme.brand.white,
      flexWrap: 'nowrap',
    },
  });

const getStyles = (theme: Theme, isEnhanced: boolean) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.M,
      backgroundColor: theme.background.primary,
      overflow: 'hidden',
      paddingTop: spacing.M,
      paddingHorizontal: spacing.M,
      paddingBottom: spacing.S,
      boxShadow: `0 0 10px 0 ${theme.extra.shadowDrop}`,
      shadowColor: theme.extra.shadowDrop,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    ultraLightCard: {
      backgroundColor: 'transparent',
    },
    price: {
      marginRight: spacing.S,
    },
    currency: {
      marginRight: isEnhanced ? 10 : 0,
    },
    viewAccountsButton: {
      backgroundColor: theme.brand.ascending,
      borderRadius: radius.M,
      paddingHorizontal: spacing.M,
      paddingVertical: spacing.S,
      gap: spacing.S,
    },
    priceRow: {
      minHeight: PRICE_ROW_MIN_HEIGHT,
      alignItems: 'center',
    },
    hiddenText: {
      opacity: 0,
    },
    alternativeActionButtonText: {
      color: theme.brand.white,
    },
    enhancedPriceContainer: {
      position: 'absolute',
      top: -10,
      right: -10,
      alignItems: 'flex-end',
    },
    chartWrapper: {
      flex: 1,
    },
    minimalContent: {
      gap: spacing.S,
      width: '100%',
    },
    minimalActionsRow: {
      width: '100%',
    },
  });
