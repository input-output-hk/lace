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
