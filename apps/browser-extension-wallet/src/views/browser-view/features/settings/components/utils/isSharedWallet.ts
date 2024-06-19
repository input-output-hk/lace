import { Cardano } from '@cardano-sdk/core';
import { isScriptAddress } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';

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

export const useIsSharedWallet = (inMemoryWallet: Wallet.ObservableWallet): boolean => {
  const walletAddresses = useObservable(inMemoryWallet.addresses$);

  return walletAddresses?.some(
    (addr) =>
      isScriptAddress(addr) &&
      Cardano.isNativeScript(addr.scripts.payment) &&
      isValidSharedWalletScript(addr.scripts.payment) &&
      Cardano.isNativeScript(addr.scripts.stake) &&
      isValidSharedWalletScript(addr.scripts.stake)
  );
};
