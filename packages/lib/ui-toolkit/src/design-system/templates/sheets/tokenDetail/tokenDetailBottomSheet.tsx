import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { radius, spacing } from '../../../../design-tokens';
import { Button, Card, Column, Row, Text, Divider, Icon } from '../../../atoms';
import {
  Chart,
  DropdownMenu,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
} from '../../../molecules';
import { Sheet } from '../../../organisms';
import { useColor } from '../../../util';

import { TokenDetailActivityList } from './tokenDetailActivityList';

import type { SelectedToken, Transaction } from './tokenDetailActivityList';
import type { Theme } from '../../../../design-tokens';
import type { TimeRange } from '../../../../utils/priceHistoryUtils';

interface LabelsProps {
  headerTitle: string;
  sendMenuLabel: string;
  totalBalanceLabel: string;
  tokenDetailUsd: string;
  buyButtonLabel: string;
  tokenDistributionLabel: string;
  estimatedPriceLabel?: string;
  coinQuantity?: string;
  coinName?: string;
  tokenNameAddon?: React.ReactNode;
  tokenInformationTitle: string;
  fingerprintTitle?: string;
  policyIdTitle?: string;
  editNameLabel?: string;
  tokenIdLabel?: string;
}

interface ActionsProps {
  onSendPress: () => void;
  onBuyPress?: () => void;
  onSelectItem: (index: number) => void;
  onTimeRangeChange?: (value: TimeRange) => void;
  onEditNamePress?: () => void;
  onCopyValue?: (value: string) => void;
}

interface UtilsProps {
  totalBalance: string;
  tokenPrice: string;
  index: number;
  theme: Theme;
  isPortfolioView: boolean;
  timeRange?: TimeRange;
  currentPriceData?: {
    data: number[];
    timestamps: number[];
  };
  displayPriceData?: {
    date: string;
    price: string;
    currency: string;
  };
  pricePillLeftDistance: number;
  fingerprint?: string;
  policyId?: string;
  isUnnamed?: boolean;
  tokenId?: string;
}

interface GlobalStateProps {
  transactions: Transaction[];
  items: { id: string; text: string }[];
  addresses: { id: string; text: string }[];
  selectedToken: SelectedToken;
  activityList?: React.ReactNode;
  onTokenPress: (transaction: Transaction) => void;
}

interface TokenDetailBottomSheetProps {
  labels: LabelsProps;
  actions: ActionsProps;
  utils: UtilsProps;
  globalState: GlobalStateProps;
  isTokenPricingEnabled: boolean;
}

const COPY_BUTTON_SIZE = 28;

