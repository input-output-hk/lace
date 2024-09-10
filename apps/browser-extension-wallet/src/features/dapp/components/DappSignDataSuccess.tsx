import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, PostHogAction } from '@lace/common';
import { Image } from 'antd';
import Success from '../../../assets/icons/success-staking.svg';
import styles from './Layout.module.scss';
import { useAnalyticsContext } from '@providers';

export const DappSignDataSuccess = (): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();

  const onClose = async () => {
    await analytics?.sendEventToPostHog(PostHogAction.SendAllDoneCloseClick);
    window.close();
  };

  useEffect(() => {
    analytics?.sendEventToPostHog(PostHogAction.SendAllDoneView);
  }, [analytics]);

  return (
    <div data-testid="dapp-sign-data-success" className={styles.dappErrorContainer}>
      <div className={styles.dappErrorContent}>
        <Image data-testid="dapp-sign-data-success-image" preview={false} width={112} src={Success} />
        <div data-testid="dapp-sign-data-success-heading" className={styles.heading}>
          {t('browserView.dataSign.success.youCanSafelyCloseThisPanel')}
        </div>
        <div data-testid="dapp-sign-data-success-description" className={styles.description}>
          {t('core.dappSignData.signedSuccessfully')}
        </div>
      </div>
      <div className={styles.footer}>
        <Button data-testid="dapp-sign-data-success-close-button" className={styles.footerBtn} onClick={onClose}>
          {t('general.button.close')}
        </Button>
      </div>
    </div>
  );
};
