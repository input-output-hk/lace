import { isValidSharedWalletScript } from '@cardano-sdk/wallet';
import { AnyWallet, ScriptWallet, WalletType } from '@cardano-sdk/web-extension';
import { deriveSharedWalletExtendedPublicKeyHash } from '@hooks';
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

export const getSharedWalletSignPolicy = (script: Wallet.Cardano.Script): SignPolicy | undefined => {
  let signPolicy;

  if (Wallet.Cardano.isNativeScript(script) && isValidSharedWalletScript(script) && isSharedWalletScriptKind(script)) {
    const signers = script.scripts
      // eslint-disable-next-line unicorn/no-array-callback-reference
      .filter(isRequireSignatureScriptKind)
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
      signers,
      required
    };
  }

  return signPolicy;
};

interface KeyHashToWalletNameMapProps {
  participants?: { walletName: string; sharedWalletKey: string }[];
  derivationPath: Wallet.KeyManagement.AccountKeyDerivationPath;
}

export const getKeyHashToWalletNameMap = async ({
  participants = [],
  derivationPath
}: KeyHashToWalletNameMapProps): Promise<Map<Wallet.Crypto.Ed25519KeyHashHex, string>> => {
  const result = await Promise.all(
    participants.map(
      async ({ walletName, sharedWalletKey }): Promise<[Wallet.Crypto.Ed25519KeyHashHex, string]> => [
        await deriveSharedWalletExtendedPublicKeyHash(Wallet.Crypto.Bip32PublicKeyHex(sharedWalletKey), derivationPath),
        walletName
      ]
    )
  );
  return new Map(result);
};
