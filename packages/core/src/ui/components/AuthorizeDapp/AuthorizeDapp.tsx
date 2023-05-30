import React from 'react';
import { DappInfo, DappInfoProps } from '../DappInfo';
import styles from './AuthorizeDapp.module.scss';
import { useTranslate } from '@ui/hooks';

export interface AuthorizeDappProps {
  /** dApp information such as logo, name and url */
  dappInfo: Omit<DappInfoProps, 'className'>;
  warningBanner: React.ReactNode;
}

export const AuthorizeDapp = ({ dappInfo, warningBanner }: AuthorizeDappProps): React.ReactElement => {
  const { t } = useTranslate();
  return (
    <div className={styles.authorizeDapp}>
      <DappInfo {...dappInfo} className={styles.dappInfo} />
      {warningBanner}
      <div className={styles.title} data-testid="authorize-dapp-title">
        {t('package.core.authorizeDapp.title')}:
      </div>
      <div className={styles.permissions} data-testid="authorize-dapp-permissions">
        <ul className={styles.list}>
          <li>{t('package.core.authorizeDapp.seeNetwork')}</li>
          <li>{t('package.core.authorizeDapp.seeWalletUtxo')}</li>
          <li>{t('package.core.authorizeDapp.seeWalletBalance')}</li>
          <li>{t('package.core.authorizeDapp.seeWalletAddresses')}</li>
        </ul>
      </div>
    </div>
  );
};
