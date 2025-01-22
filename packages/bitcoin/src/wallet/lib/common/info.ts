export type BitcoinWalletInfo = {
  walletName: string;
  publicKeyHex: string;
  encryptedPrivateKeyHex: string;
  encryptedMnemonicsHex: string;
  derivationPath: string;
};