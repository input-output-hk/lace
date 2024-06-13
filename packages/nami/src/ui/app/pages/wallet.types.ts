/* eslint-disable @typescript-eslint/no-explicit-any */
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

export interface NetworkDefault {
  lovelace: number | string;
  minAda: number;
  assets: Asset[];
  history: {
    confirmed: TxHash[];
    details: Record<
      TxHash,
      { info: TXInfo; block: TXBlock; utxos: TXUTXO[]; metadata: TXMetadata }
    >;
  };
}

export type Account = NetworkDefault &
  Record<
    NETWORK_ID,
    NetworkDefault & {
      recentSendToAddresses: string[];
      paymentAddr: string;
      rewardAddr: string;
      collateral: {
        txHash: string;
        txId: number;
        lovelace: string;
      };
    }
  > & {
    index: number;
    publicKey: string;
    paymentKeyHash: string;
    paymentKeyHashBech32: string;
    stakeKeyHash: string;
    name: string;
    avatar: string;
  };
