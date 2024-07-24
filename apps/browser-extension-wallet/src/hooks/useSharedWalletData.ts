import { Wallet } from '@lace/cardano';
import {
  SignPolicy,
  getKeyHashToWalletNameMap,
  getSharedWalletSignPolicy,
  isScriptWallet,
  paymentScriptKeyPath,
  stakingScriptKeyPath
} from '@lace/core';

import { useCallback, useEffect, useState } from 'react';
import { useWalletManager } from '@hooks/useWalletManager';
import { useObservable } from '@lace/common';
import { useWalletStore } from '@stores';
import { AnyWallet } from '@cardano-sdk/web-extension';
import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';

type SigningPolicyType = 'payment' | 'staking';

type Cosigner = { sharedWalletKey: Bip32PublicKeyHex; name: string };

type UseSharedWalletData = {
  getSignPolicy: (type: SigningPolicyType) => Promise<SignPolicy | undefined>;
  sharedWalletKey: Wallet.Crypto.Bip32PublicKeyHex | undefined;
  coSigners: Cosigner[];
  name: string;
};

export const useSharedWalletData = (): UseSharedWalletData => {
  const [activeWallet, setActiveWallet] = useState<AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>>();
  const [metadata, setMetadata] = useState<Wallet.WalletMetadata>();
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

  const getSignPolicy = useCallback(
    async (type: SigningPolicyType): Promise<SignPolicy | undefined> => {
      if (!isScriptWallet(activeWallet)) return;

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
    },
    [activeWallet]
  );

  return {
    getSignPolicy,
    sharedWalletKey: metadata?.multiSigExtendedPublicKey,
    coSigners: metadata?.coSigners,
    name: metadata?.name
  };
};
