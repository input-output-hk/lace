import React, { useEffect, useState } from 'react';
import { ConfirmDRepUpdate, DappInfo } from '@lace/core';
import { certificateInspectorFactory } from './utils';
import { Wallet } from '@lace/cardano';
import { useViewsFlowContext } from '@providers';
import { Skeleton } from 'antd';
import { Box, Flex } from '@input-output-hk/lace-ui-toolkit';

const { CertificateType } = Wallet.Cardano;

export const ConfirmDRepUpdateContainer = (): React.ReactElement => {
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();
  const [certificate, setCertificate] = useState<Wallet.Cardano.UpdateDelegateRepresentativeCertificate>();

  useEffect(() => {
    const getCertificateData = async () => {
      const txCertificate = await certificateInspectorFactory<Wallet.Cardano.UpdateDelegateRepresentativeCertificate>(
        CertificateType.UpdateDelegateRepresentative
      )(request.transaction.toCore());
      setCertificate(txCertificate);
    };

    getCertificateData();
  }, [request]);

  if (!certificate) {
    return <Skeleton loading />;
  }

  return (
    <Flex h="$fill" flexDirection="column">
      <Box mb={'$24'} mt={'$24'}>
        <DappInfo {...dappInfo} />
      </Box>
      <ConfirmDRepUpdate
        metadata={{
          drepId: Wallet.util.drepIDasBech32FromHash(certificate.dRepCredential.hash),
          hash: certificate.anchor?.dataHash,
          url: certificate.anchor?.url
        }}
      />
    </Flex>
  );
};
