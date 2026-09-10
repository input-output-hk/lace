import { describe, expect, it } from 'vitest';

import { chunkSweepPlanPerAccount } from '../../../src/store/helpers/chunk-sweep-plan';

import type { SweepPlan } from '../../../src/store/helpers/build-sweep-tx';
import type { Cardano } from '@cardano-sdk/core';
import type { CardanoPaymentAddress } from '@lace-contract/cardano-context';

const addressOf = (accountIndex: number) => `addr_src_${accountIndex}`;
const rewardOf = (accountIndex: number) => `stake_src_${accountIndex}`;

const addressRow = (accountIndex: number) => ({
  address: addressOf(accountIndex),
  accountIndex,
  rewardAccount: rewardOf(accountIndex),
});

const utxo = (accountIndex: number, coins: bigint): Cardano.Utxo =>
  [
    { txId: `tx${accountIndex}`, index: 0, address: addressOf(accountIndex) },
    { address: addressOf(accountIndex), value: { coins } },
  ] as unknown as Cardano.Utxo;

const rewardInfo = (accountIndex: number) =>
  ({
    rewardAccount: rewardOf(accountIndex),
    withdrawableAmount: 1_000_000n,
  } as unknown as SweepPlan['rewardInfos'][number]);

const destination = (index: number) => ({
  address: `addr_dst_${index}` as CardanoPaymentAddress,
  accountId: `dst-account-${index}`,
});

const params = {
  protocolParameters: { maxTxSize: 16_384 } as never,
  networkMagic: 1 as Cardano.NetworkMagic,
  // Every trial build fits, so each account stays a single chunk and the
  // partitioning itself is what the test observes.
  buildTxFunction: async () => ({ toCbor: () => '00' } as never),
  estimateSize: () => 100,
};

describe('chunkSweepPlanPerAccount', () => {
  it('plans one chunk set per source account, each paying its own destination', async () => {
    const chunks = await chunkSweepPlanPerAccount({
      ...params,
      utxos: [utxo(0, 5_000_000n), utxo(2, 3_000_000n)],
      rewardInfos: [rewardInfo(2)],
      addresses: [addressRow(0), addressRow(2)],
      destinationByAccountIndex: new Map([
        [0, destination(0)],
        [2, destination(1)],
      ]),
    });

    expect(chunks).toHaveLength(2);
    // Global sequential indexes, so the progress ledger needs no arithmetic.
    expect(chunks.map(chunk => chunk.index)).toEqual([0, 1]);
    expect(chunks[0].destinationAddress).toBe('addr_dst_0');
    expect(chunks[0].destinationAccountId).toBe('dst-account-0');
    expect(chunks[0].utxos.map(([txIn]) => txIn.txId)).toEqual(['tx0']);
    // Account 2's withdrawal rides account 2's own chunk, not another's.
    expect(chunks[0].rewardInfos).toEqual([]);
    expect(chunks[1].destinationAddress).toBe('addr_dst_1');
    expect(chunks[1].rewardInfos).toHaveLength(1);
  });

  it('refuses a rewards-only account: its rewards ride no other transaction', async () => {
    const chunks = await chunkSweepPlanPerAccount({
      ...params,
      utxos: [utxo(1, 4_000_000n)],
      // Account 3 holds rewards but no UTxO. Carrying its withdrawal in
      // account 1's transaction would put its stake witness there — linking
      // the accounts on-chain, which preserve mode promises never happens.
      // The account is simply not migrated; its rewards stay on the source.
      rewardInfos: [rewardInfo(3)],
      addresses: [addressRow(1), addressRow(3)],
      destinationByAccountIndex: new Map([
        [1, destination(0)],
        [3, destination(1)],
      ]),
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].destinationAccountId).toBe('dst-account-0');
    expect(chunks.flatMap(chunk => chunk.rewardInfos)).toEqual([]);
  });

  it('refuses to plan a source account with no destination', async () => {
    await expect(
      chunkSweepPlanPerAccount({
        ...params,
        utxos: [utxo(1, 2_000_000n)],
        rewardInfos: [],
        addresses: [addressRow(1)],
        destinationByAccountIndex: new Map([[0, destination(0)]]),
      }),
    ).rejects.toThrow('No destination account planned for source account 1');
  });
});
