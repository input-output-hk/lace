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

export const useCurrentWallet = (): AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata> | undefined => {
  const { walletRepository } = useWalletManager();
  const { cardanoWallet } = useWalletStore();
  const wallets = useObservable(walletRepository.wallets$);

  const activeWalletId = cardanoWallet.source.wallet.walletId;
  return wallets?.find(({ walletId }) => walletId === activeWalletId);
};

type SigningPolicyType = 'payment' | 'staking';

type Cosigner = { sharedWalletKey: Bip32PublicKeyHex; name: string };

type UseSharedWalletData = {
  sharedWalletKey: Wallet.Crypto.Bip32PublicKeyHex | undefined;
  coSigners: Cosigner[];
  name: string;
};

export const useSharedWalletData = (): UseSharedWalletData => {
  const currentWallet = useCurrentWallet();

  return {
    sharedWalletKey: currentWallet?.metadata?.multiSigExtendedPublicKey,
    coSigners: currentWallet?.metadata?.coSigners,
    name: currentWallet?.metadata?.name
  };
};

export const useSignPolicy = (type: SigningPolicyType): SignPolicy | undefined => {
  const [signPolicy, setSignPolicy] = useState<SignPolicy | undefined>();
  const currentWallet = useCurrentWallet();

  const getSignPolicy = useCallback(
    async (activeWallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>): Promise<SignPolicy | undefined> => {
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
    [type]
  );

  useEffect(() => {
    (async () => {
      setSignPolicy(await getSignPolicy(currentWallet));
    })();
  }, [currentWallet, getSignPolicy]);

  return signPolicy;
};
