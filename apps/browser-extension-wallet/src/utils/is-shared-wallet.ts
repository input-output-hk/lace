import { isValidSharedWalletScript } from '@cardano-sdk/wallet';
import { AnyWallet, ScriptWallet, WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { SignPolicy } from '@lace/core';

type SharedWalletScriptKind =
  | Wallet.Cardano.RequireAllOfScript
  | Wallet.Cardano.RequireAnyOfScript
  | Wallet.Cardano.RequireAtLeastScript;

const isRequireSignatureScriptKind = (
  script: Wallet.Cardano.NativeScript
): script is Wallet.Cardano.RequireSignatureScript => script.kind === Wallet.Cardano.NativeScriptKind.RequireSignature;

const isSharedWalletScriptKind = (script: Wallet.Cardano.NativeScript): script is SharedWalletScriptKind =>
  script.kind === Wallet.Cardano.NativeScriptKind.RequireAllOf ||
  script.kind === Wallet.Cardano.NativeScriptKind.RequireAnyOf ||
  script.kind === Wallet.Cardano.NativeScriptKind.RequireNOf;

export const isScriptWallet = (
  wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>
): wallet is ScriptWallet<Wallet.WalletMetadata> => wallet && wallet.type === WalletType.Script;

export const isSharedWallet = (wallet?: Wallet.CardanoWallet): boolean => {
  if (!wallet || !isScriptWallet(wallet.source.wallet)) return false;

  const { paymentScript, stakingScript } = wallet.source.wallet;

  return (
    Wallet.Cardano.isNativeScript(paymentScript) &&
    isValidSharedWalletScript(paymentScript) &&
    Wallet.Cardano.isNativeScript(stakingScript) &&
    isValidSharedWalletScript(stakingScript)
  );
};

export const getSharedWalletSignPolicy = (wallet: ScriptWallet<Wallet.WalletMetadata>): SignPolicy | undefined => {
  let signPolicy;
  const { stakingScript } = wallet;

  if (
    Wallet.Cardano.isNativeScript(stakingScript) &&
    isValidSharedWalletScript(stakingScript) &&
    isSharedWalletScriptKind(stakingScript)
  ) {
    // eslint-disable-next-line unicorn/no-array-callback-reference
    const signers = stakingScript.scripts.filter(isRequireSignatureScriptKind).map(({ keyHash }) => ({
      keyHash,
      name: keyHash
    }));
    let required;

    switch (stakingScript.kind) {
      case Wallet.Cardano.NativeScriptKind.RequireAllOf:
        required = signers.length;
        break;
      case Wallet.Cardano.NativeScriptKind.RequireNOf:
        required = stakingScript.required;
        break;
      default:
        required = 1;
    }

    signPolicy = {
      signers,
      required
    };
  }

  return signPolicy;
};

export const getSharedWalletOwnSharedKeys = (
  wallet: ScriptWallet<Wallet.WalletMetadata>
): Wallet.Crypto.Ed25519KeyHashHex | undefined => {
  let sharedKeys;
  const { stakingScript } = wallet;

  if (
    Wallet.Cardano.isNativeScript(stakingScript) &&
    isValidSharedWalletScript(stakingScript) &&
    isSharedWalletScriptKind(stakingScript)
  ) {
    sharedKeys = stakingScript.scripts.find(isRequireSignatureScriptKind).keyHash;
  }
  return sharedKeys;
};