const CopyFeedbackButton = ({
  isCopied,
  iconColor,
  confirmationColor,
  confirmationIconColor,
  onPress,
  testID,
}: {
  isCopied: boolean;
  iconColor: string;
  confirmationColor: string;
  confirmationIconColor: string;
  onPress: () => void;
  testID: string;
}) => {
  const progress = useSharedValue(isCopied ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isCopied ? 1 : 0, { duration: 260 });
  }, [isCopied, progress]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', confirmationColor],
    ),
    transform: [{ scale: 1 + progress.value * 0.02 }],
  }));

  const haloAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: confirmationColor,
    opacity: progress.value * 0.22,
    transform: [{ scale: 0.82 + progress.value * 0.45 }],
  }));

  const copyIconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 1 - progress.value * 0.18 }],
  }));

  const checkIconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.72 + progress.value * 0.28 }],
  }));

  return (
    <Animated.View style={[copyButtonStyles.container, containerAnimatedStyle]}>
      <Animated.View style={[copyButtonStyles.halo, haloAnimatedStyle]} />
      <Pressable
        onPress={onPress}
        style={copyButtonStyles.pressable}
        hitSlop={8}
        testID={testID}>
        <Animated.View
          style={[copyButtonStyles.iconSlot, copyIconAnimatedStyle]}>
          <Icon name="Copy" size={14} color={iconColor} />
        </Animated.View>
        <Animated.View
          style={[copyButtonStyles.iconSlot, checkIconAnimatedStyle]}>
          <Icon name="Checkmark" size={14} color={confirmationIconColor} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

export const TokenDetailBottomSheet = ({
  labels,
  actions,
  utils,
  globalState,
  isTokenPricingEnabled,
}: TokenDetailBottomSheetProps) => {
  const [copiedField, setCopiedField] = useState<
    'fingerprint' | 'policyId' | 'tokenId' | null
  >(null);

  const {
    headerTitle,
    sendMenuLabel,
    totalBalanceLabel,
    tokenDetailUsd,
    buyButtonLabel,
    estimatedPriceLabel,
    coinQuantity,
    coinName,
    tokenNameAddon,
    tokenInformationTitle,
    fingerprintTitle,
    policyIdTitle,
    editNameLabel,
    tokenIdLabel,
  } = labels;

  const {
    onSendPress,
    onBuyPress,
    onSelectItem,
    onTimeRangeChange,
    onEditNamePress,
    onCopyValue,
  } = actions;

  const {
    totalBalance,
    tokenPrice,
    index,
    isPortfolioView,
    timeRange,
    currentPriceData,
    displayPriceData,
    fingerprint,
    policyId,
    isUnnamed,
    tokenId,
  } = utils;

  const { items, addresses, selectedToken } = globalState;

  const footerHeight = useFooterHeight();
  const defaultStyles = useMemo(
    () => sheetStyles(footerHeight),
    [isPortfolioView, footerHeight],
  );
  const shouldShowDropdownMenu = items.length > 0 && !isPortfolioView;
  const hasPricingData =
    currentPriceData?.data && currentPriceData?.data.length > 0;
  const { backgroundColorMap } = useColor();

  useEffect(() => {
    if (!copiedField) return;

    const timeout = setTimeout(() => {
      setCopiedField(null);
    }, 1400);

    return () => {
      clearTimeout(timeout);
    };
  }, [copiedField]);

  const headerAvatar = useMemo(() => {
    return {
      metadata: {
        image: selectedToken.metadata?.image,
        fallback: coinName,
      },
    };
  }, [selectedToken, coinName]);

  return (
    <>
      <SheetHeader
        title={headerTitle}
        headerAvatar={headerAvatar}
        height={44}
        showDivider={false}
        testID="token-details-sheet-header"
      />
      <Sheet.Scroll
        showsVerticalScrollIndicator={false}
        contentContainerStyle={defaultStyles.sheetContent}>
        <Column style={defaultStyles.content} gap={spacing.M}>
          {shouldShowDropdownMenu && (
            <DropdownMenu
              title={addresses[index].text}
              items={items}
              selectedItemId={addresses[index].id}
              onSelectItem={onSelectItem}
            />
          )}
          <Column gap={spacing.M}>
            <Text.S variant="secondary" testID="total-balance">
              {totalBalanceLabel}
            </Text.S>
            <Column gap={spacing.XS}>
              <Row alignItems="center" gap={spacing.S}>
                <Text.L
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  testID="token-quantity">
                  {coinQuantity}
                </Text.L>

                {(!!coinName || !!tokenNameAddon) && (
                  <Row alignItems="center" gap={spacing.XS}>
                    {!!coinName && (
                      <Text.S
                        numberOfLines={1}
                        variant="secondary"
                        testID="token-name">
                        {coinName}
                      </Text.S>
                    )}
                    {tokenNameAddon}
                  </Row>
                )}
              </Row>
            </Column>
            {(!!totalBalance && isTokenPricingEnabled) || onEditNamePress ? (
              <Row justifyContent="space-between" alignItems="center">
                {!!totalBalance && isTokenPricingEnabled && (
                  <Row alignItems="center">
                    <Text.XS
                      variant="secondary"
                      style={defaultStyles.tokenPrice}>
                      {totalBalance}
                    </Text.XS>
                    <Text.XS variant="secondary">{tokenDetailUsd}</Text.XS>
                  </Row>
                )}
                {onEditNamePress && (
                  <Button.Secondary
                    label={editNameLabel}
                    preIconName="PencilEdit"
                    size="small"
                    onPress={onEditNamePress}
                  />
                )}
              </Row>
            ) : null}
          </Column>

          <Column gap={spacing.M} style={defaultStyles.portfolioView}>
            {(isTokenPricingEnabled && !!tokenPrice) ||
            !!fingerprint ||
            !!policyId ||
            (isUnnamed && tokenId) ||
            (isTokenPricingEnabled && hasPricingData) ? (
              <Divider />
            ) : null}

            {isTokenPricingEnabled && !!tokenPrice && (
              <Column gap={spacing.S}>
                <Text.M>{estimatedPriceLabel}</Text.M>
                <Text.S variant="secondary">
                  {tokenPrice} {tokenDetailUsd}
                </Text.S>
              </Column>
            )}

            {(!!fingerprint || !!policyId || (isUnnamed && tokenId)) && (
              <Column gap={spacing.S}>
                <Text.M testID="token-information-label">
                  {tokenInformationTitle}
                </Text.M>
                <Card>
                  <Column gap={spacing.M}>
                    {!!fingerprint && (
                      <Column gap={spacing.XS}>
                        <Row justifyContent="space-between" alignItems="center">
                          <Text.S
                            variant="secondary"
                            testID="fingerprint-label">
                            {fingerprintTitle}
                          </Text.S>
                          <CopyFeedbackButton
                            isCopied={copiedField === 'fingerprint'}
                            iconColor={utils.theme.text.secondary}
                            confirmationColor={backgroundColorMap.positive}
                            confirmationIconColor={
                              utils.theme.background.primary
                            }
                            onPress={() => {
                              onCopyValue?.(fingerprint);
                              setCopiedField('fingerprint');
                            }}
                            testID="fingerprint-copy-button"
                          />
                        </Row>
                        <Text.XS
                          selectable
                          testID="fingerprint-value"
                          style={defaultStyles.tokenInformationValue}
                          variant="secondary">
                          {fingerprint}
                        </Text.XS>
                      </Column>
                    )}

                    {!!fingerprint &&
                      (!!policyId || (isUnnamed && tokenId)) && <Divider />}

                    {!!policyId && (
                      <Column gap={spacing.XS}>
                        <Row justifyContent="space-between" alignItems="center">
                          <Text.S variant="secondary" testID="policy-id-label">
                            {policyIdTitle}
                          </Text.S>
                          <CopyFeedbackButton
                            isCopied={copiedField === 'policyId'}
                            iconColor={utils.theme.text.secondary}
                            confirmationColor={backgroundColorMap.positive}
                            confirmationIconColor={
                              utils.theme.background.primary
                            }
                            onPress={() => {
                              onCopyValue?.(policyId);
                              setCopiedField('policyId');
                            }}
                            testID="policy-id-copy-button"
                          />
                        </Row>
                        <Text.XS
                          selectable
                          testID="policy-id-value"
                          style={defaultStyles.tokenInformationValue}
                          variant="secondary">
                          {policyId}
                        </Text.XS>
                      </Column>
                    )}

                    {!!policyId && isUnnamed && tokenId && <Divider />}

                    {isUnnamed && tokenId && (
                      <Column gap={spacing.XS}>
                        <Row justifyContent="space-between" alignItems="center">
                          <Text.S variant="secondary" testID="token-id-label">
                            {tokenIdLabel}
                          </Text.S>
                          <CopyFeedbackButton
                            isCopied={copiedField === 'tokenId'}
                            iconColor={utils.theme.text.secondary}
                            confirmationColor={backgroundColorMap.positive}
                            confirmationIconColor={
                              utils.theme.background.primary
                            }
                            onPress={() => {
                              onCopyValue?.(tokenId);
                              setCopiedField('tokenId');
                            }}
                            testID="token-id-copy-button"
                          />
                        </Row>
                        <Text.XS
                          variant="secondary"
                          selectable
                          testID="token-id-value"
                          style={defaultStyles.tokenInformationValue}>
                          {tokenId}
                        </Text.XS>
                      </Column>
                    )}
                  </Column>
                </Card>
              </Column>
            )}

            {isTokenPricingEnabled && hasPricingData && (
              <Column gap={spacing.S}>
                <Text.M>{estimatedPriceLabel}</Text.M>
                <View
                  style={defaultStyles.chartContainer}
                  testID="token-price-chart">
                  <Chart
                    data={currentPriceData}
                    priceData={displayPriceData}
                    onTimeRangeChange={onTimeRangeChange}
                    timeRange={timeRange}
                    withCenterPill
                  />
                </View>
              </Column>
            )}
          </Column>

          <Divider />
          <Column>
            <TokenDetailActivityList
              labels={labels}
              utils={utils}
              globalState={globalState}
              isTokenPricingEnabled={isTokenPricingEnabled}
            />
          </Column>
        </Column>
      </Sheet.Scroll>
      {!isPortfolioView && (
        <SheetFooter
          secondaryButton={
            onBuyPress
              ? {
                  label: buyButtonLabel,
                  onPress: onBuyPress,
                  testID: 'token-details-sheet-buy-button',
                }
              : undefined
          }
          primaryButton={{
            label: sendMenuLabel,
            onPress: onSendPress,
            testID: 'token-details-sheet-send-button',
          }}
        />
      )}
    </>
  );
};

const sheetStyles = (paddingBottom: number) =>
  StyleSheet.create({
    sheetContent: {
      paddingBottom,
    },
    content: {
      marginHorizontal: spacing.S,
    },
    portfolioView: {
      width: '100%',
    },
    chartContainer: {
      width: '100%',
      marginBottom: spacing.M,
    },
    tokenPrice: {
      marginRight: spacing.XS,
    },
    tokenInformationValue: {
      width: '100%',
    },
  });

const copyButtonStyles = StyleSheet.create({
  container: {
    width: COPY_BUTTON_SIZE,
    height: COPY_BUTTON_SIZE,
    borderRadius: radius.rounded,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  halo: {
    position: 'absolute',
    width: COPY_BUTTON_SIZE,
    height: COPY_BUTTON_SIZE,
    borderRadius: radius.rounded,
  },
  pressable: {
    width: COPY_BUTTON_SIZE,
    height: COPY_BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSlot: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
