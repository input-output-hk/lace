/* eslint-disable sonarjs/cognitive-complexity */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import isNil from 'lodash/isNil';
import { Wallet } from '@lace/cardano';
import { AssetTableProps } from '@lace/core';
import { useObservable } from '@lace/common';
import { useBalances, useFetchCoinPrice, useRedirection } from '@hooks';
import { useWalletStore } from '@src/stores';
import { useCurrencyStore } from '@providers/currency';
import { assetTransformer, cardanoTransformer } from '@src/utils/assets-transformers';
import { Layout, SectionLayout, TopUpWalletCard } from '@src/views/browser-view/components';
import { DrawerContent } from '@src/views/browser-view/components/Drawer';
import { walletRoutePaths } from '@routes';
import { APP_MODE_POPUP } from '@src/utils/constants';
import { ContentLayout } from '@components/Layout';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { isNFT } from '@src/utils/is-nft';
import {
  SendFlowAnalyticsProperties,
  SendFlowTriggerPoints,
  useAnalyticsSendFlowTriggerPoint,
  useCoinStateSelector,
  useOpenTransactionDrawer
} from '../../send-transaction';
import { getTotalWalletBalance, sortAssets } from '../utils';
import { AssetsPortfolio } from './AssetsPortfolio/AssetsPortfolio';
import { AssetDetailsDrawer } from './AssetDetailsDrawer/AssetDetailsDrawer';
import { AssetActivityDetails } from './AssetActivityDetails/AssetActivityDetails';
import { AssetEducationalList } from './AssetEducationalList/AssetEducationalList';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
import { USE_FOOR_TOPUP } from '@src/views/browser-view/components/TopUpWallet/config';
import { useIsSmallerScreenWidthThan } from '@hooks/useIsSmallerScreenWidthThan';
import { BREAKPOINT_SMALL } from '@src/styles/constants';
import { MidnightEventBanner } from './MidnightEventBanner';
import { getProviders } from "@stores/slices";
import { coalesceValueQuantities } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import isEqual from 'lodash/isEqual'

const LIST_CHUNK_SIZE = 12;
const SEND_COIN_OUTPUT_ID = 'output1';
const ASSETS_OTHER_THAN_ADA = 2;

interface AssetsProps {
  topSection?: React.ReactNode;
}

const programmableAssetCache = new Map();

