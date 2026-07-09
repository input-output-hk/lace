import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { radius, spacing } from '../../../../design-tokens';
import {
  Button,
  Card,
  Column,
  Row,
  Text,
  Divider,
  Icon,
  Loader,
} from '../../../atoms';
import { Chart, DropdownMenu } from '../../../molecules';
import { ActivityList, Sheet, footerHeight } from '../../../organisms';
import { useColor } from '../../../util';

import { TokenDetailActivityList } from './tokenDetailActivityList';

import type { SelectedToken, Transaction } from './tokenDetailActivityList';
import type { Theme } from '../../../../design-tokens';
import type { TimeRange } from '../../../../utils/priceHistoryUtils';
import type {
  ActivityCardType,
  ActivitySection,
} from '../../../organisms/activityList/activityList';
import type { BottomSheetScrollViewMethods } from '@gorhom/bottom-sheet';
import type { FlashListRef } from '@shopify/flash-list';

const COPY_BUTTON_SIZE = 28;
const tokenDetailScrollState = {
  current: undefined as
    | {
        key: string;
        offsetY: number;
      }
    | undefined,
};

type CopiedField = 'fingerprint' | 'policyId' | 'tokenId';

type TokenMetadataSectionProps = {
  tokenInformationTitle: string;
  infoRows: TokenInfoEntry[];
  copiedField: CopiedField | null;
  copyIconColor: string;
  confirmationColor: string;
  confirmationIconColor: string;
  onCopy: (field: CopiedField, value: string) => void;
  defaultStyles: ReturnType<typeof sheetStyles>;
};

type TokenInfoEntry = {
  field: CopiedField;
  label?: string;
  value: string;
  labelTestID: string;
  valueTestID: string;
  buttonTestID: string;
};

export type SheetScrollEvent = {
  nativeEvent: {
    contentOffset: {
      y: number;
    };
  };
};

type TokenInfoRowProps = {
  entry: TokenInfoEntry;
  copiedField: CopiedField | null;
  copyIconColor: string;
  confirmationColor: string;
  confirmationIconColor: string;
  onCopy: (field: CopiedField, value: string) => void;
  valueStyle: ReturnType<typeof sheetStyles>['tokenInformationValue'];
};

type TokenSummarySectionProps = {
  addresses: GlobalStateProps['addresses'];
  index: number;
  items: GlobalStateProps['items'];
  shouldShowDropdownMenu: boolean;
  onSelectItem: ActionsProps['onSelectItem'];
  totalBalanceLabel: string;
  coinQuantity?: string;
  coinName?: string;
  tokenNameAddon?: React.ReactNode;
  totalBalance: string;
  isTokenPricingEnabled: boolean;
  tokenDetailUsd: string;
  defaultStyles: ReturnType<typeof sheetStyles>;
  onEditNamePress?: ActionsProps['onEditNamePress'];
  editNameLabel?: string;
};

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
  tokenActivityTitle?: string;
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
  onBackToPortfolioPress?: () => void;
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
  onTokenPress: (transaction: Transaction) => void;
}

interface TokenDetailBottomSheetProps {
  labels: LabelsProps;
  actions: ActionsProps;
  utils: UtilsProps;
  globalState: GlobalStateProps;
  isTokenPricingEnabled: boolean;
  activitiesHeader?: React.ReactNode;
  activityListSections?: ActivitySection[];
  onActivityPress?: (id: string) => void;
  isLoadingOlderActivities?: boolean;
  onLoadMorePress?: () => void;
  hasLoadedOldestEntry?: boolean;
  emptyActivitiesMessage?: string;
  moreActivitiesHintMessage?: string;
  loadMoreLabel?: string;
  scrollStateKey?: string;
}

type TokenDetailsSectionProps = {
  isTokenPricingEnabled: boolean;
  tokenPrice: string;
  estimatedPriceLabel?: string;
  tokenDetailUsd: string;
  fingerprint?: string;
  fingerprintTitle?: string;
  policyId?: string;
  policyIdTitle?: string;
  isUnnamed?: boolean;
  tokenId?: string;
  tokenIdLabel?: string;
  tokenInformationTitle: string;
  copiedField: CopiedField | null;
  copyIconColor: string;
  confirmationColor: string;
  confirmationIconColor: string;
  onCopy: (field: CopiedField, value: string) => void;
  defaultStyles: ReturnType<typeof sheetStyles>;
  hasPricingData: boolean;
  currentPriceData?: UtilsProps['currentPriceData'];
  displayPriceData?: UtilsProps['displayPriceData'];
  onTimeRangeChange?: ActionsProps['onTimeRangeChange'];
  timeRange?: TimeRange;
};

