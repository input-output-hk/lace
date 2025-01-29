/* eslint-disable sonarjs/cognitive-complexity */
import React, { useMemo } from 'react';
import { useObservable } from '@lace/common';
import {useFetchCoinPrice, useWalletManager} from '@hooks';
import { useWalletStore } from '@src/stores';
import { ContentLayout } from '@components/Layout';
import { AssetsPortfolio } from './AssetsPortfolio/AssetsPortfolio';
import BitcoinLogo from '../../../../../assets/icons/browser-view/bitcoin-logo.svg';

const SATS_IN_BTC = 100000000;

// eslint-disable-next-line max-statements
export const Assets = (): React.ReactElement => {
  const { priceResult } = useFetchCoinPrice();
  const {
    walletUI: { appMode, areBalancesVisible, getHiddenBalancePlaceholder }
  } = useWalletStore();

  const { bitcoinWallet } = useWalletManager();

  const hiddenBalancePlaceholder = getHiddenBalancePlaceholder();
  const balance = useObservable(bitcoinWallet.balance$, BigInt(0));
  const isLoadingFirstTime = !balance || !priceResult.bitcoin;
  const bitcoinPrice = useMemo(() => priceResult.bitcoin?.price ?? 0, [priceResult.bitcoin]);

  const totalBalance = useMemo(() => {
      return (Number(balance) / SATS_IN_BTC) * bitcoinPrice;
    }
  , [balance, bitcoinPrice]);

  const assets = useMemo(() => [
    {
      id: 'btc',
      logo: BitcoinLogo,
      defaultLogo: BitcoinLogo,
      name: 'Bitcoin',
      ticker: 'BTC',
      price: bitcoinPrice.toString(),
      variation: '',
      balance: areBalancesVisible ? (Number(balance) / SATS_IN_BTC).toString() : hiddenBalancePlaceholder,
      fiatBalance: areBalancesVisible ? `${totalBalance.toString()} USD` : hiddenBalancePlaceholder
    }
  ], [areBalancesVisible, hiddenBalancePlaceholder, bitcoinPrice, balance, totalBalance]);

  const assetsPortfolio = (
    <AssetsPortfolio
      appMode={appMode}
      assetList={assets}
      isBalanceLoading={false}
      isLoadingFirstTime={isLoadingFirstTime}
      portfolioTotalBalance={totalBalance.toString()}
      onRowClick={() => {}}
      onTableScroll={() => {}}
      totalAssets={assets.length}
    />
  );

  return (
    <ContentLayout hasCredit={true}>
      {assetsPortfolio}
    </ContentLayout>
  );
};
