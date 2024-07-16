import React, { useEffect, useState } from 'react';
import { ConfirmVoteDelegation, DappInfo } from '@lace/core';
import { certificateInspectorFactory } from './utils';
import { Wallet } from '@lace/cardano';
import { useViewsFlowContext } from '@providers';
import { Skeleton } from 'antd';
import { Box, Flex } from '@input-output-hk/lace-ui-toolkit';

const { CertificateType } = Wallet.Cardano;

export const ConfirmVoteDelegationContainer = (): React.ReactElement => {
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();
  const [certificate, setCertificate] = useState<Wallet.Cardano.VoteDelegationCertificate>();

  useEffect(() => {
    const getCertificateData = async () => {
      const txCertificate = await certificateInspectorFactory<Wallet.Cardano.VoteDelegationCertificate>(
        CertificateType.VoteDelegation
      )(request.transaction.toCore());
      setCertificate(txCertificate);
    };

    getCertificateData();
  }, [request]);

  if (!certificate) {
    return <Skeleton loading />;
  }

  const { dRep } = certificate;

  return (
    <Flex h="$fill" flexDirection="column">
      <Box mb={'$24'} mt={'$24'}>
        <DappInfo {...dappInfo} />
      </Box>
      <ConfirmVoteDelegation
        metadata={{
          alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(dRep),
          alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(dRep),
          ...(Wallet.Cardano.isDRepCredential(dRep) && {
            drepId: Wallet.util.drepIDasBech32FromHash(dRep.hash)
          })
        }}
      />
    </Flex>
  );
};
