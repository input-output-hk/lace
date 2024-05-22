import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDRepRetirement, DappInfo } from '@lace/core';
import { certificateInspectorFactory, depositPaidWithSymbol, disallowSignTx } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useGetOwnPubDRepKeyHash } from './hooks';
import { Skeleton } from 'antd';
import { DappError } from '../DappError';
import { useViewsFlowContext } from '@providers';
import { Box, Flex } from '@lace/ui';

const { CertificateType } = Wallet.Cardano;

interface Props {
  onError: () => void;
}

export const ConfirmDRepRetirementContainer = ({ onError }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();
  const [certificate, setCertificate] = useState<Wallet.Cardano.UnRegisterDelegateRepresentativeCertificate>();
  const { loading: loadingOwnPubDRepKeyHash, ownPubDRepKeyHash } = useGetOwnPubDRepKeyHash();

  useEffect(() => {
    if (!request) return;
    const getCertificateData = async () => {
      const txCertificate =
        await certificateInspectorFactory<Wallet.Cardano.UnRegisterDelegateRepresentativeCertificate>(
          CertificateType.UnregisterDelegateRepresentative
        )(request.transaction.toCore());
      setCertificate(txCertificate);
    };

    getCertificateData();
  }, [request]);

  const isNotOwnDRepKey = certificate?.dRepCredential.hash !== ownPubDRepKeyHash;

  useEffect(() => {
    if (ownPubDRepKeyHash && certificate && isNotOwnDRepKey) {
      disallowSignTx(request, true);
      onError();
    }
  }, [ownPubDRepKeyHash, isNotOwnDRepKey, onError, request, certificate]);

  const onCloseClick = useCallback(() => {
    window.close();
  }, []);

  if (!certificate || loadingOwnPubDRepKeyHash) {
    return <Skeleton loading />;
  }

  const depositPaidWithCardanoSymbol = depositPaidWithSymbol(certificate.deposit, cardanoCoin);

  if (isNotOwnDRepKey) {
    return (
      <DappError
        title={t('core.DRepRetirement.drepIdMismatchScreen.title')}
        description={t('core.DRepRetirement.drepIdMismatchScreen.description')}
        containerTestId="drep-id-mismatch-container"
        onCloseClick={onCloseClick}
        imageTestId="drep-id-mismatch-image"
        titleTestId="drep-id-mismatch-heading"
        descriptionTestId="drep-id-mismatch-description"
        closeButtonTestId="drep-id-mismatch-close-button"
      />
    );
  }

  return (
    <Flex h="$fill" flexDirection="column">
      <Box mb={'$24'} mt={'$24'}>
        <DappInfo {...dappInfo} />
      </Box>
      <ConfirmDRepRetirement
        metadata={{
          depositReturned: depositPaidWithCardanoSymbol,
          drepId: Wallet.util.drepIDasBech32FromHash(certificate.dRepCredential.hash)
        }}
      />
    </Flex>
  );
};
