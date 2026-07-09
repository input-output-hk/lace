import { useAnalytics } from '@lace-contract/analytics';
import { useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import {
  NavigationControls,
  SheetRoutes,
  type TabRoutes,
  type TabScreenProps,
} from '@lace-lib/navigation';
import {
  getIsDark,
  spacing,
  Tabs,
  PortfolioCard,
  AccountCard,
  Pagination,
  Column,
  CompactPortfolioSkeleton,
  isWeb,
  PageContainerTemplate,
  Row,
  IconButton,
  Icon,
  useTheme,
} from '@lace-lib/ui-toolkit';
import { valueToLocale } from '@lace-lib/util-render';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type LayoutChangeEvent } from 'react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue } from 'react-native-reanimated';

import { SecurityAlertsBanner } from '../../components/security-alerts/SecurityAlertsBanner';

import { ActivitiesFlatlist } from './activities';
import { NftsList } from './nfts';
import { TokensList } from './tokens-list';
import { AccountViewType, SelectedAssetView } from './types';
import { usePortfolio } from './usePortfolio';
import { getTokenSortOption, getTokenSortOrder } from './utils/portfolioSort';

import type { AccountView, AssetView } from './types';
import type { TokenSortOption, TokenSortOrder } from './utils/portfolioSort';
import type { Theme } from '@lace-lib/ui-toolkit';

type WheelLikeEvent = {
  deltaY?: number;
  preventDefault?: () => void;
  nativeEvent?: {
    deltaY?: number;
  };
};

