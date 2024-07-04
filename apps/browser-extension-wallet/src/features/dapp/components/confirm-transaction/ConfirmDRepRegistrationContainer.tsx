import React, { useEffect, useState } from 'react';
import { ConfirmDRepRegistration, DappInfo } from '@lace/core';
import { certificateInspectorFactory, depositPaidWithSymbol } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useViewsFlowContext } from '@providers';
import { Skeleton } from 'antd';
import { Box, Flex } from '@input-output-hk/lace-ui-toolkit';

const { CertificateType } = Wallet.Cardano;

export const ConfirmDRepRegistrationContainer = (): React.ReactElement => {
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();

  const [certificate, setCertificate] = useState<Wallet.Cardano.RegisterDelegateRepresentativeCertificate>();

  useEffect(() => {
    const getCertificateData = async () => {
      const txCertificate = await certificateInspectorFactory<Wallet.Cardano.RegisterDelegateRepresentativeCertificate>(
        CertificateType.RegisterDelegateRepresentative
      )(request?.transaction.toCore());
      setCertificate(txCertificate);
    };

    getCertificateData();
  }, [request]);

  if (!certificate) {
    return <Skeleton loading />;
  }

  const depositPaidWithCardanoSymbol = depositPaidWithSymbol(certificate.deposit, cardanoCoin);
  return (
    <Flex h="$fill" flexDirection="column">
      <Box mb={'$24'} mt={'$24'}>
        <DappInfo {...dappInfo} />
      </Box>
      <ConfirmDRepRegistration
        metadata={{
          depositPaid: depositPaidWithCardanoSymbol,
          drepId: Wallet.util.drepIDasBech32FromHash(certificate.dRepCredential.hash),
          hash: certificate.anchor?.dataHash,
          url: certificate.anchor?.url
        }}
      />
    </Flex>
  );
};
