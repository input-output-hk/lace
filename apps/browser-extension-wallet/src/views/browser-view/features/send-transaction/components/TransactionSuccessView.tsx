/* eslint-disable no-lonely-if */
import { ResultMessage } from '@components/ResultMessage';
import { TransactionHashBox } from '@components/TransactionHashBox';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import {
  useBuiltTxState,
  useAnalyticsSendFlowTriggerPoint,
  useOutputs,
  TokenAnalyticsProperties
} from '@views/browser/features/send-transaction';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TransactionSuccessView.module.scss';
import { useWalletStore } from '@src/stores';
import { useObservable } from '@lace/common';
import { getTokensProperty } from '../helpers';

export const TransactionSuccessView = ({ footerSlot }: { footerSlot?: React.ReactElement }): React.ReactElement => {
  const { t } = useTranslation();
  const { builtTxData: { uiTx: { hash } = {} } = {} } = useBuiltTxState();
  const { uiOutputs } = useOutputs();
  const { triggerPoint } = useAnalyticsSendFlowTriggerPoint();
  const analytics = useAnalyticsContext();
  const {
    inMemoryWallet,
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const assets = useObservable(inMemoryWallet.assetInfo$);
  const [customAnalyticsProperties, setCustomAnalyticsProperties] = useState<TokenAnalyticsProperties[]>();

  useEffect(() => {
    // run this only when assets value was emitted and customAnalyticsProperties is undefined
    if (assets && !customAnalyticsProperties) {
      setCustomAnalyticsProperties(getTokensProperty(uiOutputs, assets, cardanoCoin));
    }
  }, [assets, cardanoCoin, customAnalyticsProperties, uiOutputs]);

  useEffect(() => {
    // send analytics event after customAnalyticsProperties was set
    if (customAnalyticsProperties) {
      analytics.sendEventToPostHog(PostHogAction.SendAllDoneView, {
        // eslint-disable-next-line camelcase
        trigger_point: triggerPoint,
        tokens: customAnalyticsProperties
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customAnalyticsProperties]);

  return (
    <>
      <div className={styles.successTxContainer} data-testid="transaction-success-container">
        <ResultMessage
          title={<div>{t('browserView.transaction.success.youCanSafelyCloseThisPanel')}</div>}
          description={<div>{t('browserView.transaction.success.thisMayTakeAFewMinutes')}</div>}
        />
        <TransactionHashBox hash={hash?.toString()} />
      </div>
      {footerSlot}
    </>
  );
};
