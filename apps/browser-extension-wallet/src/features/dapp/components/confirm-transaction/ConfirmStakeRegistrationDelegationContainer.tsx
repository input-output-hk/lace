import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmStakeRegistrationDelegation, DappInfo } from '@lace/core';
import { certificateInspectorFactory, depositPaidWithSymbol } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useViewsFlowContext } from '@providers';
import { Skeleton } from 'antd';
import { Box, Flex, TransactionSummary } from '@lace/ui';

const { CertificateType, RewardAddress } = Wallet.Cardano;

export const ConfirmStakeRegistrationDelegationContainer = (): React.ReactElement => {
  const {
    walletUI: { cardanoCoin },
    currentChain
  } = useWalletStore();
  const { t } = useTranslation();
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();
  const [certificate, setCertificate] = useState<Wallet.Cardano.StakeRegistrationDelegationCertificate>();

  useEffect(() => {
    const getCertificateData = async () => {
      const txCertificate = await certificateInspectorFactory<Wallet.Cardano.StakeRegistrationDelegationCertificate>(
        CertificateType.StakeRegistrationDelegation
      )(request.transaction.toCore());
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
      <Box mb={'$28'} mt={'$32'}>
        <DappInfo {...dappInfo} />
      </Box>
      <TransactionSummary.Metadata label={t('core.StakeRegistrationDelegation.metadata')} text="" />
      <ConfirmStakeRegistrationDelegation
        metadata={{
          poolId: certificate.poolId,
          stakeKeyHash: RewardAddress.fromCredentials(currentChain.networkId, certificate.stakeCredential)
            .toAddress()
            .toBech32(),
          depositPaid: depositPaidWithCardanoSymbol
        }}
      />
    </Flex>
  );
};
