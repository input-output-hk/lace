import { AnyWallet } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import {
  SignPolicy,
  stakingScriptKeyPath,
  CoSignersListItem,
  getKeyHashToWalletNameMap,
  getSharedWalletSignPolicy,
  isScriptWallet
} from '@lace/core';
import { useEffect, useState } from 'react';

interface Props {
  activeWallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;
  isSharedWallet?: boolean;
}

export const useSharedWalletData = ({
  activeWallet,
  isSharedWallet
}: Props): { signPolicy: SignPolicy | undefined; sharedKey: Wallet.Crypto.Bip32PublicKeyHex | undefined } => {
  const [signPolicy, setSignPolicy] = useState<SignPolicy | undefined>();
  const [sharedKey, setSharedKey] = useState<Wallet.Crypto.Bip32PublicKeyHex>();

  useEffect(() => {
    (async () => {
      if (!activeWallet || !isSharedWallet) return;

      if (isScriptWallet(activeWallet)) {
        const policy = getSharedWalletSignPolicy(activeWallet.stakingScript);
        const keyToNameMap = await getKeyHashToWalletNameMap({
          coSigners: activeWallet.metadata.coSigners,
          derivationPath: stakingScriptKeyPath
        });
        setSignPolicy({
          ...policy,
          signers: policy.signers.map((signer: CoSignersListItem) => ({
            ...signer,
            name: keyToNameMap.get(signer.keyHash) || signer.keyHash
          }))
        });
        setSharedKey(activeWallet.metadata.extendedAccountPublicKey);
      }
    })();
  }, [activeWallet, isSharedWallet]);

  return { signPolicy, sharedKey };
};
