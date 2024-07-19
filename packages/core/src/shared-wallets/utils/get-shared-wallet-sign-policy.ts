import { isValidSharedWalletScript } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import { SignPolicy } from '../transaction/types';

type SharedWalletScriptKind =
  | Wallet.Cardano.RequireAllOfScript
  | Wallet.Cardano.RequireAnyOfScript
  | Wallet.Cardano.RequireAtLeastScript;

const isRequireSignatureScriptKind = (
  script: Wallet.Cardano.NativeScript,
): script is Wallet.Cardano.RequireSignatureScript => script.kind === Wallet.Cardano.NativeScriptKind.RequireSignature;

const isSharedWalletScriptKind = (script: Wallet.Cardano.NativeScript): script is SharedWalletScriptKind =>
  script.kind === Wallet.Cardano.NativeScriptKind.RequireAllOf ||
  script.kind === Wallet.Cardano.NativeScriptKind.RequireAnyOf ||
  script.kind === Wallet.Cardano.NativeScriptKind.RequireNOf;

export const getSharedWalletSignPolicy = (script: Wallet.Cardano.Script): SignPolicy | undefined => {
  let signPolicy;

  if (Wallet.Cardano.isNativeScript(script) && isValidSharedWalletScript(script) && isSharedWalletScriptKind(script)) {
    const signers = script.scripts
      .filter((s): s is Wallet.Cardano.RequireSignatureScript => isRequireSignatureScriptKind(s))
      .map(({ keyHash }: Wallet.Cardano.RequireSignatureScript) => ({ keyHash }));
    let required;

    switch (script.kind) {
      case Wallet.Cardano.NativeScriptKind.RequireAllOf:
        required = signers.length;
        break;
      case Wallet.Cardano.NativeScriptKind.RequireNOf:
        required = script.required;
        break;
      default:
        required = 1;
    }

    signPolicy = {
      required,
      signers,
    };
  }

  return signPolicy;
};