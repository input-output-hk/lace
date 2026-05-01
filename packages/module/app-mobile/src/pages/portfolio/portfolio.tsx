import { useUICustomisation } from '@lace-contract/app';
import { type TabRoutes, type TabScreenProps } from '@lace-lib/navigation';
import {
  spacing,
  Tabs,
  PortfolioCard,
  AccountCard,
  Pagination,
  Column,
  CompactPortfolioSkeleton,
  isWeb,
  PageContainerTemplate,
} from '@lace-lib/ui-toolkit';
import { valueToLocale } from '@lace-lib/util-render';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ActivitiesFlatlist } from './activities';
import { NftsList } from './nfts';
import { TokensList } from './tokens-list';
import { AccountViewType, SelectedAssetView } from './types';
import { usePortfolio } from './usePortfolio';

import type { AccountView, AssetView } from './types';

export const Portfolio = ({}: TabScreenProps<TabRoutes.Portfolio>) => {
  const [{ headerHeight, headerTopInset }, setHeaderLayout] = useState({
    headerHeight: 0,
    headerTopInset: 0,
  });
  const [carouselHeight, setCarouselHeight] = useState(0);

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
  } = usePortfolio({ headerHeight, headerTopInset });

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
    () => getStyles({ containerWidth, contentWidth }),
    [containerWidth, contentWidth],
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

  // Portfolio banner customisation
  const [portfolioBannerCustomisation] = useUICustomisation(
    'addons.loadPortfolioBannerUICustomisations',
    currentAccount?.blockchainName,
  );

  const AssetListHeader = useCallback(
    () =>
      currentAccount && portfolioBannerCustomisation?.PortfolioBanner ? (
        <Column style={styles.tabsAndPagination}>
          <portfolioBannerCustomisation.PortfolioBanner
            accountId={currentAccount?.accountId}
          />
        </Column>
      ) : null,
    [
      styles.tabsAndPagination,
      currentAccount,
      portfolioBannerCustomisation?.PortfolioBanner,
    ],
  );

  const onCarouselLayout = useCallback((event: LayoutChangeEvent) => {
    setCarouselHeight(event.nativeEvent.layout.height);
  }, []);

  const pageStyle = useMemo(
    () =>
      carouselHeight > 0 && isTokenPricingEnabled
        ? [styles.page, { height: carouselHeight }]
        : styles.page,
    [styles.page, carouselHeight, isTokenPricingEnabled],
  );

  const contentStyle = useMemo(
    () => (isTokenPricingEnabled ? styles.content : styles.contentCompact),
    [isTokenPricingEnabled, styles.content, styles.contentCompact],
  );

  const cardContainerStyle = useMemo(
    () => (isTokenPricingEnabled ? styles.fillCard : undefined),
    [isTokenPricingEnabled, styles.fillCard],
  );

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

      const nativeTokenInfoCustomisation = accountCardCustomisations.find(
        c =>
          !!c.nativeTokenInfo &&
          c.uiCustomisationSelector({
            blockchainName: account.blockchainName,
          }),
      );

      const coin = nativeTokenInfoCustomisation?.nativeTokenInfo({
        networkType,
      })?.displayShortName;

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
                coin={coin ?? cardData.coin}
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
              coin={coin ?? accountData.coin}
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
      networkType,
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
                containerStyle={listContainerStyle}
                scrollHandler={scrollHandler}
                ifFromPortfolio={isPortfolioView}
                style={styles.fillSpace}
                ListHeaderComponent={AssetListHeader}
                footerSpacerHeight={headerBottomOffset}
                isTokenPricingEnabled={isTokenPricingEnabled}
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
    ],
  );

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
          <FlatList
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
          <Column style={[styles.tabsAndPagination, { paddingTop: spacing.S }]}>
            <Pagination
              pages={accountsData.length}
              activeIndex={activeIndex}
              setActiveIndex={handleIndexChange}
              withNavigation={true}
              loop={false}
              showPortfolioView={true}
              testID="portfolio-carousel-pagination"
            />
            <Tabs
              tabs={tabs}
              value={selectedAssetView}
              onChange={value => {
                setSelectedAssetView(value as SelectedAssetView);
              }}
            />
          </Column>
        </Animated.View>
        {isWeb ? (
          <View style={styles.fillSpace}>
            {renderAssetItem({ item: { type: selectedAssetView } })}
          </View>
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
}: {
  containerWidth: number;
  contentWidth: number;
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
    contentCompact: {
      width: contentWidth,
      paddingHorizontal: spacing.M,
    },
    fillCard: {
      flex: 1,
    },
    fillSpace: {
      flex: 1,
      minHeight: 0,
    },
    assetsContainer: {
      paddingTop: spacing.M,
    },
  });
