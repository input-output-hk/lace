import { Wallet } from '@lace/cardano';
import {
  SignPolicy,
  getKeyHashToWalletNameMap,
  getSharedWalletSignPolicy,
  isScriptWallet,
  paymentScriptKeyPath,
  stakingScriptKeyPath,
  CoSignersListItem,
  hasSigned
} from '@lace/core';

import { useCallback, useEffect, useState } from 'react';
import { useWalletManager } from '@hooks/useWalletManager';
import { useObservable } from '@lace/common';
import { useWalletStore } from '@stores';
import { AnyWallet } from '@cardano-sdk/web-extension';

type SigningPolicyType = 'payment' | 'staking';

type UseSharedWalletData = {
  signPolicy: SignPolicy;
  sharedWalletKey: Wallet.Crypto.Bip32PublicKeyHex | undefined;
  transactionCosigners: CoSignersListItem[];
  name: string;
};

export const useSharedWalletData = (
  type?: SigningPolicyType,
  signatures?: Wallet.Cardano.Signatures
): UseSharedWalletData => {
  const [activeWallet, setActiveWallet] = useState<AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>>();
  const [metadata, setMetadata] = useState<Wallet.WalletMetadata>();
  const [signPolicy, setSignPolicy] = useState<SignPolicy>();
  const [transactionCosigners, setTransactionCosigners] = useState<CoSignersListItem[]>([]);
  const { walletRepository } = useWalletManager();
  const { cardanoWallet } = useWalletStore();
  const wallets = useObservable(walletRepository.wallets$);

  useEffect(() => {
    (async () => {
      const activeWalletId = cardanoWallet.source.wallet.walletId;
      const currentWallet = wallets?.find(({ walletId }) => walletId === activeWalletId);
      setActiveWallet(currentWallet);
      setMetadata(currentWallet?.metadata);
    })();
  }, [cardanoWallet.source.wallet.walletId, wallets]);

  const getSignPolicy = useCallback(async (): Promise<SignPolicy | undefined> => {
    if (!isScriptWallet(activeWallet) || !type) return;

    const script = type === 'payment' ? activeWallet.paymentScript : activeWallet.stakingScript;
    const derivationPath = type === 'payment' ? paymentScriptKeyPath : stakingScriptKeyPath;

    const policy = getSharedWalletSignPolicy(script);
    const keyToNameMap = await getKeyHashToWalletNameMap({
      coSigners: activeWallet.metadata.coSigners,
      derivationPath
    });

    // eslint-disable-next-line consistent-return
    return {
      ...policy,
      signers: policy.signers.map((signer) => ({
        ...signer,
        name: keyToNameMap.get(signer.keyHash) || signer.keyHash
      }))
    };
  }, [activeWallet, type]);

  useEffect(() => {
    (async () => {
      const policy = await getSignPolicy();
      if (!policy) return;
      setSignPolicy(policy);
      if (!signatures) {
        setTransactionCosigners(metadata?.coSigners);
      } else {
        const cosignersWithSignStatus = await Promise.all(
          metadata?.coSigners.map(async (signer) => ({
            ...signer,
            signed: await hasSigned(signer.sharedWalletKey, 'payment', signatures)
          }))
        );
        setTransactionCosigners(cosignersWithSignStatus);
      }
    })();
  }, [getSignPolicy, metadata?.coSigners, signatures]);

  return {
    signPolicy,
    sharedWalletKey: metadata?.multiSigExtendedPublicKey,
    transactionCosigners,
    name: metadata?.name
  };
};
