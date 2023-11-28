/* eslint-disable unicorn/no-null */
import React, { useState } from 'react';
import { Wallet } from '@lace/cardano';
import { useGetOwnPubDRepKeyHash } from '../hooks';
import { certificateInspectorFactory } from '../utils';
import { SignTxData } from '../types';
import { ConfirmDRepRetirementIdMismatchModal } from '@src/features/dapp/components/confirm-transaction/ConfirmDRepRetirementIdMismatchModal';
import { ConfirmTransactionFooterCommon } from '@src/features/dapp/components/confirm-transaction/ConfirmTransactionFooter/ConfirmTransactionFooterCommon';

type ConfirmTransactionFooterProps = {
  signTxData?: SignTxData;
  errorMessage?: string;
};

export const ConfirmDRepRetirementFooter = ({
  signTxData,
  errorMessage
}: ConfirmTransactionFooterProps): React.ReactElement => {
  const [dRepIdMismatchModalAcceptCallback, setDRepIdMismatchModalAcceptCallback] = useState<() => void>(null);
  const {
    dRepCredential: { hash: transactionDrepKeyHash }
  } = certificateInspectorFactory<Wallet.Cardano.UnRegisterDelegateRepresentativeCertificate>(
    Wallet.Cardano.CertificateType.UnregisterDelegateRepresentative
  )(signTxData.tx);
  const { loading, ownPubDRepKeyHash } = useGetOwnPubDRepKeyHash();
  const isOwnDRepKey = transactionDrepKeyHash === 'ownPubDRepKeyHash';

  return (
    <>
      <ConfirmDRepRetirementIdMismatchModal
        open={!!dRepIdMismatchModalAcceptCallback}
        expectedDRepId={ownPubDRepKeyHash}
        givenDRepId={transactionDrepKeyHash}
        onConfirm={dRepIdMismatchModalAcceptCallback}
        onCancel={() => setDRepIdMismatchModalAcceptCallback(null)}
      />
      <ConfirmTransactionFooterCommon
        loading={loading}
        errorMessage={errorMessage}
        onBeforeSubmit={
          isOwnDRepKey ? undefined : (handleAccept) => setDRepIdMismatchModalAcceptCallback(() => handleAccept)
        }
      />
    </>
  );
};
