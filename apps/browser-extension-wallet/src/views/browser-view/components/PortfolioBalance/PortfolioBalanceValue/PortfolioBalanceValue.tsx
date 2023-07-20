import React, { useMemo } from 'react';
import classnames, { Argument as ClassnamesArgument } from 'classnames';
import { useWalletStore } from '@src/stores';
import isNil from 'lodash/isNil';
import styles from './PortfolioBalanceValue.module.scss';
import { APP_MODE_POPUP } from '@src/utils/constants';

interface BalanceSubtitle {
  value: number | string;
  isPercentage: boolean;
}

type TextSize = 'large' | 'medium';

export interface PortfolioBalanceValueProps {
  balance: string;
  currencyCode: string;
  balanceSubtitle?: BalanceSubtitle;
  isBalanceVisible?: boolean;
  textSize?: TextSize;
}

const formatPercentage = (value: number) => (!isNil(value) ? `${value > 0 ? '+' : ''}${value}%` : '-');

export const PortfolioBalanceValue = ({
  balance,
  balanceSubtitle,
  currencyCode,
  isBalanceVisible = true,
  textSize = 'large'
}: PortfolioBalanceValueProps): React.ReactElement => {
  const {
    walletUI: { getHiddenBalancePlaceholder, appMode }
  } = useWalletStore();

  const isPopupView = appMode === APP_MODE_POPUP;

  const balanceValueStyles: ClassnamesArgument = useMemo(
    () => ({
      [styles.balanceTextLarge]: textSize === 'large',
      [styles.balanceTextXLarge]: isPopupView && !isBalanceVisible,
      [styles.balanceTextMedium]: textSize === 'medium'
    }),
    [isBalanceVisible, isPopupView, textSize]
  );

  const balanceCurrencyStyles: ClassnamesArgument = useMemo(
    () => ({
      [styles.codeTextLarge]: textSize === 'large',
      [styles.codeTextMedium]: textSize === 'medium'
    }),
    [textSize]
  );

  const subtitleStyles: ClassnamesArgument[] = useMemo(
    () => [
      {
        [styles.popupView]: isPopupView,
        [styles.subtitleTextLarge]: textSize === 'large',
        [styles.subtitleTextMedium]: textSize === 'medium'
      }
    ],
    [isPopupView, textSize]
  );

  // Cast value to number if possible
  let parsedSubtitleValue = !Number.isNaN(Number(balanceSubtitle?.value))
    ? Number(balanceSubtitle.value)
    : balanceSubtitle?.value;

  // Percentage format
  if (balanceSubtitle?.isPercentage && typeof parsedSubtitleValue === 'number') {
    subtitleStyles.push({
      [styles.negative]: parsedSubtitleValue < 0,
      [styles.positive]: parsedSubtitleValue > 0
    });

    parsedSubtitleValue = formatPercentage(parsedSubtitleValue);
  }

  return (
    <>
      <div className={classnames(styles.balance, { [styles.popupView]: isPopupView })}>
        <h1 data-testid="portfolio-balance-value" className={classnames(balanceValueStyles)}>
          {isBalanceVisible ? balance : getHiddenBalancePlaceholder()}
        </h1>
        {isBalanceVisible && (
          <h4 data-testid="portfolio-balance-currency" className={classnames(balanceCurrencyStyles)}>
            {currencyCode}
          </h4>
        )}
      </div>
      {!isNil(balanceSubtitle?.value) && (
        <h4 className={classnames(subtitleStyles)} data-testid="portfolio-balance-subtitle">
          {parsedSubtitleValue}
        </h4>
      )}
    </>
  );
};
