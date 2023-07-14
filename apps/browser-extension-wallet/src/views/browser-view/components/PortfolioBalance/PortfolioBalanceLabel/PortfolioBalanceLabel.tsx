import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'antd';
import classnames from 'classnames';
import InfoIcon from '@assets/icons/browser-view/info-icon.component.svg';
import { useWalletStore } from '@src/stores';
import { APP_MODE_POPUP } from '@src/utils/constants';
import styles from './PortfolioBalanceLabel.module.scss';
import { BalanceVisibilityToggle } from '@components/BalanceVisibilityToggle/BalanceVisibilityToggle';

export interface PortfolioBalanceLabelProps {
  label?: string;
  showBalanceVisibilityToggle?: boolean;
  showInfoTooltip?: boolean;
}

export const PortfolioBalanceLabel = ({
  label,
  showInfoTooltip = false,
  showBalanceVisibilityToggle = false
}: PortfolioBalanceLabelProps): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { appMode }
  } = useWalletStore();

  return (
    <div className={classnames(styles.titleContainer, { [styles.popupView]: appMode === APP_MODE_POPUP })}>
      <label data-testid="portfolio-balance-label">
        {label}
        {showInfoTooltip && (
          <Tooltip placement="top" title={t('browserView.assets.portfolioBalanceToolTip')}>
            <span className={styles.iconWrapper} data-testid="portfolio-balance-label-info">
              <InfoIcon className={styles.icon} />
            </span>
          </Tooltip>
        )}
        {showBalanceVisibilityToggle && <BalanceVisibilityToggle />}
      </label>
    </div>
  );
};
