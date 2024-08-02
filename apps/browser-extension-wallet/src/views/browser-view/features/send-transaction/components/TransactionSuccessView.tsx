import uniq from 'lodash/uniq';
import { ResultMessage } from '@components/ResultMessage';
import { TransactionHashBox } from '@components/TransactionHashBox';
import { useAnalyticsContext } from '@providers';
import {
  PostHogAction,
  TX_CREATION_TYPE_KEY,
  TxCreationType,
  TxRecipientType
} from '@providers/AnalyticsProvider/analyticsTracker';
import {
  useBuiltTxState,
  useAnalyticsSendFlowTriggerPoint,
  useOutputs,
  TokenAnalyticsProperties,
  useMetadata
} from '@views/browser/features/send-transaction';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TransactionSuccessView.module.scss';
import { useWalletStore } from '@src/stores';
import { useObservable } from '@lace/common';
import { getTokensProperty } from '../helpers';
import { Wallet } from '@lace/cardano';
import { useGetFilteredAddressBook } from '@src/features/address-book/hooks';
import SignatureAddedImg from '@assets/icons/circle-check-gradient.svg';

export const TransactionSuccessView = ({ footerSlot }: { footerSlot?: React.ReactElement }): React.ReactElement => {
  const { t } = useTranslation();
  const { builtTxData: { uiTx: { hash, fee } = {}, collectedEnoughSharedWalletTxSignatures } = {} } = useBuiltTxState();
  const { uiOutputs } = useOutputs();
  const { triggerPoint } = useAnalyticsSendFlowTriggerPoint();
  const analytics = useAnalyticsContext();
  const {
    inMemoryWallet,
    walletUI: { cardanoCoin },
    isSharedWallet
  } = useWalletStore();
  const assets = useObservable(inMemoryWallet.assetInfo$);
  const [customAnalyticsProperties, setCustomAnalyticsProperties] = useState<TokenAnalyticsProperties[]>();
  const [metadata] = useMetadata();
  const { getMatchedAddresses } = useGetFilteredAddressBook();

  useEffect(() => {
    // run this only when assets value was emitted and customAnalyticsProperties is undefined
    if (assets && !customAnalyticsProperties) {
      setCustomAnalyticsProperties(getTokensProperty(uiOutputs, assets, cardanoCoin));
    }
  }, [assets, cardanoCoin, customAnalyticsProperties, uiOutputs]);

  const sendEventOnDone = useCallback(async () => {
    // send analytics event after customAnalyticsProperties was set
    if (customAnalyticsProperties) {
      const recipients = Object.values(uiOutputs);
      const recipientSources = await Promise.all(
        recipients.map(async (row) => {
          const addressIdentifier = row.handle || row.address;
          const bookRecords = await getMatchedAddresses({ value: addressIdentifier });
          const exactMatch = bookRecords.find((item) => item.walletAddress === addressIdentifier);
          return exactMatch ? 'address book' : 'not on address book';
        })
      );
      const recipientTypes = recipients.map((row) =>
        row.handle ? TxRecipientType.AdaHandle : TxRecipientType.RegularAddress
      );
      const recipientTypesUnique = uniq(recipientTypes);
      const recipientSourceUnique = uniq(recipientSources);
      analytics.sendEventToPostHog(PostHogAction.SendAllDoneView, {
        // eslint-disable-next-line camelcase
        trigger_point: triggerPoint,
        tokens: customAnalyticsProperties,
        // eslint-disable-next-line camelcase
        transaction_fee:
          fee &&
          Wallet.util.getFormattedAmount({
            amount: fee.toString(),
            cardanoCoin
          }),
        // eslint-disable-next-line camelcase
        metadata_defined: !!metadata,
        // eslint-disable-next-line camelcase
        recipient_type: recipientTypesUnique,
        // eslint-disable-next-line camelcase
        recipient_source: recipientSourceUnique,
        [TX_CREATION_TYPE_KEY]: TxCreationType.Internal
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customAnalyticsProperties]);

  useEffect(() => {
    sendEventOnDone();
  }, [sendEventOnDone]);

  return (
    <>
      <div className={styles.successTxContainer} data-testid="transaction-success-container">
        {isSharedWallet && !collectedEnoughSharedWalletTxSignatures ? (
          <ResultMessage
            customBgImg={SignatureAddedImg}
            title={t('sharedWallets.transaction.summary.unsubmitted.title')}
            description={t('sharedWallets.transaction.summary.unsubmitted.description')}
          />
        ) : (
          <>
            <ResultMessage
              title={<div>{t('browserView.transaction.success.youCanSafelyCloseThisPanel')}</div>}
              description={<div>{t('browserView.transaction.success.thisMayTakeAFewMinutes')}</div>}
            />
            <TransactionHashBox hash={hash?.toString()} />
          </>
        )}
      </div>
      {footerSlot}
    </>
  );
};
