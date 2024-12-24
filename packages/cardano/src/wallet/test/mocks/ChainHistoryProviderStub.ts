/* eslint-disable no-magic-numbers */
import { Cardano, ChainHistoryProvider } from '@cardano-sdk/core';
import { currentEpoch, queryTransactionsResult } from './ProviderStub';

export const chainHistoryProviderStub = (): ChainHistoryProvider => ({
  transactionsByAddresses: jest.fn().mockResolvedValue({ pageResults: queryTransactionsResult }),
  transactionsByHashes: jest.fn().mockResolvedValue(queryTransactionsResult),
  blocksByHashes: jest.fn().mockResolvedValue([
    {
      epoch: Cardano.EpochNo(currentEpoch.number - 3),
      confirmations: 17_013,
      epochSlot: 403_008,
      fees: BigInt('3137154'),
      nextBlock: Cardano.BlockId('61886f1daff5d3730c159fda35e86a630ee0272f6f8f5e141f5eacf8e99fb591'),
      previousBlock: Cardano.BlockId('96fbe9b0d4930626fc87ea7f1b6360035e9b8a714e9514f1b836190e95edd59e'),
      size: Cardano.BlockSize(4719),
      slotLeader: Cardano.PoolId('pool126zlx7728y7xs08s8epg9qp393kyafy9rzr89g4qkvv4cv93zem'),
      totalOutput: BigInt('10579315393456'),
      txCount: 18,
      vrf: Cardano.VrfVkBech32('vrf_vk19j362pkr4t9y0m3qxgmrv0365vd7c4ze03ny4jh84q8agjy4ep4s99zvg8'),
      header: {
        hash: Cardano.BlockId('717ca157f1e696a612af87109ba1f30cd4bb311ded5b504c78a6face463def95'),
        blockNo: Cardano.BlockNo(3_114_964),
        slot: Cardano.Slot(43_905_408)
      },
      date: new Date(1_638_829_263_730)
    } as Cardano.ExtendedBlockInfo
  ]),
  healthCheck: jest.fn().mockResolvedValue({ ok: true })
});
