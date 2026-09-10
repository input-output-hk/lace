import {
  stakeKeyRegistered,
  confirmedTxFee,
  getUtxos,
  lovelaceTotal,
} from '../cardano/queries';
import { pollUntil } from '../util/poll';

import type { Providers } from '../cardano/queries';
import type { Cardano } from '@cardano-sdk/core';

export type SweepAssertion = { label: string; didPass: boolean };

export const assertion = (label: string, didPass: boolean): SweepAssertion => ({
  label,
  didPass,
});

/**
 * Asserts a refused source is unchanged (a refusal moves nothing on-chain, so
 * its balance must equal the pre-run snapshot).
 */
export const sourceUnchanged = async (
  providers: Providers,
  address: Cardano.PaymentAddress,
  before: bigint,
): Promise<SweepAssertion> => {
  const now = lovelaceTotal(await getUtxos(providers, address));
  return assertion('source unchanged (refusal moved nothing)', now === before);
};

/** Asserts the source address is empty (polls past indexer lag). */
export const sourceEmptied = async (
  providers: Providers,
  address: Cardano.PaymentAddress,
): Promise<SweepAssertion> =>
  assertion(
    'source emptied (0 utxos)',
    await pollUntil(
      async () => (await getUtxos(providers, address)).length === 0,
    ),
  );

/**
 * Asserts the source stake key is LEFT registered (the sweep does not
 * deregister — D2 mechanics 2, so pending rewards are not forfeited). Polls past
 * indexer lag.
 */
export const sourceStillRegistered = async (
  providers: Providers,
  rewardAccount: Cardano.RewardAccount,
): Promise<SweepAssertion> =>
  assertion(
    'source stake key left registered',
    await pollUntil(
      async () => await stakeKeyRegistered(providers, rewardAccount),
    ),
  );

/**
 * Asserts the destination received the swept funds, and returns the received
 * lovelace for the conservation check. Polls until the utxo appears, since the
 * destination index can lag just after the sweep.
 */
export const destinationReceived = async (
  providers: Providers,
  address: Cardano.PaymentAddress,
  txId: string,
): Promise<{ result: SweepAssertion; received: bigint }> => {
  let received = 0n;
  const didPass = await pollUntil(async () => {
    const utxos = await getUtxos(providers, address);
    received = lovelaceTotal(
      utxos.filter(([txIn]) => String(txIn.txId) === txId),
    );
    return received > 0n;
  });
  return {
    result: assertion('destination received the sweep', didPass),
    received,
  };
};

/** A native asset and the quantity of it a check expects. */
export type AssetQuantity = { assetId: Cardano.AssetId; quantity: bigint };

/**
 * Sums each of `assetIds` across the outputs of `txId` sitting at `address`.
 * Counting only that tx's outputs keeps a prior run's residual holding out of
 * the total.
 */
const assetsHeldFromTx = async (
  providers: Providers,
  {
    address,
    txId,
    assetIds,
  }: {
    address: Cardano.PaymentAddress;
    txId: string;
    assetIds: Cardano.AssetId[];
  },
): Promise<Map<Cardano.AssetId, bigint>> => {
  const utxos = (await getUtxos(providers, address)).filter(
    ([txIn]) => String(txIn.txId) === txId,
  );
  return new Map(
    assetIds.map(assetId => [
      assetId,
      utxos.reduce(
        (total, [, out]) => total + (out.value.assets?.get(assetId) ?? 0n),
        0n,
      ),
    ]),
  );
};

/**
 * Asserts the destination received `expected` of a native asset in the sweep tx,
 * proving the sweep carried the source's tokens (not just ADA) into the change
 * output. Polls past indexer lag. Throws on a non-positive `expected`: a
 * destination that received nothing holds zero of every asset, so `expected` of
 * `0n` would pass while proving nothing.
 */
