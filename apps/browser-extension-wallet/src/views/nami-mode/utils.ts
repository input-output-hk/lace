import { WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
export const isNamiWallet = (wallet?: Wallet.CardanoWallet): boolean => {
  if (!wallet || wallet.source.wallet.type !== WalletType.InMemory) return false;

  return !wallet.source.wallet.encryptedSecrets.keyMaterial.toString();
};
