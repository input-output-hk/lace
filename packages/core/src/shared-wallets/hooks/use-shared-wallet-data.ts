import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import { AnyWallet } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';

import { useCallback, useEffect, useState } from 'react';
import { SignPolicy } from '../transaction';
import {
  getKeyHashToWalletNameMap,
  getSharedWalletSignPolicy,
  isScriptWallet,
  paymentScriptKeyPath,
  stakingScriptKeyPath,
} from '../utils';

type SigningPolicyType = 'payment' | 'staking';

type Cosigner = { name: string; sharedWalletKey: Bip32PublicKeyHex };

type UseSharedWalletData = {
  coSigners?: Cosigner[];
  name?: string;
  sharedWalletKey?: Wallet.Crypto.Bip32PublicKeyHex | undefined;
};

export const useSharedWalletData = (
  wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>,
): UseSharedWalletData => ({
  coSigners: wallet?.metadata?.coSigners,
  name: wallet?.metadata?.name,
  sharedWalletKey: wallet?.metadata?.multiSigExtendedPublicKey,
});

export const useSignPolicy = (
  wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>,
  type: SigningPolicyType,
): SignPolicy | undefined => {
  const [signPolicy, setSignPolicy] = useState<SignPolicy | undefined>();

  const getSignPolicy = useCallback(
    async (activeWallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>): Promise<SignPolicy | undefined> => {
      if (!activeWallet || !isScriptWallet(activeWallet)) return;

      const script = type === 'payment' ? activeWallet.paymentScript : activeWallet.stakingScript;
      const derivationPath = type === 'payment' ? paymentScriptKeyPath : stakingScriptKeyPath;

      const policy = getSharedWalletSignPolicy(script);
      const keyToNameMap = await getKeyHashToWalletNameMap({
        coSigners: activeWallet.metadata.coSigners,
        derivationPath,
      });

      if (!policy) return;

      // eslint-disable-next-line consistent-return
      return {
        ...policy,
        signers: policy.signers.map((signer) => ({
          ...signer,
          name: keyToNameMap.get(signer.keyHash) || signer.keyHash,
        })),
      };
    },
    [type],
  );

  useEffect(() => {
    (async () => {
      setSignPolicy(await getSignPolicy(wallet));
    })();
  }, [wallet, getSignPolicy]);

  return signPolicy;
};
