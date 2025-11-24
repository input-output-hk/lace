import React from 'react';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { Banner } from '@lace/common';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import QuestionMarkIcon from '../../../../assets/icons/purple-question-mark.component.svg';
import { PortfolioBalanceValue, PortfolioBalanceValueProps } from './PortfolioBalanceValue/PortfolioBalanceValue';
import { PortfolioBalanceLabel, PortfolioBalanceLabelProps } from './PortfolioBalanceLabel/PortfolioBalanceLabel';
import styles from './PortfolioBalance.module.scss';

dayjs.extend(localizedFormat);

export type PortfolioBalanceProps = {
  loading?: boolean;
  isPriceOutdatedBannerVisible?: boolean;
  lastPriceFetchedDate?: number;
} & PortfolioBalanceValueProps &
  PortfolioBalanceLabelProps;

export const PortfolioBalance = ({
  label,
  balance,
  balanceSubtitle,
  currencyCode,
  loading,
  showBalanceVisibilityToggle,
  isBalanceVisible = true,
  textSize = 'large',
  showInfoTooltip = false,
  isPriceOutdatedBannerVisible,
  lastPriceFetchedDate
}: PortfolioBalanceProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Skeleton loading={loading}>
      <PortfolioBalanceLabel
        showBalanceVisibilityToggle={showBalanceVisibilityToggle}
        showInfoTooltip={showInfoTooltip}
        label={label}
      />
      {isPriceOutdatedBannerVisible ? (
        <div className={styles.warningBanner}>
          <Banner
            customIcon={<QuestionMarkIcon />}
            withIcon
            message={
              // if there is no lastPriceFetchedDate, we display a default message, if there is, we show the last price saved date too
              // lastPriceFetchedDate = undefined implies that we never saved the last fetched price, so we don't have the ada price
              lastPriceFetchedDate
                ? t('general.warnings.priceDataExpired', { date: dayjs(lastPriceFetchedDate).format('lll') })
                : t('general.warnings.cannotFetchPrice')
            }
          />
        </div>
      ) : (
        <PortfolioBalanceValue
          isBalanceVisible={isBalanceVisible}
          balance={balance}
          currencyCode={currencyCode}
          textSize={textSize}
          balanceSubtitle={balanceSubtitle}
        />
      )}
    </Skeleton>
  );
};
