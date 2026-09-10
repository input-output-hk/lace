import type { CardanoRewardAccount } from '../types';
import type { Cardano, Serialization } from '@cardano-sdk/core';

/**
 * The reviewed-and-pinned set a sweep must fully evacuate: every UTxO the user
 * reviewed, and every reward account expected to be withdrawn. Distinct from the
 * signer's `resolvedInputs` (which only resolves addresses of inputs already in
 * the tx), so a caller cannot mistake "I passed the pinned set" for "coverage
 * was checked".
 */
export type PinnedSweepSet = {
  utxos: Cardano.Utxo[];
  withdrawalRewardAccounts: CardanoRewardAccount[];
};

/**
 * Thrown pre-submit when a built sweep omits a pinned input or a pinned
 * withdrawal. Distinct type so a caller can fail closed: submitting a tx that
 * silently dropped an account's UTxO would strand those funds on the abandoned
 * seed while a bare-txId success path reports the sweep as done.
 */
export class SweepCoverageError extends Error {
  public constructor(
    readonly missingInputs: string[],
    readonly missingWithdrawals: string[],
  ) {
    super(
      `sweep transaction omits pinned inputs [${missingInputs.join(
        ', ',
      )}] and withdrawals [${missingWithdrawals.join(', ')}]`,
    );
    this.name = 'SweepCoverageError';
  }
}

const txInKey = (txIn: {
  txId: Cardano.TransactionId;
  index: number;
}): string => `${txIn.txId}#${txIn.index}`;

/**
 * Fails closed unless the built transaction spends every pinned UTxO and
 * withdraws every pinned reward account. This is the coverage half of the
 * funds-safety backbone: `assertTransactionFullySigned` proves every input that
 * IS in the tx is witnessed, this proves every input that MUST be in the tx is
 * present. A builder or resolve bug that drops a pinned account is caught here
 * rather than submitting and reporting a partial sweep as success.
 */
export const assertTransactionCoversPinnedSet = (
  signedTx: Serialization.Transaction,
  pinned: PinnedSweepSet,
): void => {
  const core = signedTx.toCore();
  const inputs = new Set(core.body.inputs.map(txInKey));
  const missingInputs = pinned.utxos
    .map(([txIn]) => txInKey(txIn))
    .filter(key => !inputs.has(key));

  const withdrawals = new Set(
    (core.body.withdrawals ?? []).map(({ stakeAddress }) =>
      stakeAddress.toString(),
    ),
  );
  const missingWithdrawals = pinned.withdrawalRewardAccounts
    .map(rewardAccount => rewardAccount.toString())
    .filter(rewardAccount => !withdrawals.has(rewardAccount));

  if (missingInputs.length > 0 || missingWithdrawals.length > 0) {
    throw new SweepCoverageError(missingInputs, missingWithdrawals);
  }
};
