import { Skeleton } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AssetTable, IRow, SendReceive } from '@lace/core';
import { CONTENT_LAYOUT_ID } from '@components/Layout/ContentLayout';
import { SectionTitle } from '@components/Layout/SectionTitle';
import { APP_MODE_POPUP, AppMode, LACE_APP_ID } from '@src/utils/constants';
import { compactNumberWithUnit } from '@src/utils/format-number';
import { FundWalletBanner, PortfolioBalance } from '@src/views/browser-view/components';
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
import { SearchBox } from '@lace/ui';
import { IAssetDetails } from '@views/browser/features/assets/types';

const MINUTES_UNTIL_WARNING_BANNER = 3;
const SEARCH_ASSET_LENGTH = 10;

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

const searchTokens = (data: IAssetDetails[] | IRow[], searchValue: string) => {
  const fields = ['name', 'policyId', 'fingerprint']; // Fields to search
  const lowerSearchValue = searchValue.toLowerCase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.filter((item: any) =>
    fields.some((field) => field in item && item[field] && item[field].toLowerCase().includes(lowerSearchValue))
  );
};

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
  const [searchValue, setSearchValue] = useState<string>('');
  const [currentAssets, setCurrentAssets] = useState<{
    data: IRow[];
    total: number;
  }>({
    data: assetList,
    total: totalAssets
  });

  const isPopupView = appMode === APP_MODE_POPUP;

  const portfolioBalanceAsBigNumber = useMemo(() => new BigNumber(portfolioTotalBalance), [portfolioTotalBalance]);
  const isPortfolioBalanceLoading = useMemo(
    () => new BigNumber(portfolioTotalBalance).isNaN() || isBalanceLoading,
    [isBalanceLoading, portfolioTotalBalance]
  );

  useEffect(() => {
    setCurrentAssets({
      data: assetList,
      total: totalAssets
    });
  }, [assetList, totalAssets]);

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

  const handleSearch = (value: string) => {
    const filteredAssets = searchTokens(assetList, value);
    setSearchValue(value);
    setCurrentAssets({ data: filteredAssets, total: filteredAssets.length });
  };

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
      {isPopupView && currentAssets.total > 0 && (
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
      {assetList?.length > SEARCH_ASSET_LENGTH && (
        <SearchBox
          placeholder="Search by name, policy ID or fingerprint"
          onChange={(text) => handleSearch(text)}
          data-testid="assets-search-input"
          value={searchValue}
          onClear={() => setSearchValue('')}
        />
      )}
      <Skeleton loading={isPortfolioBalanceLoading || !currentAssets.data}>
        {portfolioBalanceAsBigNumber.gt(0) ? (
          <AssetTable
            rows={currentAssets.data}
            onRowClick={onRowClick}
            totalItems={currentAssets.total}
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
