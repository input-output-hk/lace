import { Skeleton } from 'antd';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { IRow, TransactionCTAs } from '@lace/core';
import { SectionTitle } from '@components/Layout/SectionTitle';
import { APP_MODE_POPUP, AppMode } from '@src/utils/constants';
import { compactNumberWithUnit } from '@src/utils/format-number';
import { PortfolioBalance, TopUpWalletButton } from '@src/views/browser-view/components';
import { useCurrencyStore } from '@providers/currency';
import { useWalletStore } from '@src/stores';
import { useFetchCoinPrice } from '@hooks/useFetchCoinPrice';
import { useRedirection } from '@hooks/useRedirection';
import { walletRoutePaths } from '@routes/wallet-paths';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import styles from './AssetsPortfolio.module.scss';
import BigNumber from 'bignumber.js';
import { SendFlowTriggerPoints } from '../../../send-transaction';
import { AssetPortfolioContent } from './AssetPortfolioContent';

import { useIsSmallerScreenWidthThan } from '@hooks/useIsSmallerScreenWidthThan';
import { BREAKPOINT_SMALL } from '@src/styles/constants';
import { USE_FOOR_TOPUP } from '@src/views/browser-view/components/TopUpWallet/config';
import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { Wallet } from '@lace/cardano';

const MINUTES_UNTIL_WARNING_BANNER = 3;

export interface AssetsPortfolioProps {
  appMode: AppMode;
  assetList: IRow[];
  /**
   * Portfolio total balance in fiat, including assets and available rewards
   */
  portfolioTotalBalance: string;
  onRowClick: (id: string) => void;
  onTableScroll: () => void;
  totalAssets: number;
  isBalanceLoading?: boolean;
  isLoadingFirstTime?: boolean;
}

export const AssetsPortfolio = ({
  appMode,
  assetList,
  portfolioTotalBalance,
  isBalanceLoading = false,
  isLoadingFirstTime = false,
  onRowClick,
  onTableScroll,
  totalAssets = 0
}: AssetsPortfolioProps): React.ReactElement => {
  const coinPrice = useFetchCoinPrice();
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();
  const {
    walletUI: { canManageBalancesVisibility, areBalancesVisible },
    currentChain
  } = useWalletStore();
  const { fiatCurrency } = useCurrencyStore();
  const redirectToReceive = useRedirection(walletRoutePaths.receive);
  const redirectToSend = useRedirection<{ params: { id: string } }>(walletRoutePaths.send);
  const isScreenTooSmallForSidePanel = useIsSmallerScreenWidthThan(BREAKPOINT_SMALL);

  const isPopupView = appMode === APP_MODE_POPUP;
  const isMainnet = currentChain?.networkMagic === Wallet.Cardano.NetworkMagics.Mainnet;

  const portfolioBalanceAsBigNumber = useMemo(() => new BigNumber(portfolioTotalBalance), [portfolioTotalBalance]);
  const isPortfolioBalanceLoading = useMemo(
    () => new BigNumber(portfolioTotalBalance).isNaN() || isBalanceLoading,
    [isBalanceLoading, portfolioTotalBalance]
  );

  const handleRedirectToReceive = () => {
    analytics.sendEventToPostHog(PostHogAction.ReceiveClick);
    redirectToReceive();
  };

  const openSend = () => {
    // eslint-disable-next-line camelcase
    analytics.sendEventToPostHog(PostHogAction.SendClick, { trigger_point: SendFlowTriggerPoints.SEND_BUTTON });
    redirectToSend({ params: { id: '1' } });
  };

  // Display banner after 3 minutes since last coin price save
  const isPriceOutdated = useMemo(
    () =>
      // If there is no timestamp, that means that we never saved a previous price, so we just check if it has an error
      coinPrice.status === 'error' && coinPrice.timestamp
        ? dayjs().diff(coinPrice.timestamp, 'minutes') >= MINUTES_UNTIL_WARNING_BANNER
        : coinPrice.status === 'error',
    [coinPrice]
  );

  return (
    <Skeleton loading={isLoadingFirstTime}>
      <SectionTitle
        title={t('browserView.assets.title')}
        sideText={`(${totalAssets})`}
        classname={styles.headerContainer}
      />
      <div className={styles.portfolio}>
        <PortfolioBalance
          loading={isPortfolioBalanceLoading}
          balance={compactNumberWithUnit(portfolioBalanceAsBigNumber.toString())}
          currencyCode={fiatCurrency.code}
          label={t('browserView.assets.totalWalletBalance')}
          isPriceOutdatedBannerVisible={isPriceOutdated}
          lastPriceFetchedDate={coinPrice.timestamp}
          showInfoTooltip
          showBalanceVisibilityToggle={!portfolioBalanceAsBigNumber.eq(0) && canManageBalancesVisibility}
          isBalanceVisible={areBalancesVisible || portfolioBalanceAsBigNumber.eq(0)}
        />
      </div>
      {isPopupView && portfolioBalanceAsBigNumber.gt(0) && (
        <TransactionCTAs
          onSendClick={openSend}
          onReceiveClick={handleRedirectToReceive}
          popupView
          buttonClassName={styles.testPopupClass}
        />
      )}
      {!isPopupView && isScreenTooSmallForSidePanel && USE_FOOR_TOPUP && isMainnet && (
        <Flex flexDirection="column" gap="$10" mb="$16" testId="top-up-wallet-small-card">
          <Text.Body.Normal weight="$medium" color="secondary" data-testid="top-up-wallet-small-card-title">
            {t('browserView.assets.topupWallet.buyButton.title')}
          </Text.Body.Normal>
          <Flex flexDirection="column" alignItems="stretch" w="$294">
            <TopUpWalletButton />
          </Flex>
          <Text.Label
            weight="$medium"
            className={styles.topupWalletDisclaimerShort}
            data-testid="top-up-wallet-small-card-disclaimer"
          >
            {t('browserView.assets.topupWallet.disclaimer.short')}
          </Text.Label>
        </Flex>
      )}
      <AssetPortfolioContent
        totalAssets={totalAssets}
        assetList={assetList}
        isPortfolioBalanceLoading={isPortfolioBalanceLoading}
        onRowClick={onRowClick}
        onTableScroll={onTableScroll}
        isPopupView={isPopupView}
      />
    </Skeleton>
  );
};