// eslint-disable-next-line max-statements
export const Assets = ({ topSection }: AssetsProps): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const openTransactionDrawer = useOpenTransactionDrawer({ content: DrawerContent.SEND_TRANSACTION });
  const { priceResult, status: fetchPriceStatus } = useFetchCoinPrice();
  const { fiatCurrency } = useCurrencyStore();
  const redirectToSend = useRedirection<{ params: { id: string } }>(walletRoutePaths.send);
  const {
    inMemoryWallet,
    walletUI: { cardanoCoin, appMode, areBalancesVisible, getHiddenBalancePlaceholder },
    setAssetDetails,
    assetDetails,
    activityDetail,
    resetActivityState,
    blockchainProvider,
    environmentName,
    currentChain
  } = useWalletStore();
  const popupView = appMode === APP_MODE_POPUP;
  const hiddenBalancePlaceholder = getHiddenBalancePlaceholder();
  const { setPickedCoin } = useCoinStateSelector(SEND_COIN_OUTPUT_ID);
  const { setTriggerPoint } = useAnalyticsSendFlowTriggerPoint();
  const isScreenTooSmallForSidePanel = useIsSmallerScreenWidthThan(BREAKPOINT_SMALL);
  const isMainnet = currentChain?.networkMagic === Wallet.Cardano.NetworkMagics.Mainnet;

  const [isActivityDetailsOpen, setIsActivityDetailsOpen] = useState(false);
  const [fullAssetList, setFullAssetList] = useState<AssetTableProps['rows']>();
  const [fullProgrammableAssetList, setFullProgrammableAssetList] = useState<AssetTableProps['rows']>();
  const [listItemsAmount, setListItemsAmount] = useState(LIST_CHUNK_SIZE);
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();

  const [totalProgrammableAssets, setTotalProgrammableAssets] = useState<Wallet.Cardano.Value>({ coins: BigInt(0) });
  const { utxoProvider, assetProvider } = getProviders();
  const addresses = useObservable(inMemoryWallet.addresses$);

  const programmableAddress = useMemo(() => {
    const firstGroupedAddress = addresses?.[0];
    if (!firstGroupedAddress) return undefined;

    const progLogicBase : Wallet.Cardano.Credential = {
      type: Wallet.Cardano.CredentialType.ScriptHash,
      hash: Crypto.Hash28ByteBase16('fca77bcce1e5e73c97a0bfa8c90f7cd2faff6fd6ed5b6fec1c04eefa')
    }

    const address = Wallet.Cardano.Address.fromString(firstGroupedAddress.address).asBase()!;
    const paymentCred = address.getPaymentCredential();
    const progAddress = Wallet.Cardano.BaseAddress.fromCredentials(currentChain?.networkId, progLogicBase, paymentCred).toAddress().toBech32();

    console.log(`Programmable Address ${progAddress}`);

    return progAddress;
  }, [addresses]);

  useEffect(() => {
    const subscription = inMemoryWallet.tip$.subscribe({
      next: async () => {
        try {
          if (!programmableAddress) return;

          const utxos = await utxoProvider.utxoByAddresses({ addresses: [programmableAddress] });
          const total = coalesceValueQuantities(utxos.map((utxo) => utxo[1].value));

          const ids = total.assets
            ? [...total.assets.keys()].filter((id) => !programmableAssetCache.has(id))
            : [];

          if (ids.length > 0) {
            const fetchedAssets = await assetProvider.getAssets({
              assetIds: ids,
              extraData: { nftMetadata: true, tokenMetadata: true },
            });

            fetchedAssets.forEach((asset) => {
              programmableAssetCache.set(asset.assetId, asset);
            });
          }

          setTotalProgrammableAssets((prev) => {
            if (
              prev.coins === total.coins &&
              isEqual(prev.assets, total.assets)
            ) {
              return prev;
            }
            return total;
          });
        } catch (error) {
          console.error('Failed to fetch UTXOs:', error);
        }
      },
      error: (err) => console.error('Error in tip$ subscription:', err),
    });

    return () => subscription.unsubscribe();
  }, [programmableAddress, inMemoryWallet, utxoProvider]);

  const assetsInfo = useObservable(inMemoryWallet.assetInfo$);

  // Wallet's coin balance in ADA and converted to fiat, including available rewards
  const { balance: balanceInAdaAndFiat } = useBalances(priceResult?.cardano?.price);
  // Wallet's coin balance in lovelace calculated from UTxOs (without rewards)
  const utxoTotal = useObservable(inMemoryWallet.balance.utxo.total$);
  // Wallet's available rewards (yet to be claimed) in lovelace
  const lovelaceRewards = useObservable(inMemoryWallet.balance.rewardAccounts.rewards$);
  // Wallet's coin balance from UTxOs + available rewards in lovelace (without assets)
  const lovelaceBalanceWithRewards = useMemo(
    () => BigInt(utxoTotal?.coins || 0) + BigInt(lovelaceRewards || 0),
    [lovelaceRewards, utxoTotal]
  );
  // Wait for initial wallet's balance and price loading
  const isLoadingFirstTime = !utxoTotal || !priceResult.cardano || !totalProgrammableAssets;

  /**
   * Means it has more than 1 asset (ADA) in portfolio for Assets list that it's not an NFT.
   */
  const hasTokens = useMemo(() => {
    if (isNil(utxoTotal?.assets) || utxoTotal?.assets?.size === 0) return false;
    // Look for at least one asset that is not an NFT
    for (const [assetId] of utxoTotal.assets) {
      const assetInfo = assetsInfo?.get(assetId);
      // If no assetInfo, assume it's not an NFT until the info is loaded
      if (!assetInfo || !isNFT(assetInfo)) return true;
    }
    // Return false if all assets are NFTs as we are not displaying them in this component
    return false;
  }, [assetsInfo, utxoTotal?.assets]);

  const hasProgrammableTokens = useMemo(() => {
    if (isNil(totalProgrammableAssets?.assets) || totalProgrammableAssets?.assets?.size === 0) return false;
    for (const [assetId] of totalProgrammableAssets.assets) {
      let assetInfo = assetsInfo?.get(assetId);

      if (!assetInfo && programmableAssetCache.has(assetId)) {
        assetInfo = programmableAssetCache.get(assetId);
      }

      if (assetInfo) return true;
    }
    return false;
  }, [programmableAssetCache, assetsInfo, totalProgrammableAssets?.assets]);

  /**
   * Transforms a non NFT asset to an IRow component for the AssetTable
   */
  const getTransformedAsset = useCallback(
    (assetId, withVisibleBalances = true) => {
      let info = assetsInfo?.get(assetId);

      if (!info && programmableAssetCache.has(assetId)) {
        info = programmableAssetCache.get(assetId);
      }

      const fiat = priceResult?.cardano?.price;
      const pricesInfo = priceResult?.tokens?.get(assetId);
      return info && !isNFT(info)
        ? assetTransformer({
            key: assetId,
            fiat,
            token: info,
            total: utxoTotal,
            pricesInfo,
            fiatCurrency,
            areBalancesVisible: withVisibleBalances || areBalancesVisible,
            balancesPlaceholder: hiddenBalancePlaceholder
          })
        : undefined;
    },
    [
      areBalancesVisible,
      assetsInfo,
      programmableAssetCache,
      hiddenBalancePlaceholder,
      fiatCurrency,
      priceResult?.cardano?.price,
      priceResult?.tokens,
      utxoTotal
    ]
  );

  /**
   * Transforms Cardano coin to an IRow component for the AssetTable
   */
  const getTransformedCardano = useCallback(
    (withVisibleBalances) =>
      cardanoTransformer({
        total: {
          ...utxoTotal,
          coins: lovelaceBalanceWithRewards
        },
        fiatPrice: priceResult?.cardano,
        cardanoCoin,
        fiatCode: fiatCurrency?.code,
        areBalancesVisible: withVisibleBalances || areBalancesVisible,
        balancesPlaceholder: hiddenBalancePlaceholder
      }),
    [
      areBalancesVisible,
      hiddenBalancePlaceholder,
      cardanoCoin,
      fiatCurrency?.code,
      priceResult?.cardano,
      utxoTotal,
      lovelaceBalanceWithRewards
    ]
  );

  /**
   * Assets are loading if only ADA was populated in the list and there are more assets to load and append to the UI.
   */
  const isBalanceLoading = useMemo(
    () => hasTokens && fullAssetList.length < ASSETS_OTHER_THAN_ADA && hasProgrammableTokens && fullAssetList.length < ASSETS_OTHER_THAN_ADA ,
    [hasTokens, hasProgrammableTokens, fullAssetList, fullProgrammableAssetList]
  );

  // Asset Table Pagination
  const paginatedAssetList = useMemo(() => fullAssetList?.slice(0, listItemsAmount), [fullAssetList, listItemsAmount]);
  const paginatedProgrammableAssetList = useMemo(() => fullProgrammableAssetList?.slice(0, listItemsAmount), [fullProgrammableAssetList, listItemsAmount]);

  const onAssetRowClick = (id: string) => {
    analytics.sendEventToPostHog(PostHogAction.TokenTokensTokenRowClick);
    const selectedAsset = id === cardanoCoin.id ? getTransformedCardano(true) : getTransformedAsset(id, true);
    setAssetDetails(selectedAsset);
    setSelectedAssetId(id);
  };

  // Total amount of the portfolio balance in fiat, including assets and rewards
  const totalWalletBalanceWithTokens = useMemo(
    () =>
      getTotalWalletBalance(
        balanceInAdaAndFiat?.total?.fiatBalance,
        priceResult.tokens,
        utxoTotal?.assets,
        priceResult?.cardano?.price || 0,
        assetsInfo
      ),
    [
      assetsInfo,
      balanceInAdaAndFiat?.total?.fiatBalance,
      priceResult?.cardano?.price,
      priceResult.tokens,
      utxoTotal?.assets
    ]
  );

  const closeActivityDetailsDrawer = () => setIsActivityDetailsOpen(false);
  const onActivityDetailsBack = useCallback(() => {
    resetActivityState();
    closeActivityDetailsDrawer();
    setAssetDetails(fullAssetList.find((item) => item.id === selectedAssetId));
  }, [selectedAssetId, fullAssetList, resetActivityState, setAssetDetails]);

  const onActivityDetailsVisibleChange = useCallback(
    (visible: boolean) => {
      // Clear transaction details from state after drawer is closed
      if (!visible && activityDetail) {
        resetActivityState();
      }
    },
    [activityDetail, resetActivityState]
  );

  const onSendAssetClick = (id: string) => {
    // eslint-disable-next-line camelcase
    const postHogProperties: SendFlowAnalyticsProperties = { trigger_point: SendFlowTriggerPoints.TOKENS };
    setPickedCoin(SEND_COIN_OUTPUT_ID, { prev: cardanoCoin.id, next: id });
    setTriggerPoint(SendFlowTriggerPoints.TOKENS);

    analytics.sendEventToPostHog(PostHogAction.SendClick, postHogProperties);
    if (popupView) {
      redirectToSend({ params: { id } });
    } else {
      setAssetDetails();
      openTransactionDrawer();
    }
  };

  useEffect(() => {
    if (activityDetail) {
      setAssetDetails();
    }

    if (!assetDetails && activityDetail) {
      setIsActivityDetailsOpen(true);
    }
  }, [assetDetails, activityDetail, setAssetDetails]);

  // TODO: move this to store once LW-1494 is done
  useEffect(() => {
    const tokens = [];
    const programmableTokens = [];

    // TODO: refactor so we can use `getTokenList` [LW-6496]
    if (hasTokens) {
      for (const [assetId, assetBalance] of utxoTotal.assets) {
        if (assetBalance <= 0) return;
        const asset = getTransformedAsset(assetId, false);
        if (asset) tokens.push(asset);
      }
    }

    if (hasProgrammableTokens) {
      for (const [assetId, assetBalance] of totalProgrammableAssets.assets) {
        if (assetBalance <= 0) return;
        const asset = getTransformedAsset(assetId, false);

        if (asset) programmableTokens.push(asset);
      }
    }
    tokens.sort(sortAssets);
    programmableTokens.sort(sortAssets);

    const cardano = lovelaceBalanceWithRewards > BigInt(0) ? [getTransformedCardano(false)] : [];

    setFullAssetList([...cardano, ...tokens]);
    setFullProgrammableAssetList([...programmableTokens]);
  }, [
    assetsInfo,
    utxoTotal,
    cardanoCoin,
    priceResult,
    fiatCurrency,
    hasTokens,
    hasProgrammableTokens,
    areBalancesVisible,
    getTransformedAsset,
    getTransformedCardano,
    lovelaceBalanceWithRewards,
    environmentName,
    hiddenBalancePlaceholder,
    totalProgrammableAssets
  ]);

  useEffect(() => {
    // Close asset tx details drawer if network (blockchainProvider) has changed
    closeActivityDetailsDrawer();
  }, [blockchainProvider]);

  const assetsPortfolio = (
    <AssetsPortfolio
      appMode={appMode}
      assetList={paginatedAssetList}
      programmableAssetList={paginatedProgrammableAssetList}
      portfolioTotalBalance={totalWalletBalanceWithTokens}
      isBalanceLoading={isBalanceLoading}
      isLoadingFirstTime={isLoadingFirstTime}
      onRowClick={onAssetRowClick}
      onTableScroll={() => setListItemsAmount((prevState) => prevState + LIST_CHUNK_SIZE)}
      totalAssets={fullAssetList?.length ?? 0}
    />
  );

  const drawers = (
    <>
      <AssetActivityDetails
        afterOpenChange={onActivityDetailsVisibleChange}
        appMode={appMode}
        isVisible={isActivityDetailsOpen}
        onClose={closeActivityDetailsDrawer}
        onBack={onActivityDetailsBack}
      />
      <AssetDetailsDrawer
        fiatCode={fiatCurrency.code}
        openSendDrawer={onSendAssetClick}
        popupView={popupView}
        isBalanceDataFetchedCorrectly={fetchPriceStatus === 'fetched'}
      />
    </>
  );

  return popupView ? (
    <>
      <ContentLayout hasCredit={fullAssetList?.length > 0}>
        <MidnightEventBanner />
        {assetsPortfolio}
      </ContentLayout>
      {drawers}
    </>
  ) : (
    <Layout>
      <SectionLayout
        hasCredit={fullAssetList?.length > 0}
        sidePanelContent={
          <Flex flexDirection="column" gap="$28">
            {USE_FOOR_TOPUP && isMainnet && !isScreenTooSmallForSidePanel && <TopUpWalletCard />}
            <AssetEducationalList />
          </Flex>
        }
      >
        <MidnightEventBanner />
        {topSection}
        {assetsPortfolio}
        {drawers}
      </SectionLayout>
    </Layout>
  );
};
