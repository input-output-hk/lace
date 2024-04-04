/* eslint-disable no-magic-numbers */
import BigNumber from 'bignumber.js';
import isNil from 'lodash/isNil';
import create, { StateSelector } from 'zustand';
import { Wallet } from '@lace/cardano';
import { formatPercentages, getNumberWithUnit, getRandomIcon } from '@lace/common';
import { CardanoStakePool } from '../../../types';
import { DelegationStore, stakePoolDetailsSelectorProps } from '../types';
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
      metadata: { description, name, ticker, homepage, ext } = {},
      metrics: { ros, delegators, stake, saturation, blocksCreated } = {},
      margin,
      owners,
      logo,
      status,
      pledge
    } = selectedStakePool;
    const calcMargin = margin ? `${formatPercentages(margin.numerator / margin.denominator)}` : '';

    return {
      // TODO: a lot of this is repeated in `stakePoolTransformer`. Have only one place to parse this info
      ...(!isNil(delegators) && { delegators: new BigNumber(delegators).toFormat() }),
      description,
      hexId: hexId.toString(),
      id: id.toString(),
      logo: logo ?? getRandomIcon({ id: id.toString(), size: 30 }),
      margin: calcMargin,
      name,
      owners: owners ? owners.map((owner: Wallet.Cardano.RewardAccount) => owner.toString()) : [],
      ...(!isNil(saturation) && { saturation: formatPercentages(saturation) }),
      ...(!isNil(stake?.active) && {
        activeStake: getNumberWithUnit(Wallet.util.lovelacesToAdaString(stake.active.toString()))
      }),
      ...(!isNil(stake?.live) && {
        liveStake: getNumberWithUnit(Wallet.util.lovelacesToAdaString(stake.live.toString()))
      }),
      ticker,
      status,
      ...(!isNil(ros) && { ros: formatPercentages(ros) }),
      fee: Wallet.util.lovelacesToAdaString(cost.toString()),
      contact: {
        primary: homepage,
        ...ext?.pool.contact
      },
      ...(!isNil(blocksCreated) && { blocks: new BigNumber(blocksCreated).toFormat() }),
      pledge: Wallet.util.lovelacesToAdaString(pledge.toString())
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
