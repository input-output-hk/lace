import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmStakeVoteRegistrationDelegation, DappInfo } from '@lace/core';
import { certificateInspectorFactory, depositPaidWithSymbol } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useViewsFlowContext } from '@providers';
import { Skeleton } from 'antd';
import { Box, Flex, TransactionSummary } from '@lace/ui';

const { CertificateType, RewardAddress } = Wallet.Cardano;

export const ConfirmStakeVoteRegistrationDelegationContainer = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin },
    currentChain
  } = useWalletStore();
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();
  const [certificate, setCertificate] = useState<Wallet.Cardano.StakeVoteRegistrationDelegationCertificate>();

  useEffect(() => {
    const getCertificateData = async () => {
      const txCertificate =
        await certificateInspectorFactory<Wallet.Cardano.StakeVoteRegistrationDelegationCertificate>(
          CertificateType.StakeVoteRegistrationDelegation
        )(request.transaction.toCore());
      setCertificate(txCertificate);
    };

    getCertificateData();
  }, [request]);

  if (!certificate) {
    return <Skeleton loading />;
  }

  const dRep = certificate.dRep;
  const depositPaidWithCardanoSymbol = depositPaidWithSymbol(certificate.deposit, cardanoCoin);

  return (
    <Flex h="$fill" flexDirection="column">
      <Box mb={'$28'} mt={'$32'}>
        <DappInfo {...dappInfo} />
      </Box>
      <TransactionSummary.Metadata label={t('core.StakeVoteDelegationRegistration.metadata')} text="" />
      <ConfirmStakeVoteRegistrationDelegation
        metadata={{
          poolId: certificate.poolId,
          stakeKeyHash: RewardAddress.fromCredentials(currentChain.networkId, certificate.stakeCredential)
            .toAddress()
            .toBech32(),
          depositPaid: depositPaidWithCardanoSymbol,
          alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(dRep),
          alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(dRep),
          ...(Wallet.Cardano.isDRepCredential(dRep) ? { drepId: Wallet.util.drepIDasBech32FromHash(dRep.hash) } : {})
        }}
      />
    </Flex>
  );
};
