/* eslint-disable no-magic-numbers */
import create, { StateSelector } from 'zustand';
import { Wallet } from '@lace/cardano';
import { formatPercentages, getRandomIcon } from '@lace/common';
import { CardanoStakePool } from '../../../types';
import { DelegationStore, stakePoolDetailsSelectorProps } from '../types';
import { getNumberWithUnit } from '@src/utils/format-number';
import { TxBuilder } from '@cardano-sdk/tx-construction';

export const stakePoolDetailsSelector: StateSelector<DelegationStore, stakePoolDetailsSelectorProps> = ({
  selectedStakePool
}: // eslint-disable-next-line consistent-return
DelegationStore): stakePoolDetailsSelectorProps => {
  if (selectedStakePool) {
    const {
      id,
      cost,
      hexId,
      metadata: { description = '', name = '', ticker = '', homepage, ext } = {},
      metrics: { apy, delegators, stake, saturation },
      margin,
      owners,
      logo,
      status
    } = selectedStakePool;
    const calcMargin = margin ? `${formatPercentages(margin.numerator / margin.denominator)}` : '-';

    return {
      // TODO: a lot of this is repeated in `stakePoolTransformer`. Have only one place to parse this info
      delegators: delegators || '-',
      description,
      hexId: hexId.toString(),
      id: id.toString(),
      logo: logo ?? getRandomIcon({ id: id.toString(), size: 30 }),
      margin: calcMargin,
      name,
      owners: owners ? owners.map((owner: Wallet.Cardano.RewardAccount) => owner.toString()) : [],
      saturation: saturation && formatPercentages(saturation),
      stake: stake?.active
        ? getNumberWithUnit(Wallet.util.lovelacesToAdaString(stake?.active?.toString()))
        : { number: '-' },
      ticker,
      status,
      apy: apy && formatPercentages(apy),
      fee: Wallet.util.lovelacesToAdaString(cost.toString()),
      contact: {
        primary: homepage,
        ...ext?.pool.contact
      }
    };
  }
};

/**
 * returns a hook to access delegation store states and setters
 */
export const useDelegationStore = create<DelegationStore>((set) => ({
  delegationTxFee: '0',
  setSelectedStakePool: (pool: CardanoStakePool) => set({ selectedStakePool: pool }),
  setDelegationTxBuilder: (txBuilder?: TxBuilder) => set({ delegationTxBuilder: txBuilder }),
  setDelegationTxFee: (fee?: string) => set({ delegationTxFee: fee })
}));
