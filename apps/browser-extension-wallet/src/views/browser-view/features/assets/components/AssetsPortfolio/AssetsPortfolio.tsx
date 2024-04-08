import { Skeleton } from 'antd';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AssetTable, IRow, SendReceive } from '@lace/core';
import { useIsSmallerScreenWidthThan } from '@hooks/useIsSmallerScreenWidthThan';
import { BREAKPOINT_SMALL } from '@src/styles/constants';
import { CONTENT_LAYOUT_ID } from '@components/Layout/ContentLayout';
import { SectionTitle } from '@components/Layout/SectionTitle';
import { APP_MODE_POPUP, AppMode, LACE_APP_ID } from '@src/utils/constants';
import { compactNumberWithUnit } from '@src/utils/format-number';
import { FundWalletBanner, PortfolioBalance, TopUpWalletButton } from '@src/views/browser-view/components';
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
import { USE_FOOR_TOPUP } from '@src/views/browser-view/components/TopUpWallet/config';
import { Flex } from '@lace/ui';

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
    walletInfo,
    walletUI: { canManageBalancesVisibility, areBalancesVisible }
  } = useWalletStore();
  const { fiatCurrency } = useCurrencyStore();
  const redirectToReceive = useRedirection(walletRoutePaths.receive);
  const redirectToSend = useRedirection<{ params: { id: string } }>(walletRoutePaths.send);
  const isScreenTooSmallForSidePanel = useIsSmallerScreenWidthThan(BREAKPOINT_SMALL);

  const isPopupView = appMode === APP_MODE_POPUP;

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
      {isPopupView && totalAssets > 0 && (
        <SendReceive
          leftButtonOnClick={openSend}
          rightButtonOnClick={handleRedirectToReceive}
          isReversed
          popupView
          sharedClass={styles.testPopupClass}
          translations={{
            send: t('core.sendReceive.send'),
            receive: t('core.sendReceive.receive')
          }}
        />
      )}
      {!isPopupView && isScreenTooSmallForSidePanel && USE_FOOR_TOPUP && (
        <Flex w={'$214'} flexDirection={'column'} alignItems={'stretch'}>
          <TopUpWalletButton />
        </Flex>
      )}
      <Skeleton loading={isPortfolioBalanceLoading || !assetList}>
        {portfolioBalanceAsBigNumber.gt(0) ? (
          <AssetTable
            rows={assetList}
            onRowClick={onRowClick}
            totalItems={totalAssets}
            scrollableTargetId={isPopupView ? CONTENT_LAYOUT_ID : LACE_APP_ID}
            onLoad={onTableScroll}
            popupView={isPopupView}
          />
        ) : (
          <FundWalletBanner
            title={t('browserView.assets.welcome')}
            subtitle={t('browserView.assets.startYourWeb3Journey')}
            prompt={t('browserView.fundWalletBanner.prompt')}
            walletAddress={walletInfo.addresses[0].address.toString()}
          />
        )}
      </Skeleton>
    </Skeleton>
  );
};
