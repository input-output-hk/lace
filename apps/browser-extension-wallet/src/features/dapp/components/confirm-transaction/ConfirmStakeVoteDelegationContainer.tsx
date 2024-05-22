import React, { useEffect, useState } from 'react';
import { ConfirmStakeVoteDelegation, DappInfo } from '@lace/core';
import { certificateInspectorFactory } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useViewsFlowContext } from '@providers';
import { Skeleton } from 'antd';
import { Box } from '@lace/ui';

const { CertificateType, RewardAddress } = Wallet.Cardano;

export const ConfirmStakeVoteDelegationContainer = (): React.ReactElement => {
  const { currentChain } = useWalletStore();
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();
  const [certificate, setCertificate] = useState<Wallet.Cardano.StakeVoteDelegationCertificate>();

  useEffect(() => {
    const getCertificateData = async () => {
      const txCertificate = await certificateInspectorFactory<Wallet.Cardano.StakeVoteDelegationCertificate>(
        CertificateType.StakeVoteDelegation
      )(request.transaction.toCore());
      setCertificate(txCertificate);
    };

    getCertificateData();
  }, [request]);

  if (!certificate) {
    return <Skeleton loading />;
  }

  const dRep = certificate.dRep;

  return (
    <>
      <Box mb={'$28'} mt={'$32'}>
        <DappInfo {...dappInfo} />
      </Box>
      <ConfirmStakeVoteDelegation
        metadata={{
          poolId: certificate.poolId,
          stakeKeyHash: RewardAddress.fromCredentials(currentChain.networkId, certificate.stakeCredential)
            .toAddress()
            .toBech32(),
          alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(dRep),
          alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(dRep),
          ...(Wallet.Cardano.isDRepCredential(dRep) ? { drepId: Wallet.util.drepIDasBech32FromHash(dRep.hash) } : {})
        }}
      />
    </>
  );
};
