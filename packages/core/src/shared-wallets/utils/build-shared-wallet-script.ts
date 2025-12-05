import { Wallet } from '@lace/cardano';

export type ScriptKind =
  | { kind: Wallet.Cardano.NativeScriptKind.RequireAllOf }
  | { kind: Wallet.Cardano.NativeScriptKind.RequireAnyOf }
  | { kind: Wallet.Cardano.NativeScriptKind.RequireNOf; required: number };

type SharedWalletScriptParams = {
  derivationPath: Wallet.KeyManagement.AccountKeyDerivationPath;
  expectedSigners: Array<Wallet.Crypto.Bip32PublicKeyHex>;
  kindInfo: ScriptKind;
};

type ScriptType =
  | Wallet.Cardano.RequireAllOfScript
  | Wallet.Cardano.RequireAtLeastScript
  | Wallet.Cardano.RequireAnyOfScript;

export const buildSharedWalletScript = async ({
  expectedSigners,
  derivationPath,
  kindInfo,
}: SharedWalletScriptParams): Promise<ScriptType> => {
  const signers = [...expectedSigners].sort((key1, key2) => key1.localeCompare(key2));

  const scripts: Wallet.Cardano.NativeScript[] = [];

  for (const signer of signers) {
    scripts.push({
      __type: Wallet.Cardano.ScriptType.Native,
      keyHash: await Wallet.util.deriveEd25519KeyHashFromBip32PublicKey(signer, derivationPath),
      kind: Wallet.Cardano.NativeScriptKind.RequireSignature,
    });
  }

  return {
    __type: Wallet.Cardano.ScriptType.Native,
    scripts,
    ...kindInfo,
  };
};