type TokenStaticContentProps = TokenDetailsSectionProps &
  TokenSummarySectionProps;

type TokenQuantityRowProps = Pick<
  TokenSummarySectionProps,
  'coinName' | 'coinQuantity' | 'tokenNameAddon'
>;

type TokenSummaryActionsRowProps = Pick<
  TokenSummarySectionProps,
  | 'defaultStyles'
  | 'editNameLabel'
  | 'onEditNamePress'
  | 'tokenDetailUsd'
  | 'totalBalance'
> & {
  hasBalanceDetails: boolean;
};

type TokenPriceSectionProps = Pick<
  TokenDetailsSectionProps,
  'estimatedPriceLabel' | 'tokenDetailUsd' | 'tokenPrice'
>;

type TokenPriceChartSectionProps = Pick<
  TokenDetailsSectionProps,
  | 'currentPriceData'
  | 'defaultStyles'
  | 'displayPriceData'
  | 'estimatedPriceLabel'
  | 'onTimeRangeChange'
  | 'timeRange'
>;

type TokenDetailBottomSheetModel = {
  activityListSections?: TokenDetailBottomSheetProps['activityListSections'];
  activitiesHeader?: TokenDetailBottomSheetProps['activitiesHeader'];
  defaultStyles: ReturnType<typeof sheetStyles>;
  emptyActivitiesMessage?: TokenDetailBottomSheetProps['emptyActivitiesMessage'];
  flashListRef: React.RefObject<FlashListRef<ActivityCardType> | null>;
  globalState: GlobalStateProps;
  hasLoadedOldestEntry?: TokenDetailBottomSheetProps['hasLoadedOldestEntry'];
  isLoadingOlderActivities?: TokenDetailBottomSheetProps['isLoadingOlderActivities'];
  isPortfolioView: boolean;
  isTokenPricingEnabled: boolean;
  labels: LabelsProps;
  loadMoreLabel?: TokenDetailBottomSheetProps['loadMoreLabel'];
  moreActivitiesHintMessage?: TokenDetailBottomSheetProps['moreActivitiesHintMessage'];
  onActivityPress?: TokenDetailBottomSheetProps['onActivityPress'];
  onLoadMorePress?: TokenDetailBottomSheetProps['onLoadMorePress'];
  onSheetScroll: (event: SheetScrollEvent) => void;
  restoreScrollPosition: () => void;
  staticContentProps: TokenStaticContentProps;
  utils: UtilsProps;
};

type CopyFeedbackButtonProps = {
  isCopied: boolean;
  iconColor: string;
  confirmationColor: string;
  confirmationIconColor: string;
  onPress: () => void;
  testID: string;
};

