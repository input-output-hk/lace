import isEmpty from 'lodash/isEmpty';
import { Cardano, ChainHistoryProvider, StakePoolProvider, QueryStakePoolsArgs } from '@cardano-sdk/core';

export type BlockInfo = {
  slotLeader: Cardano.StakePool | Cardano.SlotLeader;
} & Omit<Cardano.ExtendedBlockInfo, 'slotLeader'>;

export const getBlockInfoByHash = async (
  blockHash: Cardano.BlockId,
  chainProviderInstance: ChainHistoryProvider,
  stakePoolSearchProviderInstance: StakePoolProvider
): Promise<BlockInfo> => {
  const blocks = await chainProviderInstance.blocksByHashes({ ids: [blockHash] });
  if (isEmpty(blocks)) return blocks[0];
  const block = blocks[0];
  const filters: QueryStakePoolsArgs = {
    filters: {
      identifier: {
        values: [{ id: Cardano.PoolId(block.slotLeader.toString()) }]
      }
    },
    pagination: { startAt: 0, limit: 1 }
  };
  const stakePool = await stakePoolSearchProviderInstance.queryStakePools(filters);
  const slotLeader = isEmpty(stakePool) ? block.slotLeader : stakePool.pageResults[0];

  return { ...block, slotLeader };
};
