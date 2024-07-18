import { Wallet } from '@lace/cardano';

export const paymentScriptKeyPath = {
  index: 0,
  role: Wallet.KeyManagement.KeyRole.External,
};

export const stakeScriptKeyPath = {
  index: 0,
  role: Wallet.KeyManagement.KeyRole.Stake,
};

export const deriveSharedWalletExtendedPublicKeyHash = async (
  key: Wallet.Crypto.Bip32PublicKeyHex,
  derivationPath: Wallet.KeyManagement.AccountKeyDerivationPath,
): Promise<Wallet.Crypto.Ed25519KeyHashHex> => {
  const accountKey = Wallet.Crypto.Bip32PublicKey.fromHex(key);
  const paymentKey = await accountKey.derive([derivationPath.role, derivationPath.index]);
  return Wallet.Crypto.Ed25519KeyHashHex(await paymentKey.hash());
};
