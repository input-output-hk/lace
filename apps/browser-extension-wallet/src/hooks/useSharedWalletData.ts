import { AnyWallet } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import {
  SignPolicy,
  CoSignersListItem,
  getKeyHashToWalletNameMap,
  getSharedWalletSignPolicy,
  isScriptWallet
} from '@lace/core';
import { useEffect, useState } from 'react';

interface Props {
  activeWallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;
  isSharedWallet?: boolean;
  script?: Wallet.Cardano.Script;
  derivationPath: Wallet.KeyManagement.AccountKeyDerivationPath;
}

export const useSharedWalletData = ({
  activeWallet,
  isSharedWallet,
  script,
  derivationPath
}: Props): { signPolicy: SignPolicy | undefined; sharedKey: Wallet.Crypto.Bip32PublicKeyHex | undefined } => {
  const [signPolicy, setSignPolicy] = useState<SignPolicy | undefined>();
  const [sharedKey, setSharedKey] = useState<Wallet.Crypto.Bip32PublicKeyHex>();

  useEffect(() => {
    (async () => {
      if (!activeWallet || !isSharedWallet || !script) return;

      if (isScriptWallet(activeWallet)) {
        const policy = getSharedWalletSignPolicy(script);
        const keyToNameMap = await getKeyHashToWalletNameMap({
          coSigners: activeWallet.metadata.coSigners,
          derivationPath
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
  }, [activeWallet, isSharedWallet, script, derivationPath]);

  return { signPolicy, sharedKey };
};
