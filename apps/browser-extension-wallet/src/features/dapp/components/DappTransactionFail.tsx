import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, PostHogAction, WarningBanner } from '@lace/common';
import Fail from '../../../assets/icons/exclamation-circle.svg';
import styles from './Layout.module.scss';
import { Image } from 'antd';
import { useAnalyticsContext } from '@providers';
import { TX_CREATION_TYPE_KEY, TxCreationType } from '@providers/AnalyticsProvider/analyticsTracker';
import { useWalletStore } from '@stores';
import { useCustomSubmitApi } from '@hooks';
import { DappTransactionErrorSummary } from './DappTransactionErrorSummary';

export const DappTransactionFail = (): React.ReactElement => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();
  const { environmentName } = useWalletStore();
  const onClose = async () => {
    await analytics?.sendEventToPostHog(PostHogAction.SendSomethingWentWrongCancelClick, {
      [TX_CREATION_TYPE_KEY]: TxCreationType.External
    });
    window.close();
  };
  const { getCustomSubmitApiForNetwork } = useCustomSubmitApi();

  useEffect(() => {
    analytics?.sendEventToPostHog(PostHogAction.SendSomethingWentWrongView, {
      [TX_CREATION_TYPE_KEY]: TxCreationType.External
    });
  }, [analytics]);

  return (
    <div data-testid="dapp-sign-tx-fail" className={styles.dappErrorContainer}>
      <div className={styles.dappErrorContent}>
        <Image data-testid="dapp-sign-tx-fail-image" preview={false} width={112} src={Fail} />
        <div data-testid="dapp-sign-tx-fail-heading" className={styles.heading}>
          {t('dapp.sign.failure.title')}
        </div>
        <div data-testid="dapp-sign-tx-fail-description" className={styles.description}>
          {t('dapp.sign.failure.description')}
        </div>
        {getCustomSubmitApiForNetwork(environmentName).status && (
          <WarningBanner message={t('drawer.failure.customSubmitApiWarning')} />
        )}
        <DappTransactionErrorSummary />
      </div>
      <div className={styles.footer}>
        <Button
          data-testid="dapp-sign-tx-fail-close-button"
          onClick={onClose}
          color="secondary"
          className={styles.footerBtn}
        >
          {t('general.button.cancel')}
        </Button>
      </div>
    </div>
  );
};
