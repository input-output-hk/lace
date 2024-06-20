import { Cardano } from '@cardano-sdk/core';
import { WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';

// TODO: consume from the wallet package (cardano-js-sdk)
const isValidSharedWalletScript = (script: Cardano.NativeScript): boolean => {
  switch (script.kind) {
    case Cardano.NativeScriptKind.RequireAllOf:
    case Cardano.NativeScriptKind.RequireAnyOf:
    case Cardano.NativeScriptKind.RequireNOf:
      return script.scripts.every((nativeScript) => nativeScript.kind === Cardano.NativeScriptKind.RequireSignature);
    default:
      return false;
  }
};

export const isSharedWallet = (wallet?: Wallet.CardanoWallet): boolean => {
  if (wallet?.source.wallet.type !== WalletType.Script) return false;

  const { paymentScript, stakingScript } = wallet?.source.wallet;

  return (
    Cardano.isNativeScript(paymentScript) &&
    isValidSharedWalletScript(paymentScript) &&
    Cardano.isNativeScript(stakingScript) &&
    isValidSharedWalletScript(stakingScript)
  );
};
