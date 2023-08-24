import { TransactionMetadataProps, TxOutputInput, TransactionType } from '@lace/core';
import { Wallet } from '@lace/cardano';

export enum TxDirections {
  Outgoing = 'Outgoing',
  Incoming = 'Incoming',
  Self = 'Self'
}

export type TxDirection = keyof typeof TxDirections;

export interface TransactionDetail {
  tx: {
    hash: string;
    includedUtcDate?: string;
    includedUtcTime?: string;
    totalOutput?: string;
    fee?: string;
    depositReclaim?: string;
    deposit?: string;
    addrInputs?: TxOutputInput[];
    addrOutputs?: TxOutputInput[];
    metadata?: TransactionMetadataProps['metadata'];
    poolName?: string;
    poolTicker?: string;
    poolId?: string;
    rewards?: string;
  };
  blocks?: {
    isPopup?: boolean;
    blockId?: string;
    epoch?: string;
    block?: string;
    slot?: string;
    confirmations?: string;
    size?: string;
    transactions?: string;
    utcDate?: string;
    utcTime?: string;
    nextBlock?: string;
    prevBlock?: string;
    createdBy?: string;
  };
  status?: Wallet.TransactionStatus;
  assetAmount?: number;
  type?: TransactionType;
}
