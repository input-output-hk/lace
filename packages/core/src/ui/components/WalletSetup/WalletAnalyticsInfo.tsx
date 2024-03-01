import React, { ReactElement } from 'react';
import Check from '../../assets/icons/check.svg';
import NotAllowed from '../../assets/icons/x.svg';
import styles from './WalletAnalyticsInfo.module.scss';
import { useTranslate } from '@ui/hooks';

export const WalletAnalyticsInfo = (): ReactElement => {
  const { t } = useTranslate();
  const infoTexts = [
    {
      icon: <img src={Check} alt="check" data-testid="wallet-setup-analytics-options-allow-optout-icon" />,
      text: t('core.walletAnalyticsInfo.allowOptout')
    },
    {
      icon: <img src={NotAllowed} alt="check" data-testid="wallet-setup-analytics-options-collect-private-keys-icon" />,
      text: t('core.walletAnalyticsInfo.collectPrivateKeys')
    },
    {
      icon: <img src={NotAllowed} alt="check" data-testid="wallet-setup-analytics-options-collect-ip-icon" />,
      text: t('core.walletAnalyticsInfo.collectIp')
    },
    {
      icon: <img src={NotAllowed} alt="check" data-testid="wallet-setup-analytics-options-personal-data-icon" />,
      text: t('core.walletAnalyticsInfo.personalData')
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.description}>{t('core.walletAnalyticsInfo.description')}</div>
      <div>
        <div className={styles.options}>
          {infoTexts.map((info, index) => (
            <div key={index} className={styles.flex}>
              <div>{info.icon}</div>
              <div>{info.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
