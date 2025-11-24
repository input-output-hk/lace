import * as Crypto from '@cardano-sdk/crypto';
import * as KeyManagement from '@cardano-sdk/key-management';

export const deriveEd25519KeyHashFromBip32PublicKey = async (
  key: Crypto.Bip32PublicKeyHex,
  derivationPath: KeyManagement.AccountKeyDerivationPath
): Promise<Crypto.Ed25519KeyHashHex> => {
  const accountKey = Crypto.Bip32PublicKey.fromHex(key);
  const derivedKey = await accountKey.derive([derivationPath.role, derivationPath.index]);
  const derivedKeyHash = await derivedKey.toRawKey().hash();
  return Crypto.Ed25519KeyHashHex(derivedKeyHash.hex());
};
