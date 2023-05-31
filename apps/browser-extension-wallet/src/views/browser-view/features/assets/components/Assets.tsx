/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable complexity */
/* eslint-disable no-magic-numbers */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useBalances, useFetchCoinPrice, useObservable, useRedirection } from '@hooks';
import { Skeleton } from 'antd';
import { useWalletStore } from '@src/stores';
import { AssetTable, AssetTableProps, SendReceive } from '@lace/core';
import { Drawer, DrawerNavigation } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { useCurrencyStore } from '@providers/currency';
import { useTranslation } from 'react-i18next';
import { FundWalletBanner } from '@src/views/browser-view/components/FundWalletBanner';
import { AssetDetailsDrawer } from './AssetDetailsDrawer';
import { cardanoTransformer, assetTransformer, getTokenAmountInFiat } from '@src/utils/assets-transformers';
import { useCoinStateSelector } from '../../send-transaction';
import { TransactionDetail } from '@views/browser/features/activity';
import { SectionLayout, EducationalList, PortfolioBalance, Layout } from '@src/views/browser-view/components';
import { useDrawer } from '@src/views/browser-view/stores';
import { DrawerContent } from '@src/views/browser-view/components/Drawer';
import styles from './Assets.module.scss';
import { walletRoutePaths } from '@routes';
import { APP_MODE_POPUP, LACE_APP_ID } from '@src/utils/constants';
import Book from '@assets/icons/book.svg';
import LightBulb from '@assets/icons/light.svg';
import Video from '@assets/icons/video.svg';
import { SectionTitle } from '@components/Layout/SectionTitle';
import { ContentLayout, CONTENT_LAYOUT_ID } from '@components/Layout';
import isNil from 'lodash/isNil';
import { useAnalyticsContext } from '@providers';
import {
  AnalyticsEventCategories,
  AnalyticsEventActions,
  AnalyticsEventNames
} from '@providers/AnalyticsProvider/analyticsTracker';
import { AssetSortBy } from '../types';
import BigNumber from 'bignumber.js';
import { TokenPrices } from '@lib/scripts/types';
import { compactNumber } from '@src/utils/format-number';
import { isNFT } from '@src/utils/is-nft';

const useStoreSelector = () =>
  useWalletStore((state) => ({
    inMemoryWallet: state.inMemoryWallet,
    walletInfo: state.walletInfo,
    setAssetDetails: state.setAssetDetails,
    assetDetails: state.assetDetails,
    transactionDetail: state.transactionDetail,
    resetTransactionState: state.resetTransactionState,
    walletUI: state.walletUI,
    blockchainProvider: state.blockchainProvider,
    setBalancesVisibility: state.setBalancesVisibility
  }));

const chunkSize = 12;
const sendCoinOutputId = 'output1';
const minutesUntilDisplayBanner = 3;
const ASSETS_OTHER_THAN_ADA = 2;
const BALANCES_PLACEHOLDER_LENGTH = 8;

interface AssetsProps {
  topSection?: React.ReactNode;
}

const sortAssets = ({ sortBy: tokenA }: AssetSortBy, { sortBy: tokenB }: AssetSortBy) => {
  // 1. order by Fiat Balance (desc)
  if (tokenA.fiatBalance !== undefined && tokenB.fiatBalance === undefined) return -1;
  if (tokenA.fiatBalance === undefined && tokenB.fiatBalance !== undefined) return 1;
  if (tokenA.fiatBalance !== tokenB.fiatBalance) return tokenB.fiatBalance - tokenA.fiatBalance;

  // 2. order by token Balance (desc)
  if (tokenA.amount !== undefined && tokenB.amount === undefined) return -1;
  if (tokenA.amount === undefined && tokenB.amount !== undefined) return 1;
  const BigNumberTokenA = new BigNumber(tokenA.amount);
  const BigNumberTokenB = new BigNumber(tokenB.amount);

  if (!BigNumberTokenA.isEqualTo(BigNumberTokenB)) return BigNumberTokenB.minus(BigNumberTokenA).isLessThan(0) ? -1 : 1;

  // 3. order by Metadata Name (asc) if same Policy Id
  if (tokenA.metadataName !== undefined && tokenB.metadataName === undefined) return -1;
  if (tokenA.metadataName === undefined && tokenB.metadataName !== undefined) return 1;
  if (tokenA.metadataName > tokenB.metadataName) return 1;
  if (tokenA.metadataName < tokenB.metadataName) return -1;

  // 4. order by Fingerprint (asc) if same Metadata Name
  if (tokenA.fingerprint > tokenB.fingerprint) return 1;
  if (tokenA.fingerprint < tokenB.fingerprint) return -1;

  return 0;
};

