import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PortfolioBalance } from '@src/views/browser-view/components/PortfolioBalance';
import styles from './AssetDetails.module.scss';
import { AssetActivityList, AssetActivityItemProps } from '@lace/core';
import { Button, InlineInfoList } from '@lace/common';
import { StateStatus, useWalletStore } from '@src/stores';
import { Skeleton, Typography } from 'antd';
import classnames from 'classnames';
import { useExternalLinkOpener } from '@providers/ExternalLinkOpenerProvider';
import { config } from '@src/config';

const { Text } = Typography;
const { CEXPLORER_BASE_URL, CEXPLORER_URL_PATHS } = config();

export interface AssetDetailsProps {
  balance: string;
  balanceInFiat: string;
  assetSymbol: string;
  fiatCode: string;
  fiatPrice: string;
  fiatPriceVariation: string;
  activityList: AssetActivityItemProps[];
  activityListStatus?: StateStatus;
  onViewAllClick?: () => void;
  popupView?: boolean;
  isDrawerView?: boolean;
  policyId?: string;
  fingerprint?: string;
}

export const AssetDetails = ({
  balance,
  assetSymbol,
  policyId,
  fingerprint,
  fiatPrice,
  fiatCode,
  fiatPriceVariation,
  balanceInFiat,
  activityList,
  activityListStatus,
  onViewAllClick,
  popupView = false,
  isDrawerView = false
}: AssetDetailsProps): React.ReactElement => {
  const { t } = useTranslation();
  const { environmentName } = useWalletStore();
  const openExternalLink = useExternalLinkOpener();

  const explorerBaseUrl = useMemo(() => CEXPLORER_BASE_URL[environmentName], [environmentName]);
  const isTxListLoading = activityListStatus === StateStatus.IDLE || activityListStatus === StateStatus.LOADING;

  return (
    <div className={classnames(styles.detailsContainer, popupView && styles.popupDetails)}>
      <div data-testid="token-price">
        <PortfolioBalance
          balance={fiatPrice}
          currencyCode={fiatPrice === '-' ? '' : fiatCode}
          balanceSubtitle={{ value: fiatPriceVariation, isPercentage: fiatPriceVariation !== '-' }}
          label={t(popupView ? 'browserView.assetDetails.price' : 'browserView.assetDetails.assetPrice')}
          textSize="medium"
          showInfoTooltip={!isDrawerView}
        />
      </div>

      <div data-testid="token-balance">
        <PortfolioBalance
          balance={balance}
          currencyCode={assetSymbol}
          balanceSubtitle={{ value: balanceInFiat, isPercentage: false }}
          label={t('browserView.assetDetails.assetBalance')}
          textSize="medium"
          showInfoTooltip={!isDrawerView}
        />
      </div>

      <Skeleton loading={isTxListLoading}>
        <div className={styles.separator} />
        <div className={styles.listHeader}>
          <div className={styles.activityListWrapper}>
            <div className={styles.activityListHeader}>
              <Text className={styles.listTitle} data-testid="asset-activity-list-title">
                {t('browserView.assetDetails.recentTransactions')}
              </Text>
              <Button
                variant="text"
                color="primary"
                className={styles.viewAll}
                onClick={onViewAllClick}
                data-testid="view-all-button"
              >
                {t('browserView.assetDetails.viewAll')}
              </Button>
            </div>
            <AssetActivityList items={activityList} isDrawerView={isDrawerView} />
          </div>
        </div>
      </Skeleton>
      {fingerprint && policyId && (
        <>
          <div className={styles.separator} />
          <div className={styles.listHeader}>
            <div data-testid="token-information" className={styles.tokenInformationWrapper}>
              <Text className={styles.listTitle} data-testid="token-information-title">
                {t('browserView.assetDetails.tokenInformation')}
              </Text>
              <InlineInfoList
                items={[
                  {
                    name: t('browserView.assetDetails.fingerprint'),
                    value: fingerprint,
                    showCopyIcon: true,
                    onClick: () => openExternalLink(`${explorerBaseUrl}/${CEXPLORER_URL_PATHS.Asset}/${fingerprint}`)
                  },
                  {
                    name: t('browserView.assetDetails.policyId'),
                    value: policyId,
                    showCopyIcon: true,
                    onClick: () => openExternalLink(`${explorerBaseUrl}/${CEXPLORER_URL_PATHS.Policy}/${policyId}`)
                  }
                ]}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
