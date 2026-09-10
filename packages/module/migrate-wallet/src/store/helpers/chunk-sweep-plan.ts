import { Cardano } from '@cardano-sdk/core';
import {
  estimateSignedTxSize,
  TransactionBuilder,
} from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-lib/util';

import type { SweepPlan } from './build-sweep-tx';
import type { Serialization } from '@cardano-sdk/core';
import type {
  CardanoPaymentAddress,
  RequiredProtocolParameters,
} from '@lace-contract/cardano-context';

const SWEEP_TX_TTL_SECONDS = 2 * 60 * 60;

export type SweepChunkPlan = {
  index: number;
  utxos: Cardano.Utxo[];
  rewardInfos: SweepPlan['rewardInfos'];
  /** Carries this account's reward withdrawals — per account, not per sweep. */
  isLastChunk: boolean;
  /**
   * The final chunk of the WHOLE sweep, which is what reports success. Distinct
   * from `isLastChunk` because preserve mode has one last-chunk per account:
   * treating each as the end fired `sweepSucceeded` per account, so the
   * reported fee and withdrawn rewards were only the first account's.
   */
  isFinalChunk?: boolean;
  /**
   * Preserve mode: the account-specific address this chunk pays to, overriding
   * the sweep-wide target. Absent for a consolidated sweep.
   */
  destinationAddress?: CardanoPaymentAddress;
  /** The account the override address belongs to, for the activity record. */
  destinationAccountId?: string;
  /**
   * Which source account funded this chunk and which destination account it
   * pays. Carried so the migration report can state, per transaction on-chain,
   * the mapping it claims to have executed — the privacy property is that no
   * two source accounts appear in one transaction, and that is only auditable
   * against real tx ids.
   */
  sourceAccountIndex?: number;
  destinationAccountIndex?: number;
};

type EstimateSizeFunction = (
  tx: Serialization.Transaction,
  utxos: Cardano.Utxo[],
) => number;

type ChunkSweepPlanParams = {
  utxos: Cardano.Utxo[];
  rewardInfos: SweepPlan['rewardInfos'];
  protocolParameters: RequiredProtocolParameters;
  networkMagic: Cardano.NetworkMagic;
  destinationAddress: CardanoPaymentAddress;
  buildTxFunction?: (plan: SweepPlan) => Promise<Serialization.Transaction>;
  estimateSize?: EstimateSizeFunction;
};

const buildTxDefault = async (plan: SweepPlan) => {
  const builder = new TransactionBuilder(
    plan.networkMagic,
    plan.protocolParameters,
  )
    .setChangeAddress(Cardano.PaymentAddress(plan.destinationAddress))
    .expiresIn(SWEEP_TX_TTL_SECONDS);

  for (const utxo of plan.utxos) {
    builder.addInput(utxo);
  }
  for (const info of plan.rewardInfos) {
    const withdrawable = BigNumber.valueOf(info.withdrawableAmount);
    if (withdrawable > 0n) {
      builder.addRewardsWithdrawal(
        Cardano.RewardAccount(info.rewardAccount),
        withdrawable,
      );
    }
  }
  return builder.build();
};

/**
 * Sorts UTxOs descending by coin value (SR-8a: sweep largest first to minimize
 * loss if an attacker wins mid-sweep), then partitions them into chunks that
 * each fit within `maxTxSize`. The final chunk carries the reward withdrawals.
 */