export const destinationHoldsToken = async (
  providers: Providers,
  {
    address,
    txId,
    assetId,
    expected,
  }: {
    address: Cardano.PaymentAddress;
    txId: string;
    assetId: Cardano.AssetId;
    expected: bigint;
  },
): Promise<SweepAssertion> => {
  if (expected <= 0n) {
    throw new Error(
      `staged quantity of ${assetId} is ${expected}, nothing to prove the sweep carried`,
    );
  }
  return assertion(
    `destination received the token (x${expected})`,
    await pollUntil(
      async () =>
        (
          await assetsHeldFromTx(providers, {
            address,
            txId,
            assetIds: [assetId],
          })
        ).get(assetId) === expected,
    ),
  );
};

/**
 * Asserts the destination received exactly the listed quantity of every asset in
 * the sweep tx, one assertion per asset so a failure names the asset that did not
 * arrive. Polls past indexer lag until every asset matches. Throws on an empty
 * `expected` or a non-positive quantity, either of which would emit a green run
 * that checked nothing.
 */
export const destinationHoldsAssets = async (
  providers: Providers,
  {
    address,
    txId,
    expected,
  }: {
    address: Cardano.PaymentAddress;
    txId: string;
    expected: AssetQuantity[];
  },
): Promise<SweepAssertion[]> => {
  if (expected.length === 0) {
    throw new Error('no assets staged, nothing to prove the sweep carried');
  }
  const nonPositive = expected.find(({ quantity }) => quantity <= 0n);
  if (nonPositive) {
    throw new Error(
      `staged quantity of ${nonPositive.assetId} is ${nonPositive.quantity}, nothing to prove the sweep carried`,
    );
  }
  let held = new Map<Cardano.AssetId, bigint>();
  const assetIds = expected.map(({ assetId }) => assetId);
  await pollUntil(async () => {
    held = await assetsHeldFromTx(providers, { address, txId, assetIds });
    return expected.every(
      ({ assetId, quantity }) => held.get(assetId) === quantity,
    );
  });
  return expected.map(({ assetId, quantity }) =>
    assertion(
      `destination received ${assetId} (x${quantity})`,
      held.get(assetId) === quantity,
    ),
  );
};

type ConservationAmounts = {
  sourceBefore: bigint;
  rewardsWithdrawn: bigint;
  received: bigint;
  fee: bigint;
};

/**
 * Ledger value conservation across the sweep, in lovelace. The deposit stays on
 * the still-registered stake key, so it is NOT part of the conservation identity.
 *
 * Note: `rewardsWithdrawn` is effectively 0 in the current scenarios (rewards
 * need roughly 2 epochs to accrue and the source is registered just before the
 * run), so this identity does not yet exercise the reward-withdrawal amount. An
 * aged, pre-delegated fixture would.
 */
export const valueConserved = ({
  sourceBefore,
  rewardsWithdrawn,
  received,
  fee,
}: ConservationAmounts): SweepAssertion =>
  assertion(
    'value conserved (before + rewards == received + fee)',
    sourceBefore + rewardsWithdrawn === received + fee,
  );

type SweepInput = {
  source: {
    address: Cardano.PaymentAddress;
    rewardAccount: Cardano.RewardAccount;
  };
  destination: { address: Cardano.PaymentAddress };
  txId: string;
  sourceBefore: bigint;
  rewardsWithdrawn: bigint;
};

/** Verifies a confirmed sweep against on-chain state, one assertion per check. */
export const assertSweep = async (
  providers: Providers,
  { source, destination, txId, sourceBefore, rewardsWithdrawn }: SweepInput,
): Promise<SweepAssertion[]> => {
  const emptied = await sourceEmptied(providers, source.address);
  const { result: received, received: receivedAmount } =
    await destinationReceived(providers, destination.address, txId);
  const fee = await confirmedTxFee(providers, txId);
  const stillRegistered = await sourceStillRegistered(
    providers,
    source.rewardAccount,
  );

  return [
    emptied,
    stillRegistered,
    received,
    valueConserved({
      sourceBefore,
      rewardsWithdrawn,
      received: receivedAmount,
      fee,
    }),
  ];
};
