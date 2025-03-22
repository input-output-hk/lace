/* eslint-disable sonarjs/cognitive-complexity, no-magic-numbers, consistent-return, @typescript-eslint/no-empty-function */
import React, { useMemo } from 'react';
import { useObservable } from '@lace/common';
import { useFetchCoinPrice, useWalletManager } from '@hooks';
import { useWalletStore } from '@src/stores';
import { ContentLayout } from '@components/Layout';
import { AssetsPortfolio } from './AssetsPortfolio/AssetsPortfolio';
import BitcoinLogo from '../../../../../assets/icons/browser-view/bitcoin-logo.svg';
import BigNumber from 'bignumber.js';
import { MidnightEventBanner } from '@views/browser/features/assets/components/MidnightEventBanner';
import { Layout, SectionLayout } from '@views/browser/components';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
import { AssetEducationalList } from '@views/browser/features/assets/components/AssetEducationalList/AssetEducationalList';
import { APP_MODE_POPUP } from '@utils/constants';
import { useCurrencyStore } from '@providers';
import { compactNumberWithUnit } from '@utils/format-number';

const SATS_IN_BTC = 100_000_000;

interface AssetsProps {
  topSection?: React.ReactNode;
}

const computeBalance = (totalBalance: number, fiatCurrency: string, bitcoinPrice: number): string => {
  if (fiatCurrency === 'ADA') {
    return totalBalance.toFixed(8);
  }

  return new BigNumber((totalBalance * bitcoinPrice).toString()).toFixed(2, BigNumber.ROUND_HALF_UP);
};

// eslint-disable-next-line max-statements
export const Assets = ({ topSection }: AssetsProps): React.ReactElement => {
  const { priceResult } = useFetchCoinPrice();
  const {
    walletUI: { appMode, areBalancesVisible, getHiddenBalancePlaceholder }
  } = useWalletStore();
  const popupView = appMode === APP_MODE_POPUP;
  const { bitcoinWallet } = useWalletManager();
  const hiddenBalancePlaceholder = getHiddenBalancePlaceholder();
  const balance = useObservable(bitcoinWallet.balance$, BigInt(0));
  const isLoadingFirstTime = !priceResult.bitcoin;
  const bitcoinPrice = useMemo(() => priceResult.bitcoin?.price ?? 0, [priceResult.bitcoin]);
  const bitcoinPriceVariation = useMemo(
    () => priceResult.bitcoin?.priceVariationPercentage24h ?? 0,
    [priceResult.bitcoin]
  );
  const { fiatCurrency } = useCurrencyStore();
  const currencyCode = fiatCurrency.code === 'ADA' ? 'BTC' : fiatCurrency.code;
  const totalBalance = useMemo(
    () => (currencyCode === 'BTC' ? Number(balance) / SATS_IN_BTC : (Number(balance) / SATS_IN_BTC) * bitcoinPrice),
    [balance, bitcoinPrice, currencyCode]
  );

  const assets = useMemo(
    () => [
      ...(balance > 0
        ? [
            {
              id: 'btc',
              logo: BitcoinLogo,
              defaultLogo: BitcoinLogo,
              name: 'Bitcoin',
              ticker: 'BTC',
              price: currencyCode === 'BTC' ? '1.000' : compactNumberWithUnit(bitcoinPrice).toString(),
              variation: currencyCode === 'BTC' ? '-' : `${bitcoinPriceVariation.toFixed(2)}`,
              balance: areBalancesVisible ? (Number(balance) / SATS_IN_BTC).toString() : hiddenBalancePlaceholder,
              fiatBalance: areBalancesVisible
                ? `${computeBalance(totalBalance, fiatCurrency.code, 1)} ${currencyCode}`
                : hiddenBalancePlaceholder
            }
          ]
        : [])
    ],
    [
      areBalancesVisible,
      hiddenBalancePlaceholder,
      bitcoinPrice,
      balance,
      totalBalance,
      currencyCode,
      bitcoinPriceVariation
    ]
  );

  const portfolioTotalBalance = useMemo(
    () => computeBalance(totalBalance, fiatCurrency.code, 1),
    [totalBalance, fiatCurrency.code]
  );

  const assetsPortfolio = (
    <AssetsPortfolio
      appMode={appMode}
      assetList={assets}
      isBalanceLoading={false}
      isLoadingFirstTime={isLoadingFirstTime}
      portfolioTotalBalance={portfolioTotalBalance}
      onRowClick={() => {}}
      onTableScroll={() => {}}
      totalAssets={assets.length}
    />
  );

  return popupView ? (
    <>
      <ContentLayout hasCredit={assets?.length > 0}>
        <MidnightEventBanner />
        {assetsPortfolio}
      </ContentLayout>
    </>
  ) : (
    <Layout>
      <SectionLayout
        hasCredit={assets?.length > 0}
        sidePanelContent={
          <Flex flexDirection="column" gap="$28">
            <AssetEducationalList />
          </Flex>
        }
      >
        <MidnightEventBanner />
        {topSection}
        {assetsPortfolio}
      </SectionLayout>
    </Layout>
  );
};
