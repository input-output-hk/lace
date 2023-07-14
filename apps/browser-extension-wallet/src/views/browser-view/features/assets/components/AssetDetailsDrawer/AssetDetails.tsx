import React from 'react';
import { useTranslation } from 'react-i18next';
import { PortfolioBalance } from '@src/views/browser-view/components/PortfolioBalance';
import styles from './AssetDetails.module.scss';
import { AssetActivityList, AssetActivityItemProps } from '@lace/core';
import { Button } from '@lace/common';
import { StateStatus } from '@src/stores';
import { Skeleton, Typography } from 'antd';
import classnames from 'classnames';
import ExpandIcon from '../../../../../../assets/icons/expand-gradient.component.svg';

const { Text } = Typography;

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
}

export const AssetDetails = ({
  balance,
  assetSymbol,
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
  const isTxListLoading = activityListStatus === StateStatus.IDLE || activityListStatus === StateStatus.LOADING;

  const activityListTitle = popupView
    ? { title: t('browserView.assetDetails.recentTransactions') }
    : {
        title: t('browserView.assetDetails.recentTransactions'),
        onClick: onViewAllClick,
        clickLabel: t('browserView.assetDetails.viewAll')
      };

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
        <div>
          <div className={styles.listHeader}>
            <Text className={styles.listTitle} data-testid="asset-activity-list-title">
              {activityListTitle.title}
            </Text>
            {activityListTitle.clickLabel && (
              <Button
                variant="text"
                color="primary"
                className={styles.viewAll}
                onClick={activityListTitle?.onClick}
                data-testid="view-all-button"
              >
                {activityListTitle.clickLabel}
              </Button>
            )}
          </div>
          <AssetActivityList items={activityList} isDrawerView={isDrawerView} />
        </div>
      </Skeleton>
      {popupView && (
        <div className={styles.buttonContainer}>
          <Button
            className={styles.viewAllButton}
            onClick={onViewAllClick}
            data-testid="see-all-your-transactions-button"
            color="gradient"
          >
            <ExpandIcon className={styles.viewAllIcon} />
            {t('browserView.assetDetails.seeAllYourTransactions')}
          </Button>
        </div>
      )}
    </div>
  );
};
