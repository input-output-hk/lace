export interface Data {
  mnemonic: string[];
  name: string;
  password: string;
}

export interface Providers {
  createWallet: (params: Data) => Promise<void>;
  generateMnemonicWords: () => string[];
}
