import React from 'react';
import classnames from 'classnames';
import { Skeleton, Tooltip } from 'antd';
import styles from './PortfolioBalance.module.scss';
import InfoIcon from '../../../../assets/icons/browser-view/info-icon.component.svg';
import EyeIcon from '../../../../assets/icons/browser-view/eye-icon.component.svg';
import EyeIconInvisible from '../../../../assets/icons/browser-view/eye-icon-invisible.component.svg';
import { useTranslation } from 'react-i18next';
import { Banner } from '@lace/common';
import QuestionMarkIcon from '../../../../assets/icons/purple-question-mark.svg';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(localizedFormat);

type TextSize = 'large' | 'medium';

export interface PortfolioBalanceProps {
  currencyCode: string;
  balance: string;
  variationPercentage?: number | string;
  loading?: boolean;
  label?: string;
  areBalancesVisible?: boolean;
  canManageBalancesVisibility?: boolean;
  handleBalancesVisibility?: (isVisible: boolean) => void;
  size?: TextSize;
  popupView?: boolean;
  isDrawerView?: boolean;
  isBannerVisible?: boolean;
  lastPriceFetchedDate?: number;
  hiddenBalancesPlaceholder?: string;
}

const renderBalance = ({
  isVisible,
  balance,
  code,
  size,
  hiddenBalancesPlaceholder,
  popupView
}: {
  isVisible: boolean;
  balance: string;
  code: string;
  size: TextSize;
  popupView: boolean;
  hiddenBalancesPlaceholder: string;
}) => (
  <div className={classnames(styles.balance, { [styles.popupView]: popupView })}>
    <h1
      data-testid="portfolio-balance-value"
      className={classnames({
        [styles.balanceTextLarge]: size === 'large',
        [styles.balanceTextXLarge]: popupView && !isVisible,
        [styles.balanceTextMedium]: size === 'medium'
      })}
    >
      {isVisible ? balance : hiddenBalancesPlaceholder}
    </h1>
    {isVisible && (
      <h4
        data-testid="portfolio-balance-currency"
        className={classnames({
          [styles.codeTextLarge]: size === 'large',
          [styles.codeTextMedium]: size === 'medium'
        })}
      >
        {code}
      </h4>
    )}
  </div>
);

const renderVariation = (variation: number | string, size: TextSize, popupView: boolean) => {
  const textSize = {
    [styles.popupView]: popupView,
    [styles.variationTextLarge]: size === 'large',
    [styles.variationTextMedium]: size === 'medium'
  };

  if (typeof variation === 'number') {
    const variationStyle = classnames([
      styles.variation,
      {
        [styles.negative]: variation < 0,
        [styles.positive]: variation > 0,
        ...textSize
      }
    ]);

    return (
      <h4 className={classnames([variationStyle, textSize])} data-testid="portfolio-balance-variation">
        {variation > 0 && '+'}
        {variation}%
      </h4>
    );
  }

  return (
    <h4 className={classnames([styles.variation, textSize])} data-testid="portfolio-balance-variation">
      {variation}
    </h4>
  );
};

export const PortfolioBalance = ({
  label,
  balance,
  currencyCode,
  loading,
  variationPercentage,
  canManageBalancesVisibility,
  areBalancesVisible = true,
  handleBalancesVisibility,
  size = 'large',
  popupView = false,
  isDrawerView = false,
  isBannerVisible,
  lastPriceFetchedDate,
  hiddenBalancesPlaceholder
}: PortfolioBalanceProps): React.ReactElement => {
  const { t } = useTranslation();
  const handleOnClick = () => {
    handleBalancesVisibility(!areBalancesVisible);
  };

  // if there is no lastPriceFetchedDate, we display a default message, if there is, we show the last price saved date too
  // lastPriceFetchedDate = undefined implies that we never saved the last fetched price, so, we are dont have the ada price
  const bannerMessage = lastPriceFetchedDate
    ? t('general.warnings.priceDataExpired', { date: dayjs(lastPriceFetchedDate).format('lll') })
    : t('general.warnings.cannotFetchPrice');

  return (
    <Skeleton loading={loading}>
      <div className={classnames(styles.titleContainer, { [styles.popupView]: popupView })}>
        <label data-testid="portfolio-balance-label">
          {label}
          {!isDrawerView && (
            <Tooltip placement="top" title={t('browserView.assets.portfolioBalanceToolTip')}>
              <span className={styles.iconWrapper}>
                <InfoIcon className={styles.icon} />
              </span>
            </Tooltip>
          )}
          {canManageBalancesVisibility && (
            <span className={styles.iconWrapper} onClick={handleOnClick}>
              {areBalancesVisible ? (
                <EyeIconInvisible className={styles.icon} data-testid="closed-eye-icon" />
              ) : (
                <EyeIcon className={styles.icon} data-testid="opened-eye-icon" />
              )}
            </span>
          )}
        </label>
      </div>

      {isBannerVisible ? (
        <div className={styles.warningBanner}>
          <Banner customIcon={QuestionMarkIcon} withIcon message={bannerMessage} />
        </div>
      ) : (
        <>
          {renderBalance({
            isVisible: areBalancesVisible,
            hiddenBalancesPlaceholder,
            balance,
            code: currencyCode,
            size,
            popupView
          })}
          {variationPercentage !== undefined &&
            renderVariation(
              !Number.isNaN(Number(variationPercentage)) ? Number(variationPercentage) : variationPercentage,
              size,
              popupView
            )}
        </>
      )}
    </Skeleton>
  );
};
