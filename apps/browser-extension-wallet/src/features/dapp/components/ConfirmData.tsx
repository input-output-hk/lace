import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Wallet } from '@lace/cardano';
import { Button, PostHogAction } from '@lace/common';
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
import { of } from 'rxjs';
import { HexBlob } from '@cardano-sdk/util';
import { Skeleton } from 'antd';
import { useRedirection } from '@hooks';
import { dAppRoutePaths } from '@routes';
import { useWalletStore } from '@stores';
import { useAnalyticsContext } from '@providers';
import { TX_CREATION_TYPE_KEY, TxCreationType } from '@providers/AnalyticsProvider/analyticsTracker';
import { senderOrigin } from '@cardano-sdk/dapp-connector';
import { signingCoordinator } from '@lib/wallet-api-ui';

const INDENT_SPACING = 2;
const DAPP_TOAST_DURATION = 50;

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
  const { getKeyAgentType } = useWalletStore();
  const { t } = useTranslation();
  const redirectToSignFailure = useRedirection(dAppRoutePaths.dappTxSignFailure);
  const redirectToSignSuccess = useRedirection(dAppRoutePaths.dappTxSignSuccess);
  const [isConfirmingTx, setIsConfirmingTx] = useState<boolean>();
  const [dappInfo, setDappInfo] = useState<Wallet.DappInfo>();
  const analytics = useAnalyticsContext();
  const isUsingHardwareWallet = useMemo(
    () => getKeyAgentType() !== Wallet.KeyManagement.KeyAgentType.InMemory,
    [getKeyAgentType]
  );

  const [formattedData, setFormattedData] = useState<{
    address: string;
    dataToSign: string;
  }>();

  const cancelTransaction = useCallback(async () => {
    await req.reject('User rejected to sign');
    setTimeout(() => window.close(), DAPP_TOAST_DURATION);
  }, [req]);

  window.addEventListener('beforeunload', cancelTransaction);

  useEffect(() => {
    const subscription = signingCoordinator.signDataRequest$.subscribe((r) => {
      setDappInfo({
        logo: r.signContext.sender.tab.favIconUrl,
        url: senderOrigin(r.signContext.sender),
        name: r.signContext.sender.tab.title
      });
      setSignDataRequest(r);
    });

    const api = exposeApi<Pick<UserPromptService, 'allowSignTx'>>(
      {
        api$: of({
          async allowSignTx(): Promise<boolean> {
            return Promise.resolve(true);
          }
        }),
        baseChannel: DAPP_CHANNELS.userPrompt,
        properties: { allowSignTx: RemoteApiPropertyType.MethodReturningPromise }
      },
      { logger: console, runtime }
    );

    return () => {
      subscription.unsubscribe();
      api.shutdown();
    };
  }, [setSignDataRequest]);

  useEffect(() => {
    const dataFromHex = fromHex(req.blob);
    // TODO: address is currently not available in sign request,
    // only the derivation path of key to sign with.
    // We can probably add it to sign request, or we can match it against wallet addresses$
    const txDataAddress = `${req.derivationPath.role}/${req.derivationPath.index}`;
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
      console.error('error', error);
      cancelTransaction();
      redirectToSignFailure();
    }

    setIsConfirmingTx(true);
  }, [setIsConfirmingTx, redirectToSignFailure, redirectToSignSuccess, cancelTransaction, req]);

  const confirmationCallback = useCallback(() => {
    analytics?.sendEventToPostHog(PostHogAction.SendTransactionDataReviewTransactionClick, {
      [TX_CREATION_TYPE_KEY]: TxCreationType.External
    });
    isUsingHardwareWallet ? signWithHardwareWallet() : setNextView();
  }, [isUsingHardwareWallet, signWithHardwareWallet, setNextView, analytics]);

  return (
    <Layout pageClassname={styles.spaceBetween} title={t(sectionTitle[DAPP_VIEWS.CONFIRM_DATA])}>
      <div className={styles.container}>
        <DappInfo {...dappInfo} className={styles.dappInfo} />
        {formattedData ? (
          <>
            <div className={styles.contentSection}>
              <p className={styles.heading}>Address:</p>
              <pre className={styles.pre}>{formattedData.address}</pre>
            </div>
            <div className={styles.contentSection}>
              <p className={styles.heading}>Data:</p>
              <pre className={styles.pre}>{formattedData.dataToSign}</pre>
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
