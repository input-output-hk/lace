/* eslint-disable no-console */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../Layout';
import styles from './ConfirmTransaction.module.scss';
import { useSignTxData } from './hooks';
import { consumeRemoteApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { DappDataService } from '@lib/scripts/types';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { getTitleKey, getTxType } from './utils';
import { ConfirmTransactionContent } from './ConfirmTransactionContent';
import { ConfirmTransactionFooter } from './ConfirmTransactionFooter';

export const ConfirmTransaction = (): React.ReactElement => {
  const { t } = useTranslation();
  const dappDataApi = useMemo(
    () =>
      consumeRemoteApi<Pick<DappDataService, 'getSignTxData'>>(
        {
          baseChannel: DAPP_CHANNELS.dappData,
          properties: {
            getSignTxData: RemoteApiPropertyType.MethodReturningPromise
          }
        },
        { logger: console, runtime }
      ),
    []
  );
  const { signTxData, errorMessage } = useSignTxData(dappDataApi.getSignTxData);
  const txType = signTxData ? getTxType(signTxData.tx) : undefined;
  const title = txType ? t(getTitleKey(txType)) : '';

  return (
    <Layout pageClassname={styles.spaceBetween} title={title}>
      <ConfirmTransactionContent txType={txType} signTxData={signTxData} errorMessage={errorMessage} />
      <ConfirmTransactionFooter txType={txType} signTxData={signTxData} errorMessage={errorMessage} />
    </Layout>
  );
};