const CopyFeedbackButton = ({
  isCopied,
  iconColor,
  confirmationColor,
  confirmationIconColor,
  onPress,
  testID,
}: CopyFeedbackButtonProps) => {
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

const activityKeyExtractor = (item: ActivityCardType) =>
  item.type === 'activity' ? item.props.rowKey : item.props.date;

const getStoredScrollOffset = (scrollStateKey?: string) =>
  scrollStateKey && tokenDetailScrollState.current?.key === scrollStateKey
    ? tokenDetailScrollState.current.offsetY
    : 0;

const clearRestoreHandles = ({
  restoreTimeoutRef,
  restoreRafRef,
}: {
  restoreTimeoutRef: React.RefObject<ReturnType<typeof setTimeout> | null>;
  restoreRafRef: React.RefObject<number | null>;
}) => {
  if (restoreTimeoutRef.current !== null) {
    clearTimeout(restoreTimeoutRef.current);
    restoreTimeoutRef.current = null;
  }
  if (restoreRafRef.current !== null) {
    cancelAnimationFrame(restoreRafRef.current);
    restoreRafRef.current = null;
  }
};

const useCopiedFieldFeedback = (onCopyValue?: (value: string) => void) => {
  const [copiedField, setCopiedField] = useState<CopiedField | null>(null);
  const handleCopy = useCallback(
    (field: CopiedField, value: string) => {
      onCopyValue?.(value);
      setCopiedField(field);
    },
    [onCopyValue],
  );

  useEffect(() => {
    if (!copiedField) return;

    const timeout = setTimeout(() => {
      setCopiedField(null);
    }, 1400);

    return () => {
      clearTimeout(timeout);
    };
  }, [copiedField]);

  return { copiedField, handleCopy };
};

const useTokenDetailScrollPosition = (scrollStateKey?: string) => {
  const sheetScrollRef = useRef<BottomSheetScrollViewMethods | null>(null);
  const flashListRef = useRef<FlashListRef<ActivityCardType> | null>(null);
  const restoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreRafRef = useRef<number | null>(null);
  const hasRestoredScrollRef = useRef(false);

  const onSheetScroll = useCallback(
    (event: SheetScrollEvent) => {
      if (!scrollStateKey) return;
      tokenDetailScrollState.current = {
        key: scrollStateKey,
        offsetY: event.nativeEvent.contentOffset.y,
      };
    },
    [scrollStateKey],
  );

  const restoreScrollPosition = useCallback(() => {
    if (!scrollStateKey || hasRestoredScrollRef.current) return;

    const offsetY = getStoredScrollOffset(scrollStateKey);
    if (offsetY <= 0) {
      hasRestoredScrollRef.current = true;
      return;
    }

    restoreTimeoutRef.current = setTimeout(() => {
      restoreTimeoutRef.current = null;
      restoreRafRef.current = requestAnimationFrame(() => {
        restoreRafRef.current = null;
        const targetOffsetY = getStoredScrollOffset(scrollStateKey);
        if (sheetScrollRef.current) {
          sheetScrollRef.current.scrollTo({
            x: 0,
            y: targetOffsetY,
            animated: false,
          });
        } else {
          flashListRef.current?.scrollToOffset({
            offset: targetOffsetY,
            animated: false,
          });
        }
        hasRestoredScrollRef.current = true;
      });
    }, 0);
  }, [scrollStateKey]);

  useEffect(() => {
    hasRestoredScrollRef.current = false;
    restoreScrollPosition();

    return () => {
      clearRestoreHandles({ restoreTimeoutRef, restoreRafRef });
    };
  }, [restoreScrollPosition]);

  return {
    flashListRef,
    onSheetScroll,
    restoreScrollPosition,
    sheetScrollRef,
  };
};

const TokenInfoRow = ({
  entry,
  copiedField,
  copyIconColor,
  confirmationColor,
  confirmationIconColor,
  onCopy,
  valueStyle,
}: TokenInfoRowProps) => (
  <Column gap={spacing.XS}>
    <Row justifyContent="space-between" alignItems="center">
      <Text.S variant="secondary" testID={entry.labelTestID}>
        {entry.label}
      </Text.S>
      <CopyFeedbackButton
        isCopied={copiedField === entry.field}
        iconColor={copyIconColor}
        confirmationColor={confirmationColor}
        confirmationIconColor={confirmationIconColor}
        onPress={() => {
          onCopy(entry.field, entry.value);
        }}
        testID={entry.buttonTestID}
      />
    </Row>
    <Text.XS
      selectable
      testID={entry.valueTestID}
      style={valueStyle}
      variant="secondary">
      {entry.value}
    </Text.XS>
  </Column>
);

const TokenQuantityRow = ({
  coinQuantity,
  coinName,
  tokenNameAddon,
}: TokenQuantityRowProps) => (
  <Column gap={spacing.XS}>
    <Row alignItems="center" gap={spacing.S}>
      <Text.L numberOfLines={1} ellipsizeMode="tail" testID="token-quantity">
        {coinQuantity}
      </Text.L>
      {(!!coinName || !!tokenNameAddon) && (
        <Row alignItems="center" gap={spacing.XS}>
          {!!coinName && (
            <Text.S numberOfLines={1} variant="secondary" testID="token-name">
              {coinName}
            </Text.S>
          )}
          {tokenNameAddon}
        </Row>
      )}
    </Row>
  </Column>
);

const TokenSummaryActionsRow = ({
  defaultStyles,
  editNameLabel,
  hasBalanceDetails,
  onEditNamePress,
  tokenDetailUsd,
  totalBalance,
}: TokenSummaryActionsRowProps) => {
  if (!hasBalanceDetails && !onEditNamePress) return null;

  return (
    <Row justifyContent="space-between" alignItems="center">
      {hasBalanceDetails ? (
        <Row alignItems="center">
          <Text.XS variant="secondary" style={defaultStyles.tokenPrice}>
            {totalBalance}
          </Text.XS>
          <Text.XS variant="secondary">{tokenDetailUsd}</Text.XS>
        </Row>
      ) : (
        <View />
      )}
      {onEditNamePress ? (
        <Button.Secondary
          label={editNameLabel}
          preIconName="PencilEdit"
          size="small"
          onPress={onEditNamePress}
        />
      ) : null}
    </Row>
  );
};

const getTokenInfoEntries = ({
  fingerprint,
  fingerprintTitle,
  isUnnamed,
  policyId,
  policyIdTitle,
  tokenId,
  tokenIdLabel,
}: Pick<
  TokenDetailsSectionProps,
  | 'fingerprint'
  | 'fingerprintTitle'
  | 'isUnnamed'
  | 'policyId'
  | 'policyIdTitle'
  | 'tokenId'
  | 'tokenIdLabel'
>): TokenInfoEntry[] => {
  const infoRows: TokenInfoEntry[] = [];

  if (fingerprint) {
    infoRows.push({
      field: 'fingerprint',
      label: fingerprintTitle,
      value: fingerprint,
      labelTestID: 'fingerprint-label',
      valueTestID: 'fingerprint-value',
      buttonTestID: 'fingerprint-copy-button',
    });
  }

  if (policyId) {
    infoRows.push({
      field: 'policyId',
      label: policyIdTitle,
      value: policyId,
      labelTestID: 'policy-id-label',
      valueTestID: 'policy-id-value',
      buttonTestID: 'policy-id-copy-button',
    });
  }

  if (isUnnamed && tokenId) {
    infoRows.push({
      field: 'tokenId',
      label: tokenIdLabel,
      value: tokenId,
      labelTestID: 'token-id-label',
      valueTestID: 'token-id-value',
      buttonTestID: 'token-id-copy-button',
    });
  }

  return infoRows;
};

const TokenPriceSection = ({
  estimatedPriceLabel,
  tokenDetailUsd,
  tokenPrice,
}: TokenPriceSectionProps) => (
  <Column gap={spacing.S}>
    <Text.M>{estimatedPriceLabel}</Text.M>
    <Text.S variant="secondary">
      {tokenPrice} {tokenDetailUsd}
    </Text.S>
  </Column>
);

const TokenPriceChartSection = ({
  currentPriceData,
  defaultStyles,
  displayPriceData,
  estimatedPriceLabel,
  onTimeRangeChange,
  timeRange,
}: TokenPriceChartSectionProps) => {
  if (!currentPriceData) return null;

  return (
    <Column gap={spacing.S}>
      <Text.M>{estimatedPriceLabel}</Text.M>
      <View style={defaultStyles.chartContainer} testID="token-price-chart">
        <Chart
          data={currentPriceData}
          priceData={displayPriceData}
          onTimeRangeChange={onTimeRangeChange}
          timeRange={timeRange}
          withCenterPill
        />
      </View>
    </Column>
  );
};

const TokenSummarySection = ({
  addresses,
  index,
  items,
  shouldShowDropdownMenu,
  onSelectItem,
  totalBalanceLabel,
  coinQuantity,
  coinName,
  tokenNameAddon,
  totalBalance,
  isTokenPricingEnabled,
  tokenDetailUsd,
  defaultStyles,
  onEditNamePress,
  editNameLabel,
}: TokenSummarySectionProps) => {
  const hasBalanceDetails = !!totalBalance && isTokenPricingEnabled;

  return (
    <>
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
        <TokenQuantityRow
          coinQuantity={coinQuantity}
          coinName={coinName}
          tokenNameAddon={tokenNameAddon}
        />
        <TokenSummaryActionsRow
          defaultStyles={defaultStyles}
          editNameLabel={editNameLabel}
          hasBalanceDetails={hasBalanceDetails}
          onEditNamePress={onEditNamePress}
          tokenDetailUsd={tokenDetailUsd}
          totalBalance={totalBalance}
        />
      </Column>
    </>
  );
};

const TokenMetadataSection = ({
  tokenInformationTitle,
  infoRows,
  copiedField,
  copyIconColor,
  confirmationColor,
  confirmationIconColor,
  onCopy,
  defaultStyles,
}: TokenMetadataSectionProps) => {
  if (infoRows.length === 0) return null;

  return (
    <Column gap={spacing.S}>
      <Text.M testID="token-information-label">{tokenInformationTitle}</Text.M>
      <Card>
        <Column gap={spacing.M}>
          {infoRows.map((entry, index) => (
            <React.Fragment key={entry.field}>
              {index > 0 ? <Divider /> : null}
              <TokenInfoRow
                entry={entry}
                copiedField={copiedField}
                copyIconColor={copyIconColor}
                confirmationColor={confirmationColor}
                confirmationIconColor={confirmationIconColor}
                onCopy={onCopy}
                valueStyle={defaultStyles.tokenInformationValue}
              />
            </React.Fragment>
          ))}
        </Column>
      </Card>
    </Column>
  );
};

const TokenDetailsSection = ({
  isTokenPricingEnabled,
  tokenPrice,
  estimatedPriceLabel,
  tokenDetailUsd,
  fingerprint,
  fingerprintTitle,
  policyId,
  policyIdTitle,
  isUnnamed,
  tokenId,
  tokenIdLabel,
  tokenInformationTitle,
  copiedField,
  copyIconColor,
  confirmationColor,
  confirmationIconColor,
  onCopy,
  defaultStyles,
  hasPricingData,
  currentPriceData,
  displayPriceData,
  onTimeRangeChange,
  timeRange,
}: TokenDetailsSectionProps) => {
  const infoRows = getTokenInfoEntries({
    fingerprint,
    fingerprintTitle,
    isUnnamed,
    policyId,
    policyIdTitle,
    tokenId,
    tokenIdLabel,
  });
  const shouldShowEstimatedPrice = isTokenPricingEnabled && !!tokenPrice;
  const hasTokenMetadata = infoRows.length > 0;
  const shouldShowPriceChart = isTokenPricingEnabled && hasPricingData;
  const shouldShowDivider =
    shouldShowEstimatedPrice || hasTokenMetadata || shouldShowPriceChart;

  return (
    <Column gap={spacing.M} style={defaultStyles.portfolioView}>
      {shouldShowDivider ? <Divider /> : null}
      {shouldShowEstimatedPrice ? (
        <TokenPriceSection
          estimatedPriceLabel={estimatedPriceLabel}
          tokenDetailUsd={tokenDetailUsd}
          tokenPrice={tokenPrice}
        />
      ) : null}
      <TokenMetadataSection
        infoRows={infoRows}
        tokenInformationTitle={tokenInformationTitle}
        copiedField={copiedField}
        copyIconColor={copyIconColor}
        confirmationColor={confirmationColor}
        confirmationIconColor={confirmationIconColor}
        onCopy={onCopy}
        defaultStyles={defaultStyles}
      />
      {shouldShowPriceChart ? (
        <TokenPriceChartSection
          currentPriceData={currentPriceData}
          defaultStyles={defaultStyles}
          displayPriceData={displayPriceData}
          estimatedPriceLabel={estimatedPriceLabel}
          onTimeRangeChange={onTimeRangeChange}
          timeRange={timeRange}
        />
      ) : null}
    </Column>
  );
};

const TokenStaticContent = ({
  addresses,
  index,
  items,
  shouldShowDropdownMenu,
  onSelectItem,
  totalBalanceLabel,
  coinQuantity,
  coinName,
  tokenNameAddon,
  totalBalance,
  isTokenPricingEnabled,
  tokenDetailUsd,
  defaultStyles,
  onEditNamePress,
  editNameLabel,
  tokenPrice,
  estimatedPriceLabel,
  fingerprint,
  fingerprintTitle,
  policyId,
  policyIdTitle,
  isUnnamed,
  tokenId,
  tokenIdLabel,
  tokenInformationTitle,
  copiedField,
  copyIconColor,
  confirmationColor,
  confirmationIconColor,
  onCopy,
  hasPricingData,
  currentPriceData,
  displayPriceData,
  onTimeRangeChange,
  timeRange,
}: TokenStaticContentProps) => (
  <Column gap={spacing.M}>
    <TokenSummarySection
      addresses={addresses}
      index={index}
      items={items}
      shouldShowDropdownMenu={shouldShowDropdownMenu}
      onSelectItem={onSelectItem}
      totalBalanceLabel={totalBalanceLabel}
      coinQuantity={coinQuantity}
      coinName={coinName}
      tokenNameAddon={tokenNameAddon}
      totalBalance={totalBalance}
      isTokenPricingEnabled={isTokenPricingEnabled}
      tokenDetailUsd={tokenDetailUsd}
      defaultStyles={defaultStyles}
      onEditNamePress={onEditNamePress}
      editNameLabel={editNameLabel}
    />
    <TokenDetailsSection
      isTokenPricingEnabled={isTokenPricingEnabled}
      tokenPrice={tokenPrice}
      estimatedPriceLabel={estimatedPriceLabel}
      tokenDetailUsd={tokenDetailUsd}
      fingerprint={fingerprint}
      fingerprintTitle={fingerprintTitle}
      policyId={policyId}
      policyIdTitle={policyIdTitle}
      isUnnamed={isUnnamed}
      tokenId={tokenId}
      tokenIdLabel={tokenIdLabel}
      tokenInformationTitle={tokenInformationTitle}
      copiedField={copiedField}
      copyIconColor={copyIconColor}
      confirmationColor={confirmationColor}
      confirmationIconColor={confirmationIconColor}
      onCopy={onCopy}
      defaultStyles={defaultStyles}
      hasPricingData={hasPricingData}
      currentPriceData={currentPriceData}
      displayPriceData={displayPriceData}
      onTimeRangeChange={onTimeRangeChange}
      timeRange={timeRange}
    />
  </Column>
);

const useTokenDetailBottomSheetModel = ({
  labels,
  actions,
  utils,
  globalState,
  isTokenPricingEnabled,
  activitiesHeader,
  activityListSections,
  onActivityPress,
  isLoadingOlderActivities,
  onLoadMorePress,
  hasLoadedOldestEntry,
  emptyActivitiesMessage,
  moreActivitiesHintMessage,
  loadMoreLabel,
  scrollStateKey,
}: TokenDetailBottomSheetProps): TokenDetailBottomSheetModel => {
  const { copiedField, handleCopy } = useCopiedFieldFeedback(
    actions.onCopyValue,
  );
  const { flashListRef, onSheetScroll, restoreScrollPosition } =
    useTokenDetailScrollPosition(scrollStateKey);
  const defaultStyles = useMemo(() => sheetStyles(), []);
  const { backgroundColorMap } = useColor();
  const hasPricingData = !!utils.currentPriceData?.data?.length;

  return {
    activityListSections,
    activitiesHeader,
    defaultStyles,
    emptyActivitiesMessage,
    flashListRef,
    globalState,
    hasLoadedOldestEntry,
    isLoadingOlderActivities,
    isPortfolioView: utils.isPortfolioView,
    isTokenPricingEnabled,
    labels,
    loadMoreLabel,
    moreActivitiesHintMessage,
    onActivityPress,
    onLoadMorePress,
    onSheetScroll,
    restoreScrollPosition,
    staticContentProps: {
      addresses: globalState.addresses,
      confirmationColor: backgroundColorMap.positive,
      confirmationIconColor: utils.theme.background.primary,
      copiedField,
      coinName: labels.coinName,
      coinQuantity: labels.coinQuantity,
      copyIconColor: utils.theme.text.secondary,
      currentPriceData: utils.currentPriceData,
      defaultStyles,
      displayPriceData: utils.displayPriceData,
      editNameLabel: labels.editNameLabel,
      estimatedPriceLabel: labels.estimatedPriceLabel,
      fingerprint: utils.fingerprint,
      fingerprintTitle: labels.fingerprintTitle,
      hasPricingData,
      index: utils.index,
      isTokenPricingEnabled,
      isUnnamed: utils.isUnnamed,
      items: globalState.items,
      onCopy: handleCopy,
      onEditNamePress: actions.onEditNamePress,
      onSelectItem: actions.onSelectItem,
      onTimeRangeChange: actions.onTimeRangeChange,
      policyId: utils.policyId,
      policyIdTitle: labels.policyIdTitle,
      shouldShowDropdownMenu:
        globalState.items.length > 0 && !utils.isPortfolioView,
      timeRange: utils.timeRange,
      tokenDetailUsd: labels.tokenDetailUsd,
      tokenId: utils.tokenId,
      tokenIdLabel: labels.tokenIdLabel,
      tokenInformationTitle: labels.tokenInformationTitle,
      tokenNameAddon: labels.tokenNameAddon,
      tokenPrice: utils.tokenPrice,
      totalBalance: utils.totalBalance,
      totalBalanceLabel: labels.totalBalanceLabel,
    },
    utils,
  };
};

const renderHintWithAction = ({
  message,
  messageTestID,
  loadMoreAction,
  defaultStyles,
}: {
  message: string | undefined;
  messageTestID: string;
  loadMoreAction: React.ReactNode;
  defaultStyles: ReturnType<typeof sheetStyles>;
}) => (
  <Column
    alignItems="center"
    gap={spacing.S}
    style={defaultStyles.loadMoreHint}>
    {message ? (
      <Text.XS variant="secondary" testID={messageTestID}>
        {message}
      </Text.XS>
    ) : null}
    {loadMoreAction}
  </Column>
);

const PortfolioTokenDetailContent = ({
  defaultStyles,
  staticContent,
  labels,
  utils,
  globalState,
  isTokenPricingEnabled,
}: {
  defaultStyles: ReturnType<typeof sheetStyles>;
  staticContent: React.ReactNode;
  labels: LabelsProps;
  utils: UtilsProps;
  globalState: GlobalStateProps;
  isTokenPricingEnabled: boolean;
}) => (
  <Sheet.Scroll
    testID="token-details-sheet-scroll"
    showsVerticalScrollIndicator={false}>
    <Column style={defaultStyles.content} gap={spacing.M}>
      {staticContent}
      <Divider />
      <TokenDetailActivityList
        labels={labels}
        utils={utils}
        globalState={globalState}
        isTokenPricingEnabled={isTokenPricingEnabled}
      />
    </Column>
  </Sheet.Scroll>
);

const PerAccountTokenDetailContent = ({
  staticContent,
  defaultStyles,
  flashListRef,
  onSheetScroll,
  restoreScrollPosition,
  activityListSections,
  onActivityPress,
  tokenActivityTitle,
  activitiesHeader,
  isLoadingOlderActivities,
  moreActivitiesHintMessage,
  emptyActivitiesMessage,
  hasLoadedOldestEntry,
  onLoadMorePress,
  loadMoreLabel,
}: {
  staticContent: React.ReactNode;
  defaultStyles: ReturnType<typeof sheetStyles>;
  flashListRef: React.RefObject<FlashListRef<ActivityCardType> | null>;
  onSheetScroll: (event: {
    nativeEvent: {
      contentOffset: {
        y: number;
      };
    };
  }) => void;
  restoreScrollPosition: () => void;
  activityListSections?: ActivitySection[];
  onActivityPress?: (id: string) => void;
  tokenActivityTitle?: string;
  activitiesHeader?: React.ReactNode;
  isLoadingOlderActivities?: boolean;
  moreActivitiesHintMessage?: string;
  emptyActivitiesMessage?: string;
  hasLoadedOldestEntry?: boolean;
  onLoadMorePress?: () => void;
  loadMoreLabel?: string;
}) => {
  const sections = activityListSections ?? [];
  const canLoadMore =
    !hasLoadedOldestEntry && !!onLoadMorePress && !!loadMoreLabel;
  const loadMoreAction = isLoadingOlderActivities ? (
    <Loader testID="token-details-activity-loader" />
  ) : canLoadMore ? (
    <Button.Secondary
      label={loadMoreLabel}
      onPress={onLoadMorePress}
      size="small"
      testID="token-details-load-more-button"
    />
  ) : null;
  const moreHintMessage = isLoadingOlderActivities
    ? undefined
    : moreActivitiesHintMessage;
  const emptyHintMessage = isLoadingOlderActivities
    ? undefined
    : emptyActivitiesMessage;
  const loadMoreFooter =
    sections.length > 0 && loadMoreAction
      ? renderHintWithAction({
          message: moreHintMessage,
          messageTestID: 'token-details-activity-more-hint',
          loadMoreAction,
          defaultStyles,
        })
      : undefined;
  const emptyState =
    sections.length === 0 &&
    (emptyActivitiesMessage || canLoadMore || isLoadingOlderActivities)
      ? renderHintWithAction({
          message: emptyHintMessage,
          messageTestID: 'token-details-activity-empty-message',
          loadMoreAction,
          defaultStyles,
        })
      : undefined;

  return (
    <ActivityList
      testID="token-details-sheet-scroll"
      flashListRef={flashListRef}
      onScroll={onSheetScroll}
      onLoad={restoreScrollPosition}
      sections={sections}
      style={perAccountStyles.content}
      onActivityPress={onActivityPress ?? noop}
      isLoadingOlderActivities={false}
      keyExtractor={activityKeyExtractor}
      contentContainerStyle={defaultStyles.flashListContent}
      ListHeaderComponent={
        <Column gap={spacing.M}>
          {staticContent}
          <Divider />
          {tokenActivityTitle ? (
            <Text.M testID="token-activity-title">{tokenActivityTitle}</Text.M>
          ) : null}
          {activitiesHeader}
        </Column>
      }
      ListFooterComponent={loadMoreFooter}
      ListEmptyComponent={emptyState}
      showsVerticalScrollIndicator={false}
    />
  );
};

export const TokenDetailBottomSheet = ({
  labels,
  actions,
  utils,
  globalState,
  isTokenPricingEnabled,
  activitiesHeader,
  activityListSections,
  onActivityPress,
  isLoadingOlderActivities,
  onLoadMorePress,
  hasLoadedOldestEntry,
  emptyActivitiesMessage,
  moreActivitiesHintMessage,
  loadMoreLabel,
  scrollStateKey,
}: TokenDetailBottomSheetProps) => {
  const model = useTokenDetailBottomSheetModel({
    labels,
    actions,
    utils,
    globalState,
    isTokenPricingEnabled,
    activitiesHeader,
    activityListSections,
    onActivityPress,
    isLoadingOlderActivities,
    onLoadMorePress,
    hasLoadedOldestEntry,
    emptyActivitiesMessage,
    moreActivitiesHintMessage,
    loadMoreLabel,
    scrollStateKey,
  });
  const staticContent = <TokenStaticContent {...model.staticContentProps} />;

  if (model.isPortfolioView) {
    return (
      <PortfolioTokenDetailContent
        defaultStyles={model.defaultStyles}
        staticContent={staticContent}
        labels={model.labels}
        utils={model.utils}
        globalState={model.globalState}
        isTokenPricingEnabled={model.isTokenPricingEnabled}
      />
    );
  }

  return (
    <PerAccountTokenDetailContent
      staticContent={staticContent}
      defaultStyles={model.defaultStyles}
      flashListRef={model.flashListRef}
      onSheetScroll={model.onSheetScroll}
      restoreScrollPosition={model.restoreScrollPosition}
      activityListSections={model.activityListSections}
      onActivityPress={model.onActivityPress}
      tokenActivityTitle={model.labels.tokenActivityTitle}
      activitiesHeader={model.activitiesHeader}
      isLoadingOlderActivities={model.isLoadingOlderActivities}
      moreActivitiesHintMessage={model.moreActivitiesHintMessage}
      emptyActivitiesMessage={model.emptyActivitiesMessage}
      hasLoadedOldestEntry={model.hasLoadedOldestEntry}
      onLoadMorePress={model.onLoadMorePress}
      loadMoreLabel={model.loadMoreLabel}
    />
  );
};

const noop = () => undefined;

const sheetStyles = () =>
  StyleSheet.create({
    flashListContent: {
      paddingHorizontal: spacing.S,
      paddingBottom: footerHeight.horizontal,
    },
    loadMoreHint: {
      paddingVertical: spacing.M,
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

const perAccountStyles = StyleSheet.create({
  content: {
    padding: spacing.M,
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
