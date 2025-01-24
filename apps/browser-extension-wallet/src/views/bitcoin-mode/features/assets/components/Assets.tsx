/* eslint-disable sonarjs/cognitive-complexity */
import React, { useMemo } from 'react';
import { useObservable } from '@lace/common';
import { useFetchCoinPrice } from '@hooks';
import { useWalletStore } from '@src/stores';
import { ContentLayout } from '@components/Layout';
import { AssetsPortfolio } from './AssetsPortfolio/AssetsPortfolio';
import BitcoinLogo from '../../../../../assets/icons/browser-view/bitcoin-logo.svg';

// eslint-disable-next-line max-statements
export const Assets = (): React.ReactElement => {
  const { priceResult } = useFetchCoinPrice();
  const {
    inMemoryWallet,
    walletUI: { appMode, areBalancesVisible, getHiddenBalancePlaceholder }
  } = useWalletStore();

  const hiddenBalancePlaceholder = getHiddenBalancePlaceholder();

  // Wallet's coin balance in ADA and converted to fiat, including available rewards
  const utxoTotal = useObservable(inMemoryWallet.balance.utxo.total$);
  const isLoadingFirstTime = !utxoTotal || !priceResult.cardano;

  const assets = useMemo(() => [
    {
      id: 'btc',
      logo: BitcoinLogo,
      defaultLogo: BitcoinLogo,
      name: 'Bitcoin',
      ticker: 'BTC',
      price: '100',
      variation: '',
      balance: areBalancesVisible ? '500' : hiddenBalancePlaceholder,
      fiatBalance: areBalancesVisible ? '500' : hiddenBalancePlaceholder
    }
  ], [areBalancesVisible, hiddenBalancePlaceholder]);

  const assetsPortfolio = (
    <AssetsPortfolio
      appMode={appMode}
      assetList={assets}
      isBalanceLoading={false}
      isLoadingFirstTime={isLoadingFirstTime}
      portfolioTotalBalance={'500'}
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
