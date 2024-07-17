import { AnyWallet } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { SignPolicy } from '@lace/core';
import { getKeyHashToWalletNameMap, getSharedWalletSignPolicy, isScriptWallet } from '@src/utils/is-shared-wallet';
import { useEffect, useState } from 'react';
import { stakingScriptKeyPath } from './useWalletManager';

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
          participants: activeWallet.metadata.participants,
          derivationPath: stakingScriptKeyPath
        });
        setSignPolicy({
          ...policy,
          signers: policy.signers.map((s) => ({ ...s, name: keyToNameMap.get(s.keyHash) || s.keyHash }))
        });
        setSharedKey(activeWallet.metadata.extendedAccountPublicKey);
      }
    })();
  }, [activeWallet, isSharedWallet, signPolicy]);

  return { signPolicy, sharedKey };
};
