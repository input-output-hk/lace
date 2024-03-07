import { Wallet } from '@lace/cardano';
export type SignTxData = { dappInfo: Wallet.DappInfo; tx: Wallet.Cardano.Tx };
