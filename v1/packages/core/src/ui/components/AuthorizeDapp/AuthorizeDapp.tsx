import React from 'react';
import { DappInfo, DappInfoProps } from '../DappInfo';
import styles from './AuthorizeDapp.module.scss';
import { useTranslation } from 'react-i18next';

export interface AuthorizeDappProps {
  /** dApp information such as logo, name and url */
  dappInfo: Omit<DappInfoProps, 'className'>;
  warningBanner: React.ReactNode;
}

export const AuthorizeDapp = ({ dappInfo, warningBanner }: AuthorizeDappProps): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className={styles.authorizeDapp}>
      <DappInfo {...dappInfo} className={styles.dappInfo} />
      {warningBanner}
      <div className={styles.title} data-testid="authorize-dapp-title">
        {t('core.authorizeDapp.title')}:
      </div>
      <div className={styles.permissions} data-testid="authorize-dapp-permissions">
        <ul className={styles.list}>
          <li>{t('core.authorizeDapp.seeNetwork')}</li>
          <li>{t('core.authorizeDapp.seeWalletUtxo')}</li>
          <li>{t('core.authorizeDapp.seeWalletBalance')}</li>
          <li>{t('core.authorizeDapp.seeWalletAddresses')}</li>
        </ul>
      </div>
    </div>
  );
};
