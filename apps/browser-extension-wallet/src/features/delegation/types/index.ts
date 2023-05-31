import { Wallet } from '@lace/cardano';
import { CardanoStakePool, CardanoTxBuild } from '../../../types';

export interface DelegationStore {
  selectedStakePool?: CardanoStakePool & { logo?: string };
  delegationBuiltTx?: CardanoTxBuild;
  setSelectedStakePool: (pool: CardanoStakePool & { logo?: string }) => void;
  setDelegationBuiltTx: (tx?: CardanoTxBuild) => void;
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
  apy?: number | string;
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
  stake: { number: string; unit?: string };
  ticker: string;
  apy: number | string;
  status: Wallet.Cardano.StakePool['status'];
  fee: number | string;
  contact: Wallet.Cardano.PoolContactData;
};
