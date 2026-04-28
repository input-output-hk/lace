import {
  useBottomSheetInternal,
  useBottomSheetScrollableCreator,
} from '@gorhom/bottom-sheet';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
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
import {
  Chart,
  DropdownMenu,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
} from '../../../molecules';
import {
  ActivityList,
  Sheet,
  useScrollEventsHandlers,
} from '../../../organisms';
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
  // When provided, a back arrow is rendered in the per-account view's header
  // returning the user to the multi-account portfolio view.
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
  /**
   * Rendered as a sibling immediately above the activity list in the
   * per-account (`!isPortfolioView`) view. Caller supplies the content;
   * template only positions it. Not rendered in portfolio view.
   */
  activitiesHeader?: React.ReactNode;
  /**
   * Sections (date-tag rows + activity rows) to render in the virtualized
   * activity list. Only consumed in the per-account view.
   */
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

const COPY_BUTTON_SIZE = 28;
const tokenDetailScrollState = {
  current: undefined as
    | {
        key: string;
        offsetY: number;
      }
    | undefined,
};

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

const activityKeyExtractor = (item: ActivityCardType) =>
  item.type === 'activity' ? item.props.rowKey : item.props.date;

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
    tokenActivityTitle,
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
    onBackToPortfolioPress,
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
  const sheetScrollRef = useRef<BottomSheetScrollViewMethods | null>(null);
  const flashListRef = useRef<FlashListRef<ActivityCardType> | null>(null);
  const restoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreRafRef = useRef<number | null>(null);
  const hasRestoredScrollRef = useRef(false);

  const footerHeight = useFooterHeight();
  const defaultStyles = useMemo(
    () => sheetStyles(footerHeight),
    [isPortfolioView, footerHeight],
  );
  const onSheetScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: {
          y: number;
        };
      };
    }) => {
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

    const offsetY =
      tokenDetailScrollState.current?.key === scrollStateKey
        ? tokenDetailScrollState.current.offsetY
        : 0;
    if (offsetY <= 0) {
      hasRestoredScrollRef.current = true;
      return;
    }

    restoreTimeoutRef.current = setTimeout(() => {
      restoreTimeoutRef.current = null;
      restoreRafRef.current = requestAnimationFrame(() => {
        restoreRafRef.current = null;
        const targetOffsetY =
          tokenDetailScrollState.current?.key === scrollStateKey
            ? tokenDetailScrollState.current.offsetY
            : 0;
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
  const shouldShowDropdownMenu = items.length > 0 && !isPortfolioView;
  const hasPricingData =
    currentPriceData?.data && currentPriceData?.data.length > 0;
  const { backgroundColorMap } = useColor();

  useEffect(() => {
    hasRestoredScrollRef.current = false;
    restoreScrollPosition();

    return () => {
      if (restoreTimeoutRef.current !== null) {
        clearTimeout(restoreTimeoutRef.current);
        restoreTimeoutRef.current = null;
      }
      if (restoreRafRef.current !== null) {
        cancelAnimationFrame(restoreRafRef.current);
        restoreRafRef.current = null;
      }
    };
  }, [restoreScrollPosition]);

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

  // Scroll component shared by BottomSheet + FlashList so list scroll
  // cooperates with sheet pan gestures (pan-to-dismiss).
  // `scrollEventsHandlersHook` patches a gorhom v5.2.x infinite-recursion
  // bug when the scrollable is locked; same hook used by `Sheet.Scroll`.
  // Wrapped via `SafeBottomSheetScrollable` so we fall back to a plain
  // animated ScrollView when no BottomSheet context is available (storybook,
  // platforms where the gorhom provider isn't reachable). Without the fallback
  // `BottomSheetScrollView` throws `useBottomSheetInternal cannot be used out
  // of the BottomSheet!` and the activity list fails to render.
  const BottomSheetScrollable = useBottomSheetScrollableCreator({
    scrollEventsHandlersHook: useScrollEventsHandlers,
  });
  const activityScrollComponent = useMemo(
    () => createSafeBottomSheetScrollable(BottomSheetScrollable),
    [BottomSheetScrollable],
  );

  // Horizontal inset is applied by each branch's wrapper (portfolio: outer
  // Column, non-portfolio: FlashList contentContainerStyle). Keeping only
  // `gap` here avoids a double margin.
  const staticContent = (
    <Column gap={spacing.M}>
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
                <Text.XS variant="secondary" style={defaultStyles.tokenPrice}>
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
                      <Text.S variant="secondary" testID="fingerprint-label">
                        {fingerprintTitle}
                      </Text.S>
                      <CopyFeedbackButton
                        isCopied={copiedField === 'fingerprint'}
                        iconColor={utils.theme.text.secondary}
                        confirmationColor={backgroundColorMap.positive}
                        confirmationIconColor={utils.theme.background.primary}
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

                {!!fingerprint && (!!policyId || (isUnnamed && tokenId)) && (
                  <Divider />
                )}

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
                        confirmationIconColor={utils.theme.background.primary}
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
                        confirmationIconColor={utils.theme.background.primary}
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
    </Column>
  );

  const sheetHeaderElement = (
    <SheetHeader
      title={headerTitle}
      headerAvatar={headerAvatar}
      height={44}
      showDivider={false}
      testID="token-details-sheet-header"
      leftIconOnPress={
        !isPortfolioView && onBackToPortfolioPress
          ? onBackToPortfolioPress
          : undefined
      }
    />
  );

  const sheetFooterElement = !isPortfolioView ? (
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
  ) : null;

  if (isPortfolioView) {
    return (
      <>
        {sheetHeaderElement}
        <Sheet.Scroll
          testID="token-details-sheet-scroll"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={defaultStyles.sheetContent}>
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
        {sheetFooterElement}
      </>
    );
  }

  const sections = activityListSections ?? [];
  const canLoadMore =
    !hasLoadedOldestEntry && !!onLoadMorePress && !!loadMoreLabel;
  const loadMoreButton = canLoadMore ? (
    <View style={defaultStyles.loadMoreActionSlot}>
      <Button.Secondary
        label={loadMoreLabel}
        onPress={onLoadMorePress}
        size="small"
        testID="token-details-load-more-button"
      />
    </View>
  ) : null;
  const loadMoreAction = isLoadingOlderActivities ? (
    <View style={defaultStyles.loadMoreActionSlot}>
      <Loader testID="token-details-activity-loader" />
    </View>
  ) : (
    loadMoreButton
  );

  const renderHintWithAction = (
    message: string | undefined,
    messageTestID: string,
  ) => (
    <Column
      alignItems="center"
      gap={spacing.S}
      style={defaultStyles.loadMoreContainer}>
      {message ? (
        <Text.XS
          variant="secondary"
          style={defaultStyles.loadMoreHint}
          testID={messageTestID}>
          {message}
        </Text.XS>
      ) : null}
      {loadMoreAction}
    </Column>
  );

  // While a page is loading, collapse the footer to just the spinner —
  // hide the hint copy and the Load-more button per product spec.
  const moreHintMessage = isLoadingOlderActivities
    ? undefined
    : moreActivitiesHintMessage;
  const emptyHintMessage = isLoadingOlderActivities
    ? undefined
    : emptyActivitiesMessage;

  const loadMoreFooter =
    sections.length > 0 && (canLoadMore || isLoadingOlderActivities)
      ? renderHintWithAction(
          moreHintMessage,
          'token-details-activity-more-hint',
        )
      : null;

  const emptyState =
    sections.length === 0 &&
    (emptyActivitiesMessage || canLoadMore || isLoadingOlderActivities)
      ? renderHintWithAction(
          emptyHintMessage,
          'token-details-activity-empty-message',
        )
      : null;

  return (
    <>
      {sheetHeaderElement}
      <ActivityList
        testID="token-details-sheet-scroll"
        flashListRef={flashListRef}
        onScroll={onSheetScroll}
        onLoad={restoreScrollPosition}
        sections={sections}
        onActivityPress={onActivityPress ?? noop}
        // Suppress ActivityList's internal loader-footer — we render our own
        // combined loader/load-more footer below.
        isLoadingOlderActivities={false}
        keyExtractor={activityKeyExtractor}
        contentContainerStyle={defaultStyles.flashListContent}
        ListHeaderComponent={
          <Column gap={spacing.M}>
            {staticContent}
            <Divider />
            {tokenActivityTitle ? (
              <Text.M testID="token-activity-title">
                {tokenActivityTitle}
              </Text.M>
            ) : null}
            {activitiesHeader}
          </Column>
        }
        ListFooterComponent={sections.length > 0 ? loadMoreFooter : undefined}
        ListEmptyComponent={emptyState ?? undefined}
        renderScrollComponent={activityScrollComponent}
        showsVerticalScrollIndicator={false}
      />
      {sheetFooterElement}
    </>
  );
};

const noop = () => undefined;

type BottomSheetScrollableRenderer = (
  // Props FlashList forwards to its scroll component. Opaque to us — we just
  // pass them through.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any,
  ref?: never,
) => React.ReactElement;

/**
 * Returns a scroll-component renderer safe to hand to FlashList in contexts
 * where a `<BottomSheet>` ancestor may not be present. When context exists,
 * renders the provided gorhom scrollable (gesture-cooperating). When it is
 * missing, renders a plain `Animated.ScrollView` so the activity list still
 * displays instead of crashing with `useBottomSheetInternal cannot be used
 * out of the BottomSheet!`.
 *
 * Detection uses `useBottomSheetInternal(true)` — the unsafe variant returns
 * null instead of throwing when no provider is in the tree.
 */
const createSafeBottomSheetScrollable = (
  bottomSheetScrollable: BottomSheetScrollableRenderer,
): BottomSheetScrollableRenderer => {
  const SafeBottomSheetScrollable: BottomSheetScrollableRenderer = (
    props,
    ref,
  ) => {
    const hasBottomSheetContext = !!useBottomSheetInternal(true);
    if (hasBottomSheetContext) {
      return bottomSheetScrollable(props, ref);
    }
    return <Animated.ScrollView ref={ref} {...props} />;
  };
  return SafeBottomSheetScrollable;
};

const sheetStyles = (paddingBottom: number) =>
  StyleSheet.create({
    sheetContent: {
      paddingBottom,
    },
    // FlashList's `contentContainerStyle` doesn't forward horizontal margins
    // reliably, so mirror the Sheet.Scroll inset via padding. Bottom padding
    // matches SheetFooter height so the last activity stays above the CTA.
    flashListContent: {
      paddingBottom,
      paddingHorizontal: spacing.S,
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
    loadMoreContainer: {
      marginTop: spacing.S,
      marginBottom: spacing.S,
    },
    loadMoreHint: {
      paddingVertical: spacing.XS,
    },
    // Height mirrors `Button.Secondary` size="small" (40px) so the Loader
    // → button swap during pagination keeps surrounding layout stable.
    loadMoreActionSlot: {
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
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