export const Portfolio = ({
  route,
  navigation,
}: TabScreenProps<TabRoutes.Portfolio>) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const initialSortOption = getTokenSortOption(route.params?.tokenSortOption);
  const [{ headerHeight, headerTopInset }, setHeaderLayout] = useState({
    headerHeight: 0,
    headerTopInset: 0,
  });
  const [carouselHeight, setCarouselHeight] = useState(0);
  const [tokenSortOption, setTokenSortOption] = useState<
    TokenSortOption | undefined
  >(initialSortOption);
  const [tokenSortOrder, setTokenSortOrder] = useState<TokenSortOrder>(() =>
    getTokenSortOrder(route.params?.tokenSortOrder, initialSortOption),
  );
  const [isTokensListEmpty, setIsTokensListEmpty] = useState(false);
  const tokensListRef = useRef<FlatList<unknown> | null>(null);
  const nftsListRef = useRef<FlatList<unknown> | null>(null);
  const activitiesListRef = useRef<FlatList<unknown> | null>(null);
  const assetScrollOffset = useSharedValue(0);
  const headerPanStartOffset = useSharedValue(0);
  const { trackEvent } = useAnalytics();

  const clearFocusAccount = useCallback(() => {
    navigation.setParams({ focusAccountId: undefined });
  }, [navigation]);

  const {
    activities,
    priceHistoryData,
    portfolioSummary,
    accounts,
    accountCards,
    accountCardCustomisations,
    createSendAction,
    createAccountsAction,
    currency,
    timeRange,
    activeIndex,
    handleTimeRangeChange,
    handleIndexChange,
    tabs,
    portfolioActions,
    selectedAssetView,
    setSelectedAssetView,
    accountsData,
    assetsData,
    accountsCarouselRef,
    assetsCarouselRef,
    containerWidth,
    contentWidth,
    handleAssetScroll,
    handleAccountScroll,
    accountsKeyExtractor,
    getItemLayout,
    onAccountsScrollToIndexFailed,
    assetsKeyExtractor,
    onAssetsScrollToIndexFailed,
    activeAccountContext,
    scrollHandler,
    animatedContainerStyle,
    isLoading,
    isPortfolioView,
    isTokenPricingEnabled,
    firstAccountId,
    totalPortfolioValue,
    currentAccount,
    networkType,
  } = usePortfolio({
    headerHeight,
    headerTopInset,
    externalScrollOffset: assetScrollOffset,
    focusAccountId: route.params?.focusAccountId,
    clearFocusAccount,
  });

  useEffect(() => {
    // Reset carousel height on network switch (mainnet ↔ testnet) because
    // card content height changes significantly (charts/prices shown or hidden).
    // Not reset on accountsData changes — account discovery doesn't change
    // the portfolio card's height, and resetting caused onLayout to not re-fire
    // when the FlatList height stayed the same.
    setCarouselHeight(0);
  }, [networkType]);
  const walletDropdownCustomisations = useUICustomisation(
    'addons.loadOnboardingStartWalletDropdownUICustomisations',
  );

  const WalletDropdownComponent =
    walletDropdownCustomisations[0]?.WalletDropdown;

  const styles = useMemo(
    () => getStyles({ containerWidth, contentWidth, theme }),
    [containerWidth, contentWidth, theme],
  );

  const headerBottomOffset = useMemo(
    () => headerHeight + headerTopInset,
    [headerHeight, headerTopInset],
  );

  const listContentTopOffset = useMemo(
    () => Math.max(0, headerBottomOffset - spacing.M),
    [headerBottomOffset],
  );

  const onReceiveFallback = useMemo(
    () => portfolioActions.onReceivePress ?? (() => {}),
    [portfolioActions.onReceivePress],
  );

  const portfolioValue = useMemo(() => {
    if (!totalPortfolioValue) return '';
    return valueToLocale(totalPortfolioValue, 2, 2);
  }, [totalPortfolioValue]);

  const formatChartValue = useCallback(
    (value: number) => valueToLocale(value, 2, 2),
    [],
  );

  useEffect(() => {
    const nextOption = getTokenSortOption(route.params?.tokenSortOption);
    setTokenSortOption(nextOption);
    setTokenSortOrder(
      getTokenSortOrder(route.params?.tokenSortOrder, nextOption),
    );
  }, [route.params?.tokenSortOption, route.params?.tokenSortOrder]);

  const handleTokenSortPress = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.PortfolioTokenSortControls, {
      tokenSortOption,
      tokenSortOrder,
      isTokenPricingEnabled,
    });
  }, [isTokenPricingEnabled, tokenSortOption, tokenSortOrder]);

  const activeBannerAccount = activeIndex > 0 ? currentAccount : null;

  // Portfolio banner customisation
  const [portfolioBannerCustomisation] = useUICustomisation(
    'addons.loadPortfolioBannerUICustomisations',
    activeBannerAccount?.blockchainName,
  );

  const AssetListHeader = useCallback(
    () => (
      <>
        {currentAccount ? (
          <SecurityAlertsBanner accountId={currentAccount.accountId} />
        ) : null}
        {activeBannerAccount &&
        portfolioBannerCustomisation?.PortfolioBanner ? (
          <portfolioBannerCustomisation.PortfolioBanner
            accountId={activeBannerAccount.accountId}
          />
        ) : null}
      </>
    ),
    [
      currentAccount,
      activeBannerAccount,
      portfolioBannerCustomisation?.PortfolioBanner,
    ],
  );

  const onCarouselLayout = useCallback((event: LayoutChangeEvent) => {
    setCarouselHeight(event.nativeEvent.layout.height);
  }, []);

  const getActiveAssetListRef = useCallback(() => {
    switch (selectedAssetView) {
      case SelectedAssetView.Nfts:
        return nftsListRef;
      case SelectedAssetView.Activities:
        return activitiesListRef;
      case SelectedAssetView.Assets:
      default:
        return tokensListRef;
    }
  }, [selectedAssetView]);

  const scrollActiveAssetList = useCallback(
    (offset: number) => {
      const nextOffset = Math.max(0, offset);
      const activeListRef = getActiveAssetListRef().current;
      if (!activeListRef) return;
      activeListRef.scrollToOffset({ offset: nextOffset, animated: false });
    },
    [getActiveAssetListRef],
  );

  const createPanGesture = useCallback(
    () =>
      Gesture.Pan()
        .activeOffsetY([-6, 6])
        .failOffsetX([-12, 12])
        .onStart(() => {
          headerPanStartOffset.value = assetScrollOffset.value;
        })
        .onUpdate(event => {
          const nextOffset = Math.max(
            0,
            headerPanStartOffset.value - event.translationY,
          );
          runOnJS(scrollActiveAssetList)(nextOffset);
        }),
    [assetScrollOffset, headerPanStartOffset, scrollActiveAssetList],
  );

  const headerPanGesture = useMemo(
    () => createPanGesture(),
    [createPanGesture],
  );

  const assetPanGesture = useMemo(() => createPanGesture(), [createPanGesture]);

  const handleHeaderWheel = useCallback(
    (event: WheelLikeEvent) => {
      const deltaY = event.nativeEvent?.deltaY ?? event.deltaY ?? 0;
      if (deltaY === 0) return;
      event.preventDefault?.();
      scrollActiveAssetList(assetScrollOffset.value + deltaY);
    },
    [assetScrollOffset, scrollActiveAssetList],
  );

  const headerWheelProps = useMemo(
    () =>
      isWeb
        ? ({
            onWheel: handleHeaderWheel,
          } as Record<string, unknown>)
        : ({} as Record<string, unknown>),
    [handleHeaderWheel],
  );

  useEffect(() => {
    assetScrollOffset.value = 0;
  }, [activeIndex, assetScrollOffset, selectedAssetView]);

  const pageStyle = useMemo(
    () =>
      carouselHeight > 0
        ? [styles.page, { height: carouselHeight }]
        : styles.page,
    [styles.page, carouselHeight],
  );

  const contentStyle = styles.content;

  const cardContainerStyle = styles.fillCard;

  const renderAccountItem = useCallback(
    ({ item }: { item: AccountView }) => {
      if (item.type === AccountViewType.Portfolio) {
        return (
          <Column style={pageStyle}>
            <View style={contentStyle}>
              <PortfolioCard
                variant="alternative"
                alternativeType="enhanced"
                arePricesAvailable={isTokenPricingEnabled}
                containerStyle={cardContainerStyle}
                data={portfolioSummary}
                price={portfolioValue}
                currency={currency.name}
                priceHistoryData={priceHistoryData}
                timeRange={timeRange}
                onTimeRangeChange={handleTimeRangeChange}
                onActionPress={portfolioActions}
                formatChartValue={formatChartValue}
                testID="portfolio-card"
              />
            </View>
          </Column>
        );
      }

      const account = accounts[item.accountIndex];
      if (!account) return null;

      const customisation = accountCardCustomisations.find(
        c =>
          c.AccountCard &&
          c.uiCustomisationSelector({
            blockchainName: account.blockchainName,
          }),
      );

      if (customisation?.AccountCard) {
        const CustomCard = customisation.AccountCard;
        const cardData = accountCards[item.accountIndex];
        if (!cardData) return null;

        return (
          <Column style={pageStyle}>
            <View style={contentStyle}>
              <CustomCard
                accountId={account.accountId}
                accountName={cardData.accountName}
                accountIndex={item.accountIndex}
                coin={cardData.coin}
                currency={currency.name}
                balanceCurrency={cardData.balanceCurrency}
                onSendPress={
                  cardData.onSendPress ?? createSendAction(account.accountId)
                }
                onReceivePress={onReceiveFallback}
                onAccountsPress={
                  cardData.onAccountsPress ?? createAccountsAction()
                }
                arePricesAvailable={isTokenPricingEnabled}
                containerStyle={cardContainerStyle}
              />
            </View>
          </Column>
        );
      }

      const accountData = accountCards[item.accountIndex];
      if (!accountData) return null;

      return (
        <Column style={pageStyle}>
          <View style={contentStyle}>
            <AccountCard
              {...accountData}
              containerStyle={cardContainerStyle}
              formatChartValue={formatChartValue}
            />
          </View>
        </Column>
      );
    },
    [
      portfolioSummary,
      currency,
      priceHistoryData,
      timeRange,
      handleTimeRangeChange,
      portfolioActions,
      accounts,
      accountCards,
      accountCardCustomisations,
      createSendAction,
      createAccountsAction,
      onReceiveFallback,
      isTokenPricingEnabled,
      totalPortfolioValue,
      pageStyle,
      contentStyle,
      cardContainerStyle,
      formatChartValue,
    ],
  );

  const listContainerStyle = useMemo(
    () => [styles.listContainer, { paddingTop: listContentTopOffset }],
    [styles.listContainer, listContentTopOffset],
  );

  const onHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, y } = event.nativeEvent.layout;
    setHeaderLayout({ headerHeight: height, headerTopInset: y });
  }, []);

  const renderAssetItem = useCallback(
    ({ item }: { item: AssetView }) => {
      const accountId =
        activeAccountContext?.accountId ??
        (isPortfolioView ? firstAccountId : undefined);
      if (!accountId) return null;

      switch (item.type) {
        case SelectedAssetView.Assets:
          return (
            <View style={[styles.page, styles.fillSpace]}>
              <TokensList
                accountId={accountId}
                activeIndex={activeIndex}
                selectedAssetView={selectedAssetView}
                listRef={tokensListRef}
                containerStyle={listContainerStyle}
                scrollHandler={scrollHandler}
                ifFromPortfolio={isPortfolioView}
                style={styles.fillSpace}
                ListHeaderComponent={AssetListHeader}
                footerSpacerHeight={headerBottomOffset}
                isTokenPricingEnabled={isTokenPricingEnabled}
                sortOption={tokenSortOption}
                sortOrder={tokenSortOrder}
                onEmptyStateChange={setIsTokensListEmpty}
              />
            </View>
          );
        case SelectedAssetView.Nfts:
          return (
            <View style={[styles.page, styles.fillSpace]}>
              <NftsList
                accountId={accountId}
                activeIndex={activeIndex}
                selectedAssetView={selectedAssetView}
                listRef={nftsListRef}
                scrollHandler={scrollHandler}
                style={[styles.fillSpace, { width: contentWidth }]}
                ListHeaderComponent={AssetListHeader}
                footerSpacerHeight={headerBottomOffset}
                contentTopInset={listContentTopOffset}
              />
            </View>
          );
        case SelectedAssetView.Activities:
          return (
            <View style={[styles.page, styles.fillSpace]}>
              <ActivitiesFlatlist
                activities={activities}
                activeIndex={activeIndex}
                selectedAssetView={selectedAssetView}
                isVisible={selectedAssetView === SelectedAssetView.Activities}
                accountId={accountId}
                listRef={activitiesListRef}
                containerStyle={listContainerStyle}
                scrollHandler={scrollHandler}
                style={styles.fillSpace}
                ListHeaderComponent={AssetListHeader}
                footerSpacerHeight={headerBottomOffset}
              />
            </View>
          );
        default:
          return null;
      }
    },
    [
      activities,
      activeAccountContext,
      activeIndex,
      selectedAssetView,
      isPortfolioView,
      firstAccountId,
      styles,
      scrollHandler,
      contentWidth,
      AssetListHeader,
      isTokenPricingEnabled,
      headerBottomOffset,
      listContentTopOffset,
      listContainerStyle,
      tokenSortOption,
      tokenSortOrder,
    ],
  );

  const sortIconColor = useMemo(() => {
    const shouldUseBlackIcon = !tokenSortOption && !getIsDark(theme);

    return shouldUseBlackIcon ? theme.brand.black : theme.brand.white;
  }, [tokenSortOption, theme]);

  if (isLoading) {
    return (
      <View style={styles.loader} testID="portfolio-initial-asset-load">
        <CompactPortfolioSkeleton />
      </View>
    );
  }

  return (
    <PageContainerTemplate fullWidth>
      <View style={styles.fillSpace}>
        {WalletDropdownComponent && (
          <View style={styles.topBarContainer}>
            <View style={styles.dropdownContainer}>
              <View style={styles.dropdownWrapper}>
                <WalletDropdownComponent />
              </View>
            </View>
          </View>
        )}

        <Animated.View
          onLayout={onHeaderLayout}
          style={[styles.headerContainer, animatedContainerStyle]}>
          <View {...headerWheelProps} style={styles.headerContent}>
            <GestureDetector gesture={headerPanGesture}>
              <View>
                <FlatList
                  key={networkType}
                  ref={accountsCarouselRef}
                  data={accountsData}
                  scrollEventThrottle={100}
                  renderItem={renderAccountItem}
                  keyExtractor={accountsKeyExtractor}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  getItemLayout={getItemLayout}
                  onScroll={handleAccountScroll}
                  onLayout={onCarouselLayout}
                  initialScrollIndex={Math.max(
                    0,
                    Math.min(activeIndex, accountsData.length - 1),
                  )}
                  onScrollToIndexFailed={onAccountsScrollToIndexFailed}
                />
                <Column
                  style={[styles.tabsAndPagination, { paddingTop: spacing.S }]}>
                  <Pagination
                    pages={accountsData.length}
                    activeIndex={activeIndex}
                    setActiveIndex={handleIndexChange}
                    withNavigation={true}
                    loop={false}
                    showPortfolioView={true}
                    testID="portfolio-carousel-pagination"
                  />
                  <Row
                    alignItems="center"
                    gap={spacing.S}
                    style={styles.assetControls}>
                    {selectedAssetView === SelectedAssetView.Assets &&
                      !isTokensListEmpty && (
                        <IconButton.Static
                          icon={
                            <Icon
                              name="Sorting"
                              size={18}
                              color={sortIconColor}
                            />
                          }
                          onPress={handleTokenSortPress}
                          accessibilityLabel={t('v2.generic.btn.sortBy')}
                          testID="portfolio-token-sort-button"
                          containerStyle={
                            tokenSortOption
                              ? styles.ascendingActionColor
                              : styles.regularActionColor
                          }
                        />
                      )}
                    <View style={styles.tabsWrapper}>
                      <Tabs
                        tabs={tabs}
                        value={selectedAssetView}
                        onChange={value => {
                          trackEvent('portfolio | assets | tab | press', {
                            tab: value,
                          });
                          setSelectedAssetView(value as SelectedAssetView);
                        }}
                      />
                    </View>
                  </Row>
                </Column>
              </View>
            </GestureDetector>
          </View>
        </Animated.View>
        {isWeb ? (
          <GestureDetector gesture={assetPanGesture}>
            <View style={[styles.fillSpace, styles.assetsContainer]}>
              {renderAssetItem({ item: { type: selectedAssetView } })}
            </View>
          </GestureDetector>
        ) : (
          <FlatList
            contentContainerStyle={styles.assetsContainer}
            ref={assetsCarouselRef}
            data={assetsData}
            scrollEventThrottle={100}
            renderItem={renderAssetItem}
            keyExtractor={assetsKeyExtractor}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleAssetScroll}
            getItemLayout={getItemLayout}
            style={styles.fillSpace}
            initialScrollIndex={Math.max(
              0,
              assetsData.findIndex(item => item.type === selectedAssetView),
            )}
            onScrollToIndexFailed={onAssetsScrollToIndexFailed}
          />
        )}
      </View>
    </PageContainerTemplate>
  );
};

