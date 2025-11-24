import React from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import BG from '../../../../../../assets/images/start_staking_bg.png';
import bgPopup from '../../../../../../assets/images/start_staking_bg_popup.png';
import styles from './StakeFundsBanner.module.scss';
import { useWalletStore } from '@src/stores';

type props = {
  balance: number | string;
  popupView?: boolean;
};

export const StakeFundsBanner = ({ balance, popupView }: props): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  return (
    <div className={cn(styles.container, { [styles.popupView]: popupView })}>
      <img className={styles.bg} src={popupView ? bgPopup : BG} />
      <div className={styles.content}>
        <div className={styles.title}>{t('browserView.staking.stakingInfo.StakeFundsBanner.title')}</div>
        <div className={styles.description}>{t('browserView.staking.stakingInfo.StakeFundsBanner.description')}</div>
      </div>
      <div className={styles.content}>
        <div className={styles.balanceTitle}>{t('browserView.staking.stakingInfo.StakeFundsBanner.balanceTitle')}</div>
        <div className={styles.balance}>
          <span>{balance}</span>
          <span className={styles.currency}>{cardanoCoin.symbol}</span>
        </div>
      </div>
    </div>
  );
};
