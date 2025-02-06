import React, { useEffect, useState, useCallback } from 'react';
import { Wallet } from '@lace/cardano';
import { Button, logger, PostHogAction } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { Layout } from './Layout';
import { sectionTitle, DAPP_VIEWS } from '../config';
import styles from './ConfirmData.module.scss';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import { DappInfo } from '@lace/core';
import { exposeApi, RemoteApiPropertyType, WalletType } from '@cardano-sdk/web-extension';
import { runtime } from 'webextension-polyfill';
import { DAPP_CHANNELS } from '@src/utils/constants';
import type { UserPromptService } from '@lib/scripts/background/services/dappService';
import { of, take } from 'rxjs';
import { HexBlob } from '@cardano-sdk/util';
import { Skeleton } from 'antd';
import { useRedirection } from '@hooks';
import { dAppRoutePaths } from '@routes';
import { useWalletStore } from '@stores';
import { useAnalyticsContext } from '@providers';
import { TX_CREATION_TYPE_KEY, TxCreationType } from '@providers/AnalyticsProvider/analyticsTracker';
import { signingCoordinator } from '@lib/wallet-api-ui';
import { senderToDappInfo } from '@src/utils/senderToDappInfo';
import { useOnUnload } from './confirm-transaction/hooks';

const INDENT_SPACING = 2;

const fromHex = (hexBlob: HexBlob): string => Buffer.from(hexBlob, 'hex').toString();

const hasJsonStructure = (str: string): boolean => {
  if (typeof str !== 'string') return false;
  try {
    const result = JSON.parse(str);
    const type = Object.prototype.toString.call(result);
    return type === '[object Object]' || type === '[object Array]';
  } catch {
    return false;
  }
};

export const DappConfirmData = (): React.ReactElement => {
  const {
    utils: { setNextView },
    signDataRequest: { request: req, set: setSignDataRequest }
  } = useViewsFlowContext();
  const { isHardwareWallet } = useWalletStore();
  const { t } = useTranslation();
  const redirectToSignFailure = useRedirection(dAppRoutePaths.dappDataSignFailure);
  const redirectToSignSuccess = useRedirection(dAppRoutePaths.dappDataSignSuccess);
  const [isConfirmingTx, setIsConfirmingTx] = useState<boolean>();
  const [dappInfo, setDappInfo] = useState<Wallet.DappInfo>();
  const analytics = useAnalyticsContext();

  const [formattedData, setFormattedData] = useState<{
    address: string;
    dataToSign: string;
  }>();

  const cancelTransaction = useCallback(async () => {
    await req.reject('User rejected to sign');
    window.close();
  }, [req]);

  useOnUnload(cancelTransaction);

  useEffect(() => {
    const subscription = signingCoordinator.signDataRequest$.pipe(take(1)).subscribe(async (r) => {
      setDappInfo(await senderToDappInfo(r.signContext.sender));
      setSignDataRequest(r);
    });

    const api = exposeApi<Pick<UserPromptService, 'readyToSignData'>>(
      {
        api$: of({
          async readyToSignData(): Promise<boolean> {
            return Promise.resolve(true);
          }
        }),
        baseChannel: DAPP_CHANNELS.userPrompt,
        properties: { readyToSignData: RemoteApiPropertyType.MethodReturningPromise }
      },
      { logger, runtime }
    );

    return () => {
      subscription.unsubscribe();
      api.shutdown();
    };
  }, [setSignDataRequest]);

  useEffect(() => {
    if (!req) return;
    const dataFromHex = fromHex(req.signContext.payload);
    const txDataAddress = req.signContext.signWith;
    const jsonStructureOrHexString = {
      address: txDataAddress,
      dataToSign: hasJsonStructure(dataFromHex)
        ? JSON.stringify(JSON.parse(dataFromHex), undefined, INDENT_SPACING)
        : dataFromHex
    };
    setFormattedData(jsonStructureOrHexString);
  }, [req]);

  const signWithHardwareWallet = useCallback(async () => {
    setIsConfirmingTx(true);
    try {
      if (req.walletType !== WalletType.Ledger && req.walletType !== WalletType.Trezor) {
        throw new Error('Invalid state: expected hw wallet');
      }
      await req.sign();
      redirectToSignSuccess();
    } catch (error) {
      logger.error('error', error);
      cancelTransaction();
      redirectToSignFailure();
    }

    setIsConfirmingTx(true);
  }, [setIsConfirmingTx, redirectToSignFailure, redirectToSignSuccess, cancelTransaction, req]);

  const confirmationCallback = useCallback(() => {
    analytics?.sendEventToPostHog(PostHogAction.SendTransactionDataReviewTransactionClick, {
      [TX_CREATION_TYPE_KEY]: TxCreationType.External
    });
    isHardwareWallet ? signWithHardwareWallet() : setNextView();
  }, [isHardwareWallet, signWithHardwareWallet, setNextView, analytics]);

  return (
    <Layout pageClassname={styles.spaceBetween} title={t(sectionTitle[DAPP_VIEWS.CONFIRM_DATA])}>
      <div className={styles.container}>
        <DappInfo {...dappInfo} className={styles.dappInfo} />
        {formattedData ? (
          <>
            <div className={styles.contentSection}>
              <p className={styles.heading} data-testid="dapp-transaction-recipient-address-title">
                Address:
              </p>
              <pre className={styles.pre} data-testid="dapp-transaction-recipient-address">
                {formattedData.address}
              </pre>
            </div>
            <div className={styles.contentSection}>
              <p className={styles.heading} data-testid="dapp-transaction-data-title">
                Data:
              </p>
              <pre className={styles.pre} data-testid="dapp-transaction-data">
                {formattedData.dataToSign}
              </pre>
            </div>
          </>
        ) : (
          <Skeleton loading />
        )}
      </div>
      <div className={styles.actions}>
        <Button
          onClick={confirmationCallback}
          disabled={!formattedData || isConfirmingTx}
          data-testid="dapp-transaction-confirm"
          className={styles.actionBtn}
        >
          {t('dapp.confirm.btn.confirm')}
        </Button>
        <Button
          color="secondary"
          data-testid="dapp-transaction-cancel"
          onClick={cancelTransaction}
          className={styles.actionBtn}
        >
          {t('dapp.confirm.btn.cancel')}
        </Button>
      </div>
    </Layout>
  );
};
