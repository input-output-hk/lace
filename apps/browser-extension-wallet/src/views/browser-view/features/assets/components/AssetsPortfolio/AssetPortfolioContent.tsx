import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { SearchBox } from '@lace/ui';
import { EmptySearch, FundWalletBanner } from '@views/browser/components';
import { Skeleton } from 'antd';
import { AssetTable, IRow } from '@lace/core';
import { CONTENT_LAYOUT_ID } from '@components/Layout';
import { LACE_APP_ID } from '@utils/constants';
import { IAssetDetails } from '@views/browser/features/assets/types';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@stores';
import styles from './AssetsPortfolio.module.scss';

const MIN_ASSETS_COUNT_FOR_SEARCH = 10;

const searchTokens = (data: IAssetDetails[], searchValue: string) => {
  const fields = ['name', 'policyId', 'fingerprint', 'ticker'] as const;
  const lowerSearchValue = searchValue.toLowerCase();

  return data.filter((item) =>
    fields.some((field) => field in item && item[field] && item[field].toLowerCase().includes(lowerSearchValue))
  );
};

interface AssetPortfolioContentProps {
  assetList: IRow[];
  totalAssets: number;
  isPortfolioBalanceLoading: boolean;
  onRowClick: (id: string) => void;
  onTableScroll: () => void;
  isPopupView: boolean;
}

export const AssetPortfolioContent = ({
  assetList,
  totalAssets,
  isPortfolioBalanceLoading,
  onRowClick,
  onTableScroll,
  isPopupView
}: AssetPortfolioContentProps): ReactElement => {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState<string>('');
  const [currentAssets, setCurrentAssets] = useState<{
    data: IAssetDetails[];
    total: number;
  }>({
    data: assetList,
    total: totalAssets
  });
  const { walletInfo } = useWalletStore();

  useEffect(() => {
    setCurrentAssets({
      data: searchValue ? currentAssets.data : assetList,
      total: searchValue ? currentAssets.total : totalAssets
    });
  }, [assetList, currentAssets.data, currentAssets.total, searchValue, totalAssets]);

  const handleSearch = useCallback(
    (value: string) => {
      const filteredAssets = searchTokens(assetList, value);
      setSearchValue(value);
      setCurrentAssets({ data: filteredAssets, total: filteredAssets.length });
    },
    [assetList]
  );

  return (
    <>
      {assetList?.length > MIN_ASSETS_COUNT_FOR_SEARCH && (
        <div className={styles.searchBoxContainer}>
          <SearchBox
            placeholder={t('browserView.assets.searchPlaceholder')}
            onChange={handleSearch}
            data-testid="assets-search-input"
            value={searchValue}
            onClear={() => setSearchValue('')}
          />
        </div>
      )}
      {searchValue && currentAssets.total === 0 && <EmptySearch text={t('browserView.assets.emptySearch')} />}
      {!searchValue && currentAssets.total === 0 && (
        <FundWalletBanner
          title={t('browserView.assets.welcome')}
          subtitle={t('browserView.assets.startYourWeb3Journey')}
          prompt={t('browserView.fundWalletBanner.prompt')}
          walletAddress={walletInfo.addresses[0].address.toString()}
        />
      )}
      {
        <Skeleton loading={isPortfolioBalanceLoading || !currentAssets.data}>
          {currentAssets.total > 0 && (
            <AssetTable
              rows={currentAssets.data}
              onRowClick={onRowClick}
              totalItems={currentAssets.total}
              scrollableTargetId={isPopupView ? CONTENT_LAYOUT_ID : LACE_APP_ID}
              onLoad={onTableScroll}
              popupView={isPopupView}
            />
          )}
        </Skeleton>
      }
    </>
  );
};
