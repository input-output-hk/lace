import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmVoteRegistrationDelegation, DappInfo } from '@lace/core';
import { certificateInspectorFactory, depositPaidWithSymbol } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useViewsFlowContext } from '@providers';
import { Skeleton } from 'antd';
import { Box, Flex, TransactionSummary } from '@lace/ui';

const { CertificateType, RewardAddress } = Wallet.Cardano;

export const ConfirmVoteRegistrationDelegationContainer = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin },
    currentChain: { networkId }
  } = useWalletStore();
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();
  const [certificate, setCertificate] = useState<Wallet.Cardano.VoteRegistrationDelegationCertificate>();

  useEffect(() => {
    if (!request) return;
    const getCertificateData = async () => {
      const txCertificate = await certificateInspectorFactory<Wallet.Cardano.VoteRegistrationDelegationCertificate>(
        CertificateType.VoteRegistrationDelegation
      )(request.transaction.toCore());
      setCertificate(txCertificate);
    };

    getCertificateData();
  }, [request]);

  if (!certificate) {
    return <Skeleton loading />;
  }

  const { dRep, deposit, stakeCredential } = certificate;
  const depositPaidWithCardanoSymbol = depositPaidWithSymbol(deposit, cardanoCoin);

  return (
    <Flex h="$fill" flexDirection="column">
      <Box mb={'$28'} mt={'$32'}>
        <DappInfo {...dappInfo} />
      </Box>
      <TransactionSummary.Metadata label={t('core.VoteRegistrationDelegation.metadata')} text="" />
      <ConfirmVoteRegistrationDelegation
        metadata={{
          depositPaid: depositPaidWithCardanoSymbol,
          stakeKeyHash: RewardAddress.fromCredentials(networkId, stakeCredential).toAddress().toBech32(),
          alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(dRep),
          alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(dRep),
          ...(Wallet.Cardano.isDRepCredential(dRep) ? { drepId: Wallet.util.drepIDasBech32FromHash(dRep.hash) } : {})
        }}
      />
    </Flex>
  );
};
