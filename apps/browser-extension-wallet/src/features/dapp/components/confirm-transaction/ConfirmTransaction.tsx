import React, { useState } from 'react';
import { Button } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { Layout } from '../Layout';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import { sectionTitle, DAPP_VIEWS } from '../../config';
import styles from './ConfirmTransaction.module.scss';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@stores';
import { useDisallowSignTx, useSignWithHardwareWallet, useSignTxData } from './hooks';
import { consumeRemoteApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { DappDataService } from '@lib/scripts/types';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { Skeleton } from 'antd';
import { DRepRegistrationContent } from './DRepRegistrationContainer';
import { SendContent } from './SendContainer';

const dappDataApi = consumeRemoteApi<Pick<DappDataService, 'getSignTxData'>>(
  {
    baseChannel: DAPP_CHANNELS.dappData,
    properties: {
      getSignTxData: RemoteApiPropertyType.MethodReturningPromise
    }
  },
  { logger: console, runtime }
);

export const ConfirmTransaction = (): React.ReactElement => {
  const {
    utils: { setNextView }
  } = useViewsFlowContext();
  const { t } = useTranslation();
  const { getKeyAgentType } = useWalletStore();
  const { signTxData, errorMessage } = useSignTxData(dappDataApi.getSignTxData);

  const keyAgentType = getKeyAgentType();
  const isUsingHardwareWallet = keyAgentType !== Wallet.KeyManagement.KeyAgentType.InMemory;
  const disallowSignTx = useDisallowSignTx();
  const { isConfirmingTx, signWithHardwareWallet } = useSignWithHardwareWallet();
  const [isConfirmBtnDisabled, setConfirmBtnDisabled] = useState(true);
  const isDRepRegistration = false; // signTxData?.tx.body.certificates.some(
  //  ({ __typename }) => __typename === Wallet.Cardano.CertificateType.RegisterDelegateRepresentative
  // );

  return (
    <Layout pageClassname={styles.spaceBetween} title={t(sectionTitle[DAPP_VIEWS.CONFIRM_TX])}>
      {!signTxData && <Skeleton loading />}
      {signTxData &&
        (isDRepRegistration ? (
          <DRepRegistrationContent signTxData={signTxData} />
        ) : (
          <SendContent
            signTxData={signTxData}
            errorMessage={errorMessage}
            disableConfirmationBtn={setConfirmBtnDisabled}
          />
        ))}
      <div className={styles.actions}>
        <Button
          onClick={async () => {
            isUsingHardwareWallet ? signWithHardwareWallet() : setNextView();
          }}
          disabled={isConfirmBtnDisabled}
          loading={isUsingHardwareWallet && isConfirmingTx}
          data-testid="dapp-transaction-confirm"
          className={styles.actionBtn}
        >
          {isUsingHardwareWallet
            ? t('browserView.transaction.send.footer.confirmWithDevice', { hardwareWallet: keyAgentType })
            : t('dapp.confirm.btn.confirm')}
        </Button>
        <Button
          color="secondary"
          data-testid="dapp-transaction-cancel"
          onClick={() => disallowSignTx(true)}
          className={styles.actionBtn}
        >
          {t('dapp.confirm.btn.cancel')}
        </Button>
      </div>
    </Layout>
  );
};
