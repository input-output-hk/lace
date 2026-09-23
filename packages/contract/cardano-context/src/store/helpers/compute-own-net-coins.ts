import { Cardano } from '@cardano-sdk/core';
import { BigIntMath } from '@cardano-sdk/util';

import { outpointKey } from '../../util';

import type { TransactionSummaryInspection } from '@cardano-sdk/core';

type ComputeOwnNetCoinsParams = {
  accountAddresses: readonly Cardano.PaymentAddress[];
  rewardAccount: Cardano.RewardAccount;
  protocolParameters: Pick<
    Cardano.ProtocolParameters,
    'poolDeposit' | 'stakeKeyDeposit'
  >;
  txBody: Pick<
    Cardano.HydratedTxBody,
    'certificates' | 'inputs' | 'outputs' | 'withdrawals'
  >;
  summary: Pick<
    TransactionSummaryInspection,
    'coins' | 'resolvedInputs' | 'returnedDeposit' | 'unresolved'
  >;
};

/**
 * Withdrawals and refunded deposits this transaction brought in for OTHER
 * parties. `summary.unresolved.value` counts those alongside the inputs the
 * inspector missed, so charging them to this account would overstate what it
 * spent. Never negative — passing no reward accounts counts every party's, a
 * superset of the account's own.
 */
const otherPartiesImplicitCoin = ({
  protocolParameters,
  certificates,
  withdrawals,
  ownImplicitCoin,
}: {
  protocolParameters: ComputeOwnNetCoinsParams['protocolParameters'];
  certificates: Cardano.HydratedTxBody['certificates'];
  withdrawals: Cardano.HydratedTxBody['withdrawals'];
  ownImplicitCoin: bigint;
}): bigint => {
  const everyParty = Cardano.util.computeImplicitCoin(
    protocolParameters,
    { certificates, withdrawals },
    [],
  ).input;
  return everyParty === undefined ? 0n : everyParty - ownImplicitCoin;
};

/**
 * This account's net coin change — what `summary.coins` would report had every
 * input resolved. Non-positive means the transaction is outgoing.
 *
 * Follows the SDK's convention of counting a change in TOTAL funds, so own
 * outputs less own inputs less own withdrawals: withdrawn rewards move between
 * two of the account's own buckets and are not a gain.
 *
 * `summary.coins` subtracts an input's value only once the inspector resolves
 * that input, so an own input whose lookup failed is never subtracted and a
 * transaction that really spent money reports a GAIN — displayed as a receive,
 * at the change amount. That is what this corrects.
 *
 * The inspector resolves a transaction's inputs twice, independently, and
 * reports which ones the FIRST pass missed while deriving `coins` from the
 * SECOND. The two passes can therefore know different subsets of the account's
 * input values, and `summary.unresolved.value` prices what the first pass missed. The
 * result is the largest own-input total the three sources can justify, which
 * bounds the answer between the truth and `summary.coins`:
 *
 *  - it never overshoots, so a real gain is never reported as a loss — the
 *    failure mode of correcting by ownership alone, which cannot tell a spend
 *    from a counterparty paying in;
 *  - it equals `summary.coins` exactly when BOTH passes resolved every input,
 *    so a healthy transaction is classified as before.
 *
 * KNOWN LIMITATIONS
 *  - when the unresolved inputs are a MIX of this account's and other parties',
 *    their aggregate value cannot be split between them, so no correction is
 *    applied and the answer is only as good as `summary.coins`. Splitting it
 *    needs the per-input values, which the activity provider already fetches
 *    and discards.
 *  - the bound above holds while the deposit protocol parameters still match
 *    what the chain charged for this transaction's certificates. A shelley-era
 *    refund is priced from the CURRENT `stakeKeyDeposit`/`poolDeposit` rather
 *    than from what the certificate locked, and any difference lands inside
 *    `summary.unresolved.value` where nothing here removes it — so a parameter
 *    that has changed since registration can push the answer below the truth by
 *    that difference. Both parameters have been fixed since Shelley, and Conway
 *    certificates carry their own deposit, so today the difference is zero.
 */
export const computeOwnNetCoins = ({
  accountAddresses,
  rewardAccount,
  protocolParameters,
  txBody: { certificates, inputs, outputs, withdrawals },
  summary: { coins, resolvedInputs, returnedDeposit, unresolved },
}: ComputeOwnNetCoinsParams): Cardano.Lovelace => {
  const ownAddresses = new Set(accountAddresses);
  const isOwn = ({ address }: { address: Cardano.PaymentAddress }) =>
    ownAddresses.has(address);

  const ownOutputs = BigIntMath.sum(
    outputs.filter(isOwn).map(({ value }) => value.coins),
  );
  const ownWithdrawals = BigIntMath.sum(
    (withdrawals ?? [])
      .filter(({ stakeAddress }) => stakeAddress === rewardAccount)
      .map(({ quantity }) => quantity),
  );
  const ownResolvedInputs = BigIntMath.sum(
    resolvedInputs.filter(isOwn).map(({ value }) => value.coins),
  );

  const ownOutpoints = new Set(
    inputs.filter(isOwn).map(input => outpointKey(input)),
  );
  const unresolvedOwn = unresolved.inputs.filter(input =>
    ownOutpoints.has(outpointKey(input)),
  );
  const isEveryUncountedInputOurs =
    unresolvedOwn.length > 0 &&
    unresolvedOwn.length === unresolved.inputs.length;
  const uncountedOwnInputs = isEveryUncountedInputOurs
    ? unresolved.value.coins -
      otherPartiesImplicitCoin({
        protocolParameters,
        certificates,
        withdrawals,
        ownImplicitCoin: ownWithdrawals + returnedDeposit,
      })
    : 0n;

  const fromFirstPass =
    ownOutputs -
    ownWithdrawals -
    ownResolvedInputs -
    // An input is never worth less than nothing: a negative shortfall would be
    // the transaction paying out coin the inspector cannot see, not own value
    // left uncounted.
    (uncountedOwnInputs > 0n ? uncountedOwnInputs : 0n);

  return fromFirstPass < coins ? fromFirstPass : coins;
};
