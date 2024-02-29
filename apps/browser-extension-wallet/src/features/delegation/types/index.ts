import { TxBuilder } from '@cardano-sdk/tx-construction';
import { Wallet } from '@lace/cardano';
import { CardanoStakePool } from '../../../types';

export interface DelegationStore {
  selectedStakePool?: CardanoStakePool & { logo?: string };
  delegationTxBuilder?: TxBuilder;
  delegationTxFee?: string;
  setSelectedStakePool: (pool: CardanoStakePool & { logo?: string }) => void;
  setDelegationTxBuilder: (txBuilder?: TxBuilder) => void;
  setDelegationTxFee: (fee?: string) => void;
}

export interface StakePool {
  id: string;
  hexId: string;
  pledge: string;
  margin: string;
  cost: string;
  owners: string[];
  name?: string;
  description?: string;
  ticker?: string;
  logo?: string;
  retired?: boolean;
  ros?: number | string;
  size?: string;
  saturation?: number | string;
  fee?: number | string;
  isStakingPool?: boolean;
}

export type stakePoolDetailsSelectorProps = {
  delegators: number | string;
  description: string;
  hexId: string;
  id: string;
  logo?: string;
  margin: number | string;
  name: string;
  owners: string[];
  saturation: number | string;
  activeStake: { number: string; unit?: string };
  liveStake: { number: string; unit?: string };
  ticker: string;
  ros: number | string;
  status: Wallet.Cardano.StakePool['status'];
  fee: string;
  contact: Wallet.Cardano.PoolContactData;
  blocks: number | string;
  pledge: string;
};
