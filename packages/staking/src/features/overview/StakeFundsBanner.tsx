import cn from 'classnames';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import styles from './StakeFundsBanner.module.scss';
import BgImg from './start_staking_bg.svg';
import BgImgPopup from './start_staking_bg_popup.svg';

type props = {
  balance: number | string;
  popupView?: boolean;
};

export const StakeFundsBanner = ({ balance, popupView }: props): React.ReactElement => {
  const { walletStoreWalletUICardanoCoin } = useOutsideHandles();
  const { t } = useTranslation();
  return (
    <div className={cn(styles.container, { [styles.popupView as any]: popupView })}>
      {popupView ? <BgImgPopup className={styles.bg} /> : <BgImg className={styles.bg} />}
      <div className={styles.content}>
        <div className={styles.title}>{t('overview.noStaking.title')}</div>
        <div className={styles.description}>{t('overview.noStaking.description')}</div>
      </div>
      <div className={styles.content}>
        <div className={styles.balanceTitle}>{t('overview.noStaking.balanceTitle')}</div>
        <div className={styles.balance}>
          <span>{balance}</span>
          <span className={styles.currency}>{walletStoreWalletUICardanoCoin.symbol}</span>
        </div>
      </div>
    </div>
  );
};