export const chunkSweepPlan = async ({
  utxos,
  rewardInfos,
  protocolParameters,
  networkMagic,
  destinationAddress,
  buildTxFunction = buildTxDefault,
  estimateSize = estimateSignedTxSize,
}: ChunkSweepPlanParams): Promise<SweepChunkPlan[]> => {
  if (utxos.length === 0) {
    throw new Error('Cannot chunk an empty UTxO set');
  }

  const sorted = [...utxos].sort((a, b) =>
    Number(b[1].value.coins - a[1].value.coins),
  );

  const basePlan: Omit<SweepPlan, 'rewardInfos' | 'utxos'> = {
    protocolParameters,
    networkMagic,
    destinationAddress,
  };

  // Attempt single-tx build with all UTxOs + rewards.
  const singleTx = await buildTxFunction({
    ...basePlan,
    utxos: sorted,
    rewardInfos,
  });
  if (estimateSize(singleTx, sorted) <= protocolParameters.maxTxSize) {
    return [{ index: 0, utxos: sorted, rewardInfos, isLastChunk: true }];
  }

  // Greedy partition: accumulate UTxOs into chunks.
  const chunks: Cardano.Utxo[][] = [];
  let currentChunk: Cardano.Utxo[] = [];

  for (const utxo of sorted) {
    const candidate = [...currentChunk, utxo];

    // Trial-build the candidate chunk (non-last: no rewards).
    try {
      const tx = await buildTxFunction({
        ...basePlan,
        utxos: candidate,
        rewardInfos: [],
      });
      if (estimateSize(tx, candidate) <= protocolParameters.maxTxSize) {
        currentChunk = candidate;
        continue;
      }
    } catch {
      // Build failure with single UTxO means it cannot be chunked further.
      if (currentChunk.length === 0) {
        throw new Error(
          'Single UTxO exceeds maxTxSize or cannot balance a chunk',
        );
      }
    }

    // Adding this UTxO would exceed the limit. Finalize current chunk.
    if (currentChunk.length === 0) {
      throw new Error(
        'Single UTxO exceeds maxTxSize or cannot balance a chunk',
      );
    }
    chunks.push(currentChunk);
    currentChunk = [utxo];
  }

  // Flush the remaining UTxOs as the final chunk.
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  // Greedy partitioning doesn't reserve space for reward withdrawals; the
  // final chunk may overflow once they're added. Peel the smallest UTxOs
  // (pop from the descending-sorted tail) into a spillover chunk until
  // the last chunk fits with rewards. Removing the smallest preserves
  // value in the rewards chunk so it stays balanceable.
  const lastChunkUtxos = chunks[chunks.length - 1];
  let lastTx = await buildTxFunction({
    ...basePlan,
    utxos: lastChunkUtxos,
    rewardInfos,
  });

  if (estimateSize(lastTx, lastChunkUtxos) > protocolParameters.maxTxSize) {
    const spillover: Cardano.Utxo[] = [];
    while (lastChunkUtxos.length > 1) {
      spillover.unshift(lastChunkUtxos.pop()!);
      lastTx = await buildTxFunction({
        ...basePlan,
        utxos: lastChunkUtxos,
        rewardInfos,
      });
      if (
        estimateSize(lastTx, lastChunkUtxos) <= protocolParameters.maxTxSize
      ) {
        break;
      }
    }
    if (estimateSize(lastTx, lastChunkUtxos) > protocolParameters.maxTxSize) {
      throw new Error('Final chunk with rewards exceeds maxTxSize');
    }

    // Spillover now holds the smallest UTxOs and may lack enough value
    // to cover fee + min-ADA. Pull the largest remaining UTxO (shift
    // from the descending-sorted head) from the rewards chunk — its
    // withdrawal value compensates for losing that UTxO, while the
    // large UTxO makes spillover balanceable and keeps SR-8a ordering
    // (higher value swept earlier).
    while (true) {
      let canBuild = false;
      try {
        const spilloverTx = await buildTxFunction({
          ...basePlan,
          utxos: spillover,
          rewardInfos: [],
        });
        canBuild =
          estimateSize(spilloverTx, spillover) <= protocolParameters.maxTxSize;
      } catch {
        // Build failure: spillover UTxOs can't cover fee + min-ADA.
      }
      if (canBuild) break;
      if (lastChunkUtxos.length <= 1) {
        throw new Error(
          'Spillover chunk cannot cover fee; not enough UTxOs to rebalance',
        );
      }
      spillover.push(lastChunkUtxos.shift()!);
      lastTx = await buildTxFunction({
        ...basePlan,
        utxos: lastChunkUtxos,
        rewardInfos,
      });
      if (estimateSize(lastTx, lastChunkUtxos) > protocolParameters.maxTxSize) {
        throw new Error('Final chunk with rewards exceeds maxTxSize');
      }
    }

    chunks.splice(chunks.length - 1, 0, spillover);
  }

  return chunks.map((chunkUtxos, chunkIndex) => ({
    index: chunkIndex,
    utxos: chunkUtxos,
    rewardInfos: chunkIndex === chunks.length - 1 ? rewardInfos : [],
    isLastChunk: chunkIndex === chunks.length - 1,
  }));
};

