import { AnyWallet, ScriptWallet, WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';

export const isScriptWallet = (
  wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>,
): wallet is ScriptWallet<Wallet.WalletMetadata> => wallet && wallet.type === WalletType.Script;

export const isSharedWallet = (wallet?: Wallet.CardanoWallet): boolean => {
  if (!wallet || !isScriptWallet(wallet.source.wallet)) return false;

  const { paymentScript, stakingScript } = wallet.source.wallet;

  return (
    Wallet.Cardano.isNativeScript(paymentScript) &&
    Wallet.isValidSharedWalletScript(paymentScript) &&
    Wallet.Cardano.isNativeScript(stakingScript) &&
    Wallet.isValidSharedWalletScript(stakingScript)
  );
};
