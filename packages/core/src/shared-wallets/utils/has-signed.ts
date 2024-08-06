import { Wallet } from '@lace/cardano';
import { paymentScriptKeyPath, stakingScriptKeyPath } from './derivation-path';

export const hasSigned = async (
  key: Wallet.Crypto.Bip32PublicKeyHex,
  type: 'payment' | 'staking',
  signatures: Wallet.Cardano.Signatures,
) => {
  const derivationPath = type === 'payment' ? paymentScriptKeyPath : stakingScriptKeyPath;
  const accountKey = Wallet.Crypto.Bip32PublicKey.fromHex(key);
  const xkey = await accountKey.derive([derivationPath.role, derivationPath.index]);
  const hash = xkey.toRawKey().hex();
  return signatures.has(hash);
};
