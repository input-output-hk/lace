import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, PostHogAction } from '@lace/common';
import { Image } from 'antd';
import Success from '../../../assets/icons/success-staking.svg';
import styles from './Layout.module.scss';
import { useAnalyticsContext } from '@providers';
import { TX_CREATION_TYPE_KEY, TxCreationType } from '@providers/AnalyticsProvider/analyticsTracker';

export const DappTransactionSuccess = (): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();

  const onClose = async () => {
    await analytics?.sendEventToPostHog(PostHogAction.SendAllDoneCloseClick, {
      [TX_CREATION_TYPE_KEY]: TxCreationType.External
    });
    window.close();
  };

  useEffect(() => {
    analytics?.sendEventToPostHog(PostHogAction.SendAllDoneView, {
      [TX_CREATION_TYPE_KEY]: TxCreationType.External
    });
  }, [analytics]);

  return (
    <div data-testid="dapp-sign-tx-success" className={styles.dappErrorContainer}>
      <div className={styles.dappErrorContent}>
        <Image data-testid="dapp-sign-tx-success-image" preview={false} width={112} src={Success} />
        <div data-testid="dapp-sign-tx-success-heading" className={styles.heading}>
          {t('browserView.transaction.success.youCanSafelyCloseThisPanel')}
        </div>
        <div data-testid="dapp-sign-tx-success-description" className={styles.description}>
          {t('core.dappTransaction.signedSuccessfully')}
        </div>
      </div>
      <div className={styles.footer}>
        <Button
          autoFocus
          data-testid="dapp-sign-tx-success-close-button"
          className={styles.footerBtn}
          onClick={onClose}
        >
          {t('general.button.close')}
        </Button>
      </div>
    </div>
  );
};