const getStyles = ({
  containerWidth,
  contentWidth,
  theme,
}: {
  containerWidth: number;
  contentWidth: number;
  theme: Theme;
}) =>
  StyleSheet.create({
    headerContainer: {
      position: 'absolute',
      top: spacing.M,
      left: 0,
      right: 0,
      width: containerWidth,
      zIndex: 2,
      overflow: 'hidden',
    },
    headerContent: {
      width: '100%',
    },
    topBarContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.M,
      marginTop: spacing.M,
      width: contentWidth,
      alignSelf: 'center',
    },
    dropdownContainer: {
      flex: 1,
      alignItems: 'flex-end',
    },
    dropdownWrapper: {
      minWidth: 160,
    },
    tabsAndPagination: {
      gap: spacing.M,
      paddingHorizontal: spacing.M,
      marginVertical: spacing.M,
      width: contentWidth,
      alignSelf: 'center',
    },
    assetControls: {
      width: '100%',
    },
    tabsWrapper: {
      flex: 1,
      minWidth: 0,
    },
    listContainer: {
      gap: spacing.S,
      paddingHorizontal: spacing.M,
      paddingBottom: spacing.XXXXL * 3,
      width: contentWidth,
    },
    loader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10,
    },
    page: {
      width: containerWidth,
      alignItems: 'center',
    },
    content: {
      width: contentWidth,
      paddingHorizontal: spacing.M,
      flex: 1,
    },
    fillCard: {
      flex: 1,
    },
    fillSpace: {
      flex: 1,
      minHeight: 0,
    },
    assetsContainer: {
      paddingTop: spacing.S,
    },
    ascendingActionColor: {
      backgroundColor: theme.brand.ascending,
    },
    regularActionColor: {
      backgroundColor: theme.background.tertiary,
    },
  });
