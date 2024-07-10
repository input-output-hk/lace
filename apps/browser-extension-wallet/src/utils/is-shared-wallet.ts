import { Cardano } from '@cardano-sdk/core';
import { isValidSharedWalletScript } from '@cardano-sdk/wallet';
import { WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';

export const isSharedWallet = (wallet?: Wallet.CardanoWallet): boolean => {
  if (!wallet || wallet.source.wallet.type !== WalletType.Script) return false;

  const { paymentScript, stakingScript } = wallet.source.wallet;

  return (
    Cardano.isNativeScript(paymentScript) &&
    isValidSharedWalletScript(paymentScript) &&
    Cardano.isNativeScript(stakingScript) &&
    isValidSharedWalletScript(stakingScript)
  );
};
