import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Wallet } from '@lace/cardano';
import { Button } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { Layout } from './Layout';
import { sectionTitle, DAPP_VIEWS } from '../config';
import styles from './ConfirmData.module.scss';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import { DappInfo } from '@lace/core';
import { consumeRemoteApi, exposeApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { runtime } from 'webextension-polyfill';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { UserPromptService } from '@lib/scripts/background/services/dappService';
import { of } from 'rxjs';
import { HexBlob } from '@cardano-sdk/util';
import { DappDataService } from '@lib/scripts/types';
import { Skeleton } from 'antd';
import { useRedirection } from '@hooks';
import { dAppRoutePaths } from '@routes';
import { useWalletStore } from '@stores';

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
    utils: { setNextView }
  } = useViewsFlowContext();
  const { getKeyAgentType } = useWalletStore();
  const { t } = useTranslation();
  const [redirectToSignFailure] = useRedirection(dAppRoutePaths.dappTxSignFailure);
  const [redirectToSignSuccess] = useRedirection(dAppRoutePaths.dappTxSignSuccess);
  const [isConfirmingTx, setIsConfirmingTx] = useState<boolean>();
  const [dappInfo, setDappInfo] = useState<Wallet.DappInfo>();
  const isUsingHardwareWallet = useMemo(
    () => getKeyAgentType() !== Wallet.KeyManagement.KeyAgentType.InMemory,
    [getKeyAgentType]
  );

  const [formattedData, setFormattedData] = useState<{
    address: string;
    dataToSign: string;
  }>();

  const cancelTransaction = useCallback(() => {
    exposeApi<Pick<UserPromptService, 'allowSignData'>>(
      {
        api$: of({
          async allowSignData(): Promise<boolean> {
            return Promise.reject();
          }
        }),
        baseChannel: DAPP_CHANNELS.userPrompt,
        properties: { allowSignData: RemoteApiPropertyType.MethodReturningPromise }
      },
      { logger: console, runtime }
    );
    setTimeout(() => window.close(), DAPP_TOAST_DURATION);
  }, []);

  useEffect(() => {
    const dappDataApi = consumeRemoteApi<Pick<DappDataService, 'getSignDataData'>>(
      {
        baseChannel: DAPP_CHANNELS.dappData,
        properties: {
          getSignDataData: RemoteApiPropertyType.MethodReturningPromise
        }
      },
      { logger: console, runtime }
    );

    dappDataApi
      .getSignDataData()
      .then(({ sign: backgroundData, dappInfo: backgroundDappInfo }) => {
        const dataFromHex = fromHex(backgroundData.payload);
        const txDataAddress = backgroundData.addr.toString();
        const jsonStructureOrHexString = {
          address: txDataAddress,
          dataToSign: hasJsonStructure(dataFromHex)
            ? JSON.stringify(JSON.parse(dataFromHex), undefined, INDENT_SPACING)
            : dataFromHex
        };
        setDappInfo(backgroundDappInfo);
        setFormattedData(jsonStructureOrHexString);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  const signWithHardwareWallet = useCallback(async () => {
    setIsConfirmingTx(true);
    try {
      exposeApi<Pick<UserPromptService, 'allowSignTx'>>(
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
      redirectToSignSuccess();
    } catch {
      redirectToSignFailure();
    }
  }, [setIsConfirmingTx, redirectToSignFailure, redirectToSignSuccess]);

  const confirmationCallback = useCallback(
    () => (isUsingHardwareWallet ? signWithHardwareWallet() : setNextView()),
    [isUsingHardwareWallet, signWithHardwareWallet, setNextView]
  );

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
