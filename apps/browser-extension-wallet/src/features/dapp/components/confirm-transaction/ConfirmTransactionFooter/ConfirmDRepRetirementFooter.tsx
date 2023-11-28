import React, { useCallback, useState } from 'react';
import { Button } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import { useWalletStore } from '@stores';
import { useDisallowSignTx, useGetOwnPubDRepKeyHash, useOnBeforeUnload, useSignWithHardwareWallet } from '../hooks';
import { certificateInspectorFactory } from '../utils';
import { SignTxData } from '../types';
import styles from './ConfirmTransactionFooterCommon.module.scss';
import { useTranslation } from 'react-i18next';
import { ConfirmDRepRetirementIdMismatchModal } from '@src/features/dapp/components/confirm-transaction/ConfirmDRepRetirementIdMismatchModal';

type ConfirmTransactionFooterProps = {
  signTxData?: SignTxData;
  errorMessage?: string;
};

export const ConfirmDRepRetirementFooter = ({
  signTxData,
  errorMessage
}: ConfirmTransactionFooterProps): React.ReactElement => {
  const { t } = useTranslation();
  const disallowSignTx = useDisallowSignTx();
  const {
    utils: { setNextView }
  } = useViewsFlowContext();
  const { isConfirmingTx, signWithHardwareWallet } = useSignWithHardwareWallet();
  const keyAgentType = useWalletStore((store) => store.getKeyAgentType());
  const isUsingHardwareWallet = keyAgentType !== Wallet.KeyManagement.KeyAgentType.InMemory;
  const [dRepIdMismatchModalOpen, setDRepIdMismatchModalOpen] = useState(false);
  const handleSubmit = useCallback(async () => {
    isUsingHardwareWallet ? await signWithHardwareWallet() : setNextView();
  }, [isUsingHardwareWallet, setNextView, signWithHardwareWallet]);
  const {
    dRepCredential: { hash: transactionDrepKeyHash }
  } = certificateInspectorFactory<Wallet.Cardano.UnRegisterDelegateRepresentativeCertificate>(
    Wallet.Cardano.CertificateType.UnregisterDelegateRepresentative
  )(signTxData.tx);
  const { loading, ownPubDRepKeyHash } = useGetOwnPubDRepKeyHash();
  const isOwnDRepKey = transactionDrepKeyHash === ownPubDRepKeyHash;

  useOnBeforeUnload(disallowSignTx);

  return (
    <div className={styles.actions}>
      <ConfirmDRepRetirementIdMismatchModal
        open={dRepIdMismatchModalOpen}
        expectedDRepId={ownPubDRepKeyHash}
        givenDRepId={transactionDrepKeyHash}
        onConfirm={handleSubmit}
        onCancel={() => setDRepIdMismatchModalOpen(false)}
      />
      <Button
        onClick={isOwnDRepKey ? handleSubmit : () => setDRepIdMismatchModalOpen(true)}
        disabled={!!errorMessage}
        loading={loading || (isUsingHardwareWallet && isConfirmingTx)}
        data-testid="dapp-transaction-confirm"
        block
      >
        {isUsingHardwareWallet
          ? t('browserView.transaction.send.footer.confirmWithDevice', { hardwareWallet: keyAgentType })
          : t('dapp.confirm.btn.confirm')}
      </Button>
      <Button color="secondary" data-testid="dapp-transaction-cancel" onClick={() => disallowSignTx(true)} block>
        {t('dapp.confirm.btn.cancel')}
      </Button>
    </div>
  );
};
