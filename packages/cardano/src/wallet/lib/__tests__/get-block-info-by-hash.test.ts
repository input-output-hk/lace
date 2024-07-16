/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import '@testing-library/jest-dom';
import { getBlockInfoByHash } from '../get-block-info-by-hash';
import { stakepoolSearchProviderStub, mockedStakePools } from '../../test/mocks/StakepoolSearchProviderStub';
import { act } from 'react-dom/test-utils';
import { Cardano } from '@cardano-sdk/core';

describe('Testing getBlockInfoByHash function', () => {
  const blockMock: Cardano.ExtendedBlockInfo = {
    confirmations: 17_013,
    epoch: Cardano.EpochNo(171),
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
    // eslint-disable-next-line no-magic-numbers
    date: new Date(1_638_829_263_730)
  };

  const mockWalletProvider = {
    blocksByHashes: (_hashes: string[]) => new Promise((resolve) => resolve([blockMock]))
  };

  test('should get block by hash', async () => {
    const result = getBlockInfoByHash(blockMock.header.hash, mockWalletProvider as any, stakepoolSearchProviderStub());

    await act(async () => {
      const block = await result;
      expect(block).toEqual({ ...blockMock, slotLeader: mockedStakePools[0] });
    });
  });
});