/**
 * Preserve-mode planning: one chunk set per source account, each paying its
 * own destination account. Partitions the flat reviewed set by the owning
 * address's accountIndex — the same attribution the signer uses — and chunks
 * every partition independently, so a single oversized account still splits
 * while small ones stay one transaction each. Reward withdrawals ride their
 * own account's final chunk. Chunk indexes are global and sequential, so the
 * progress ledger and resume path need no per-account arithmetic.
 */
export const chunkSweepPlanPerAccount = async ({
  utxos,
  rewardInfos,
  addresses,
  protocolParameters,
  networkMagic,
  destinationByAccountIndex,
  buildTxFunction,
  estimateSize,
}: Omit<ChunkSweepPlanParams, 'destinationAddress'> & {
  addresses: readonly {
    address: string;
    accountIndex: number;
    rewardAccount: string;
  }[];
  destinationByAccountIndex: Map<
    number,
    {
      address: CardanoPaymentAddress;
      accountId: string;
      accountIndex?: number;
    }
  >;
}): Promise<SweepChunkPlan[]> => {
  const accountIndexByAddress = new Map(
    addresses.map(({ address, accountIndex }) => [address, accountIndex]),
  );
  const accountIndexByRewardAccount = new Map(
    addresses.map(({ rewardAccount, accountIndex }) => [
      rewardAccount,
      accountIndex,
    ]),
  );

  const utxosByAccount = new Map<number, Cardano.Utxo[]>();
  for (const utxo of utxos) {
    const accountIndex = accountIndexByAddress.get(`${utxo[1].address}`) ?? 0;
    utxosByAccount.set(accountIndex, [
      ...(utxosByAccount.get(accountIndex) ?? []),
      utxo,
    ]);
  }
  const rewardsByAccount = new Map<number, SweepPlan['rewardInfos']>();
  for (const info of rewardInfos) {
    const accountIndex =
      accountIndexByRewardAccount.get(`${info.rewardAccount}`) ?? 0;
    rewardsByAccount.set(accountIndex, [
      ...(rewardsByAccount.get(accountIndex) ?? []),
      info,
    ]);
  }

  const sourceIndexes = [
    ...new Set([...utxosByAccount.keys(), ...rewardsByAccount.keys()]),
  ].sort((a, b) => a - b);

  // A rewards-only account is NOT migrated: it has no input to pay its own
  // fee, and carrying its withdrawal in another account's transaction would
  // put its stake witness there — linking the two accounts on-chain, which is
  // exactly what preserve mode promises never happens. Its rewards stay on
  // the retained source (the review discloses this), withdrawable there.
  const chunks: SweepChunkPlan[] = [];
  for (const sourceIndex of sourceIndexes) {
    const accountUtxos = utxosByAccount.get(sourceIndex) ?? [];
    if (accountUtxos.length === 0) continue;
    const destination = destinationByAccountIndex.get(sourceIndex);
    if (!destination) {
      throw new Error(
        `No destination account planned for source account ${sourceIndex}`,
      );
    }
    const accountChunks = await chunkSweepPlan({
      utxos: accountUtxos,
      rewardInfos: rewardsByAccount.get(sourceIndex) ?? [],
      protocolParameters,
      networkMagic,
      destinationAddress: destination.address,
      buildTxFunction,
      estimateSize,
    });
    for (const chunk of accountChunks) {
      chunks.push({
        ...chunk,
        index: chunks.length,
        destinationAddress: destination.address,
        destinationAccountId: destination.accountId,
        sourceAccountIndex: sourceIndex,
        destinationAccountIndex: destination.accountIndex,
      });
    }
  }
  return chunks.map((chunk, index) => ({
    ...chunk,
    isFinalChunk: index === chunks.length - 1,
  }));
};
