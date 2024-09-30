import type { Wallet } from '@lace/cardano';

export interface CreateWalletParams {
  name: string;
  mnemonic: string[];
  password: string;
  chainId?: Wallet.Cardano.ChainId;
}
