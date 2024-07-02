/* eslint-disable @typescript-eslint/no-explicit-any */
import { Network } from '../../../types';

type NETWORK_ID = string;

type Asset = Record<
  any,
  any
>; /* ReturnType< blockfrostRequest(`/addresses/${currentAccount.paymentKeyHashBech32}/`) > */
type TXInfo = Record<
  any,
  any
>; /* ReturnType< blockfrostRequest(`/txs/${txHash}`) > */
type TXBlock = Record<
  any,
  any
>; /* ReturnType< blockfrostRequest(`/blocks/${blockHashOrNumb}`) > */
type TXUTXO = Record<
  any,
  any
>; /* ReturnType< blockfrostRequest(`/txs/${txHash}/utxos`) > */
type TXMetadata = Record<
  any,
  any
>; /* ReturnType< blockfrostRequest(`/txs/${txHash}/metadata`) > */

type TxHash = string;

export type History = {
  confirmed: TxHash[];
  details: Record<
    TxHash,
    { info: TXInfo; block: TXBlock; utxos: TXUTXO[]; metadata: TXMetadata }
  >;
};
export interface NetworkDefault {
  assets: Asset[];
  history: History;
  lastUpdate: string;
  lovelace: number;
  minAda: number;
  paymentAddr: string;
  rewardAddr: string;
  collateral: Collateral;
  recentSendToAddresses: string[];
}

export type Collateral = {
  txHash: string;
  txId: number;
  lovelace: string;
};

export type Account = NetworkDefault & {
  avatar: string;
  index: number;
  mainnet: NetworkDefault;
  name: string;
  paymentKeyHash: string;
  paymentKeyHashBech32: string;
  preprod: NetworkDefault;
  preview: NetworkDefault;
  publicKey: string;
  stakeKeyHash: string;
  testnet: NetworkDefault;
};
