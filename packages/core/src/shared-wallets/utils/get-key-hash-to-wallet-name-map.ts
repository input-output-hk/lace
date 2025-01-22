import { Wallet } from '@lace/cardano';

interface KeyHashToWalletNameMapProps {
  coSigners?: { name: string; sharedWalletKey: string }[];
  derivationPath: Wallet.KeyManagement.AccountKeyDerivationPath;
}

export const getKeyHashToWalletNameMap = async ({
  coSigners = [],
  derivationPath,
}: KeyHashToWalletNameMapProps): Promise<Map<Wallet.Crypto.Ed25519KeyHashHex, string>> => {
  const result = await Promise.all(
    coSigners.map(
      async ({ name, sharedWalletKey }): Promise<[Wallet.Crypto.Ed25519KeyHashHex, string]> => [
        await Wallet.util.deriveEd25519KeyHashFromBip32PublicKey(
          Wallet.Crypto.Bip32PublicKeyHex(sharedWalletKey),
          derivationPath,
        ),
        name,
      ],
    ),
  );
  return new Map(result);
};
