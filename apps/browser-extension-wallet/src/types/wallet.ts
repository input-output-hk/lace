import { Wallet } from '@lace/cardano';
import { CoinItemProps } from '@lace/core';

export type Tokens = Wallet.Cardano.TokenMap;
export type TokensDetails = Wallet.Asset.AssetInfo;
export type Balance = Wallet.Balance;
export type CoinOverview = Omit<CoinItemProps, 'handleClick'>;
export type RewardAccount = Wallet.Cardano.RewardAccount;
export type Transaction = Wallet.Cardano.HydratedTx | Wallet.Cardano.Tx;

export interface TxMinimumCoinQuantity {
  coinMissing: string;
  minimumCoin: string;
}
export interface WalletInfo {
  name: string;
  addresses: Wallet.KeyManagement.GroupedAddress[];
}