const getTotalWalletBalance = (
  adaInFiat: string,
  tokenPrices: TokenPrices,
  tokenBalances: Wallet.Cardano.TokenMap,
  fiat: number,
  tokens: Wallet.Assets
) => {
  if (!tokenBalances) return adaInFiat;
  const totalTokenBalanceInFiat = tokenPrices
    ? // eslint-disable-next-line unicorn/no-array-reduce
      [...tokenPrices.entries()].reduce((total, [key, { priceInAda }]) => {
        const balance = tokenBalances?.get(key);
        const info = tokens?.get(key);
        if (info?.tokenMetadata !== undefined && balance) {
          const formatedBalance = Wallet.util.calculateAssetBalance(balance, info);
          const balanceInFiat = getTokenAmountInFiat(formatedBalance, priceInAda, fiat);
          return total.plus(balanceInFiat);
        }

        return total;
      }, new BigNumber(0))
    : new BigNumber(0);

  return totalTokenBalanceInFiat.plus(adaInFiat).toString();
};

// eslint-disable-next-line max-statements
export const Assets = ({ topSection }: AssetsProps): React.ReactElement => {
  const { t } = useTranslation();
  const [redirectToReceive] = useRedirection(walletRoutePaths.receive);
  const [redirectToSend] = useRedirection<{ params: { id: string } }>(walletRoutePaths.send);
  const [list, setList] = useState<AssetTableProps['rows']>();
  const [isTxDetailsOpen, setIsTxDetailsOpen] = useState(false);
  const [listItemsAmount, setListItemsAmount] = useState(chunkSize);
  const [assetID, setAssetID] = useState<string | undefined>();
  const analytics = useAnalyticsContext();

  const {
    inMemoryWallet,
    walletInfo,
    walletUI: { cardanoCoin, appMode, canManageBalancesVisibility, areBalancesVisible, hiddenBalancesPlaceholder },
    setBalancesVisibility,
    setAssetDetails,
    assetDetails,
    transactionDetail,
    resetTransactionState,
    blockchainProvider
  } = useStoreSelector();
  const popupView = appMode === APP_MODE_POPUP;
  const { priceResult, status, timestamp } = useFetchCoinPrice();
  const { fiatCurrency } = useCurrencyStore();
  const { balance } = useBalances(priceResult?.cardano?.price);

  const [, setSendDrawerVisibility] = useDrawer();
  const { setPickedCoin } = useCoinStateSelector(sendCoinOutputId);

  const total = useObservable(inMemoryWallet.balance.utxo.total$);
  const rewards = useObservable(inMemoryWallet.balance.rewardAccounts.rewards$);
  const assetsInfo = useObservable(inMemoryWallet.assetInfo$);

  const openSend = () => {
    analytics.sendEvent({
      category: AnalyticsEventCategories.SEND_TRANSACTION,
      action: AnalyticsEventActions.CLICK_EVENT,
      name: AnalyticsEventNames.SendTransaction.SEND_TX_BUTTON_POPUP
    });
    redirectToSend({ params: { id: '1' } });
  };

  const titles = {
    glossary: t('educationalBanners.title.glossary'),
    faq: t('educationalBanners.title.faq'),
    video: t('educationalBanners.title.video')
  };

  const sendReceiveTranslation = {
    send: t('core.sendReceive.send'),
    receive: t('core.sendReceive.receive')
  };

  const educationalItems = [
    {
      title: titles.glossary,
      subtitle: t('educationalBanners.subtitle.whatIsADigitalAsset'),
      src: Book,
      link: `${process.env.WEBSITE_URL}/glossary?term=asset`
    },
    {
      title: titles.faq,
      subtitle: t('educationalBanners.subtitle.howToSendReceiveFunds'),
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=how-do-i-send-and-receive-digital-assets`
    },
    {
      title: titles.video,
      subtitle: t('educationalBanners.subtitle.secureSelfCustody'),
      src: Video,
      link: `${process.env.WEBSITE_URL}/learn?video=how-lace-gives-you-full-control-of-your-private-keys`
    },
    {
      title: titles.video,
      subtitle: t('educationalBanners.subtitle.connectingDApps'),
      src: Video,
      link: `${process.env.WEBSITE_URL}/learn?video=connecting-to-dapps-with-lace`
    }
  ];

  /**
   * Means it has more than 1 asset (ADA) in portfolio for Assets list.
   */
  const hasTokens = useMemo(() => !isNil(total?.assets) && total?.assets?.size > 0, [total?.assets]);
  /**
   * Assets are loading if only ADA was populated in the list and there are more assets to load and append to the UI.
   */
  const isBalanceLoading = useMemo(() => hasTokens && list.length < ASSETS_OTHER_THAN_ADA, [hasTokens, list]);

  useEffect(() => {
    if (transactionDetail) {
      setAssetDetails();
    }

    if (!assetDetails && transactionDetail) {
      setIsTxDetailsOpen(true);
    }
  }, [assetDetails, transactionDetail, setAssetDetails]);

  const balancesPlaceholder = useMemo(
    () =>
      Array.from({ length: BALANCES_PLACEHOLDER_LENGTH })
        .map(() => hiddenBalancesPlaceholder)
        .join(''),
    [hiddenBalancesPlaceholder]
  );

  const getTransformedAsset = useCallback(
    (assetId, withVisibleBalances = true) => {
      const info = assetsInfo?.get(assetId);
      const fiat = priceResult?.cardano?.price;
      const pricesInfo = priceResult?.tokens?.get(assetId);
      return info && !isNFT(info)
        ? assetTransformer({
            key: assetId,
            fiat,
            token: info,
            total,
            pricesInfo,
            fiatCurrency,
            areBalancesVisible: withVisibleBalances || areBalancesVisible,
            balancesPlaceholder
          })
        : undefined;
    },
    [
      areBalancesVisible,
      assetsInfo,
      balancesPlaceholder,
      fiatCurrency,
      priceResult?.cardano?.price,
      priceResult?.tokens,
      total
    ]
  );

  const getTransfromedCardano = useCallback(
    (withVisibleBalances) => {
      const totalIncRewards = BigInt(total?.coins || 0) + BigInt(rewards || 0);
      return cardanoTransformer({
        total: {
          ...total,
          coins: totalIncRewards
        },
        fiatPrice: priceResult?.cardano,
        cardanoCoin,
        fiatCode: fiatCurrency?.code,
        areBalancesVisible: withVisibleBalances || areBalancesVisible,
        balancesPlaceholder
      });
    },
    [areBalancesVisible, balancesPlaceholder, cardanoCoin, fiatCurrency?.code, priceResult?.cardano, rewards, total]
  );

  // TODO: move this to store once https://input-output.atlassian.net/browse/LW-1494 is done
  useEffect(() => {
    const tokens = [];

    // TODO: refactor so we can use `getTokenList` [LW-6496]
    if (hasTokens) {
      for (const [assetId, assetBalance] of total.assets) {
        if (assetBalance <= 0) return;
        const asset = getTransformedAsset(assetId, false);
        if (asset) tokens.push(asset);
      }
    }
    tokens.sort(sortAssets);

    const cardano = total?.coins ? [getTransfromedCardano(false)] : [];

    setList([...cardano, ...tokens]);
  }, [
    assetsInfo,
    priceResult?.cardano,
    total,
    rewards,
    cardanoCoin,
    fiatCurrency?.code,
    priceResult?.tokens,
    fiatCurrency,
    hasTokens,
    fiatCurrency,
    areBalancesVisible,
    balancesPlaceholder,
    getTransformedAsset,
    getTransfromedCardano
  ]);

  const onScroll = () => setListItemsAmount((prevState) => prevState + chunkSize);
  const onRowClick = (id: string) => {
    analytics.sendEvent({
      category: AnalyticsEventCategories.VIEW_TOKENS,
      action: AnalyticsEventActions.CLICK_EVENT,
      name: popupView
        ? AnalyticsEventNames.ViewTokens.VIEW_TOKEN_DETAILS_POPUP
        : AnalyticsEventNames.ViewTokens.VIEW_TOKEN_DETAILS_BROWSER
    });
    const selectedAsset = id === cardanoCoin.id ? getTransfromedCardano(true) : getTransformedAsset(id, true);
    setAssetDetails(selectedAsset);
    setAssetID(id);
  };

  const onSendClick = (id: string) => {
    setPickedCoin(sendCoinOutputId, { prev: cardanoCoin.id, next: id });
    analytics.sendEvent({
      category: AnalyticsEventCategories.VIEW_TOKENS,
      action: AnalyticsEventActions.CLICK_EVENT,
      name: popupView
        ? AnalyticsEventNames.ViewTokens.SEND_TOKEN_POPUP
        : AnalyticsEventNames.ViewTokens.SEND_TOKEN_BROWSER
    });

    if (popupView) {
      redirectToSend({ params: { id } });
    } else {
      setAssetDetails();
      setSendDrawerVisibility({ content: DrawerContent.SEND_TRANSACTION });
    }
  };

  const cleanTransactionDetails = (visible: boolean) => {
    if (!visible && transactionDetail) {
      resetTransactionState();
    }
  };

  const closeTransactionDetails = () => setIsTxDetailsOpen(false);

  const backToAssetDetails = () => {
    resetTransactionState();
    closeTransactionDetails();
    setAssetDetails(list.find((item) => item.id === assetID));
  };

  const filteredList = useMemo(() => list?.slice(0, listItemsAmount), [list, listItemsAmount]);
  const isLoadingFirstTime = !total || !priceResult.cardano;

  const totalWalletBalanceWithTokens = useMemo(
    () =>
      getTotalWalletBalance(
        balance?.total?.fiatBalance,
        priceResult.tokens,
        total?.assets,
        priceResult?.cardano?.price || 0,
        assetsInfo
      ),
    [assetsInfo, balance?.total?.fiatBalance, priceResult?.cardano?.price, priceResult.tokens, total?.assets]
  );
  const isBalanceDataFetchedCorrectly = useMemo(() => !['error', 'idle', 'fetching'].includes(status), [status]);
  const isWarningBannerDisplayed = () => {
    // if there is no timestamp, that means that we never saved a previous price, so we just check for if it has error
    if (status === 'error' && timestamp) {
      const passedMinutesSinceLastSavedPrice = (Date.now() - timestamp) / 60_000;
      // display banner only after 3 minutes
      return passedMinutesSinceLastSavedPrice > minutesUntilDisplayBanner;
    }

    return status === 'error';
  };

  const handleBalancesVisibility = useCallback(setBalancesVisibility, [setBalancesVisibility]);

  const content = (
    <Skeleton loading={isLoadingFirstTime}>
      <SectionTitle
        title={t('browserView.assets.title')}
        sideText={`(${list?.length ?? '0'})`}
        classname={styles.headerContainer}
      />
      <div className={styles.portfolio}>
        <PortfolioBalance
          loading={!balance || isBalanceLoading}
          balance={compactNumber(totalWalletBalanceWithTokens)}
          currencyCode={fiatCurrency.code}
          label={t('browserView.assets.totalWalletBalance')}
          popupView={popupView}
          isBannerVisible={isWarningBannerDisplayed()}
          lastPriceFetchedDate={timestamp}
          canManageBalancesVisibility={total?.coins && canManageBalancesVisibility}
          areBalancesVisible={areBalancesVisible || !total?.coins}
          handleBalancesVisibility={handleBalancesVisibility}
          hiddenBalancesPlaceholder={balancesPlaceholder}
        />
      </div>
      {popupView && list?.length > 0 && (
        <SendReceive
          leftButtonOnClick={openSend}
          rightButtonOnClick={redirectToReceive}
          isReversed
          popupView
          sharedClass={styles.testPopupClass}
          translations={sendReceiveTranslation}
        />
      )}
      <Skeleton loading={!list}>
        {total?.coins ? (
          <AssetTable
            rows={filteredList}
            onRowClick={onRowClick}
            totalItems={list?.length ?? 0}
            scrollableTargetId={popupView ? CONTENT_LAYOUT_ID : LACE_APP_ID}
            onLoad={onScroll}
            popupView={popupView}
          />
        ) : (
          <FundWalletBanner
            title={t('browserView.assets.welcome')}
            subtitle={t('browserView.assets.startYourWeb3Journey')}
            prompt={t('browserView.fundWalletBanner.prompt')}
            walletAddress={walletInfo.address.toString()}
          />
        )}
      </Skeleton>
    </Skeleton>
  );

  const details = (
    <AssetDetailsDrawer
      fiatCode={fiatCurrency.code}
      fiatPrice={priceResult?.cardano?.price}
      openSendDrawer={onSendClick}
      popupView={popupView}
      isBalanceDataFetchedCorrectly={isBalanceDataFetchedCorrectly}
    />
  );

  // Close asset tx details drawer if network (blockchainProvider) has changed
  useEffect(() => {
    closeTransactionDetails();
  }, [blockchainProvider]);

  const txDrawer = (
    <Drawer
      afterVisibleChange={cleanTransactionDetails}
      visible={isTxDetailsOpen}
      onClose={closeTransactionDetails}
      navigation={<DrawerNavigation onCloseIconClick={closeTransactionDetails} onArrowIconClick={backToAssetDetails} />}
      popupView={popupView}
    >
      {transactionDetail && priceResult && (
        <div className={styles.txDetailsContainer}>
          <TransactionDetail price={priceResult} />
        </div>
      )}
    </Drawer>
  );

  return popupView ? (
    <>
      <ContentLayout hasCredit={list?.length > 0}>{content}</ContentLayout>
      {details}
      {txDrawer}
    </>
  ) : (
    <Layout>
      <SectionLayout
        hasCredit={list?.length > 0}
        sidePanelContent={
          <EducationalList items={educationalItems} title={t('browserView.sidePanel.aboutYourWallet')} />
        }
      >
        {topSection}
        {content}
        {details}
        {txDrawer}
      </SectionLayout>
    </Layout>
  );
};
