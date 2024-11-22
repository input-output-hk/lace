import { Wallet } from '@lace/cardano';
import type {
  TransactionMetadataProps,
  TxOutputInput,
  ActivityStatus,
  RewardsInfo,
  TransactionActivityType,
  ActivityType
} from '@lace/core';

export enum TxDirections {
  Outgoing = 'Outgoing',
  Incoming = 'Incoming',
  Self = 'Self'
}

export type TxDirection = keyof typeof TxDirections;

export type TransactionPool = {
  name: string;
  ticker: string;
  id: string;
};

type TransactionActivity = {
  hash: string;
  includedUtcDate?: string;
  includedUtcTime?: string;
  totalOutput?: string;
  fee?: string;
  collateral?: string;
  depositReclaim?: string;
  deposit?: string;
  addrInputs?: TxOutputInput[];
  addrOutputs?: TxOutputInput[];
  metadata?: TransactionMetadataProps['metadata'];
  pools?: TransactionPool[];
  votingProcedures?: Wallet.Cardano.VotingProcedures;
  proposalProcedures?: Wallet.Cardano.ProposalProcedure[];
  certificates?: Wallet.Cardano.Certificate[];
};

type RewardsActivity = {
  rewards: RewardsInfo;
  includedUtcDate: string;
  includedUtcTime: string;
};

type BlocksInfo = {
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

export type TransactionActivityDetail = {
  type: Exclude<ActivityType, TransactionActivityType.rewards>;
  status: ActivityStatus;
  activity: TransactionActivity;
  blocks?: BlocksInfo;
  assetAmount?: number;
};

export type RewardsActivityDetail = {
  type: TransactionActivityType.rewards;
  status: ActivityStatus.SPENDABLE | ActivityStatus.LOCKED;
  activity: RewardsActivity;
};

export type ActivityDetail = TransactionActivityDetail | RewardsActivityDetail;
