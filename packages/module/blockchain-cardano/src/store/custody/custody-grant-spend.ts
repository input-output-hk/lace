import { Cardano, Serialization } from '@cardano-sdk/core';
import {
  CARDANO_CUSTODY_DEFAULT_GRANT_FEE_BOUND,
  outpointKey,
} from '@lace-contract/cardano-context';
import {
  custodyGrantAfterSpend,
  custodyGrantLiveness,
  custodyRecipientToAddress,
  encodeCustodyAccountRedeemer,
  findCustodyScopeViolations,
  isCustodyLovelaceAsset,
} from '@lace-lib/cardano-custody';

import { CustodyBuildFailure, failCustodyBuild } from './build-failure';
import {
  MaxBalancedFeeExceeded,
  changeReserveAt,
  grantOutputOf,
  leastFeeOf,
  plannedFeeOf,
  resolvedInputsOf,
  selectFunds,
  totalValueOf,
} from './custody-assembly';
import { validitySlotFor } from './custody-chain';
import { buildWithEvaluatedBudgets } from './custody-evaluation';
import { custodyExecutionEstimate } from './custody-execution-estimate';
import { checkRequestedOutputs } from './custody-requests';
import {
  accountLogicOf,
  custodyScriptWitnesses,
  readCustodyLogicRun,
} from './custody-scripts';
import { finalizeCustodyBuild } from './custody-validation';

import type { CustodyAccountContext } from './custody-account';
import type { CustodyTransactionPlan, FundSelection } from './custody-assembly';
import type { CustodyChain } from './custody-chain';
import type * as Crypto from '@cardano-sdk/crypto';
import type {
  CardanoCustodyAccountOperation,
  CardanoCustodyBuildResult,
  CardanoCustodyCollateralFunding,
} from '@lace-contract/cardano-context';
import type {
  CustodyGrant,
  CustodyGrantUtxo,
  CustodyValueDelta,
} from '@lace-lib/cardano-custody';

type CustodyGrantSpendOperation = Extract<
  CardanoCustodyAccountOperation,
  { type: 'grant-spend' }
>;

/**
 * The most fund UTxOs one grant spend spends, upstream's `MAX_FUND_INPUTS`.
 * Every input adds a proxy run that decodes the whole transaction, and the
 * logic checks each one: a spend over twelve deposits measured 4.28M
 * memory units on upstream's devnet, a quarter of Preprod's limit.
 */
const MAX_GRANT_SPEND_FUND_INPUTS = 12;

/**
 * What the second build adds to the first build's fee when it lowers the
 * caps: room for a fee that moves when the caps' encoding or the measured
 * budgets change between the two builds.
 */
const GRANT_CAP_FEE_MARGIN = 10_000n;

const SPEND_WITH_GRANT_REDEEMER = encodeCustodyAccountRedeemer({
  kind: 'spendWithGrant',
});
const FUND_REDEEMER = encodeCustodyAccountRedeemer({ kind: 'fund' });

const cborOf = (data: Cardano.PlutusData): string =>
  Serialization.PlutusData.fromCore(data).toCbor();

const FUND_REDEEMER_CBOR = cborOf(FUND_REDEEMER);
const SPEND_WITH_GRANT_REDEEMER_CBOR = cborOf(SPEND_WITH_GRANT_REDEEMER);

const deltaOf = (
  value: Required<Cardano.Value>,
  fee = 0n,
): CustodyValueDelta => ({
  lovelace: value.coins + fee,
  assets: new Map(
    [...value.assets].map(([assetId, quantity]) => [
      assetId.toLowerCase() as Cardano.AssetId,
      quantity,
    ]),
  ),
});

/**
 * Metadata is an owner's to attach: the operation type leaves it out, and a
 * caller that names it anyway is refused rather than built without it.
 */
const refuseMetadata = (operation: CustodyGrantSpendOperation): void => {
  if ((operation as { metadata?: unknown }).metadata !== undefined) {
    failCustodyBuild({
      code: 'invalid-operation',
      reason: 'invalid-metadata',
      message: 'A grant spend carries no metadata',
    });
  }
};

/** The fee bound the operation names, or the default when it names none. */
const feeBoundOf = ({ feeBound }: CustodyGrantSpendOperation): bigint => {
  if (feeBound === undefined) return CARDANO_CUSTODY_DEFAULT_GRANT_FEE_BOUND;
  return typeof feeBound === 'bigint' && feeBound > 0n
    ? feeBound
    : failCustodyBuild({
        code: 'invalid-operation',
        reason: 'invalid-fee-bound',
        message: 'The fee bound must be a positive number of lovelace',
      });
};

/**
 * The grant UTxO a grant spend spends: the grantee's grant in the named
 * slot, or its single current, unexpired grant. The grant must be current
 * against the control state, and no unsettled transaction of this wallet
 * may already spend its UTxO.
 */
const selectGrant = (
  { grantee, slot }: CustodyGrantSpendOperation,
  { grants, state, spentInFlight }: CustodyAccountContext,
  { now }: CustodyChain,
): CustodyGrantUtxo => {
  const granteeHex = grantee.toLowerCase();
  const held = grants.filter(
    ({ grant }) => grant.grantee.toLowerCase() === granteeHex,
  );
  const livenessOf = ({ grant }: CustodyGrantUtxo) =>
    custodyGrantLiveness(grant, state, now);
  let selected: CustodyGrantUtxo | undefined;
  if (slot === undefined) {
    const current = held.filter(found => livenessOf(found) === 'current');
    if (current.length > 1) {
      return failCustodyBuild({
        code: 'grant-spend',
        reason: 'ambiguous-grant',
        grantee,
        slots: current.map(({ grant }) => grant.slot),
      });
    }
    // With no current grant, the latest one says why the grantee cannot spend.
    selected = current[0] ?? held.at(-1);
  } else {
    selected = held.find(({ grant }) => grant.slot === slot);
  }
  if (!selected) {
    return failCustodyBuild({
      code: 'grant-spend',
      reason: 'unknown-grant',
      grantee,
      ...(slot !== undefined && { slot }),
    });
  }
  const liveness = livenessOf(selected);
  if (liveness !== 'current') {
    return failCustodyBuild({
      code: 'grant-spend',
      reason: 'dead-grant',
      slot: selected.grant.slot,
      liveness,
    });
  }
  return spentInFlight.has(outpointKey(selected.utxo[0]))
    ? failCustodyBuild({ code: 'operation-in-progress' })
    : selected;
};

/** Refuses an output the grant's recipient list does not name, on the account's network. */
const checkRecipients = (
  grant: CustodyGrant,
  outputs: readonly Cardano.TxOut[],
  networkId: Cardano.NetworkId,
): void => {
  const { recipients } = grant.scope;
  if (recipients.length === 0) return;
  const allowed = new Set(
    recipients.flatMap(recipient => {
      const address = custodyRecipientToAddress(recipient, networkId);
      return address.ok ? [address.value.toBech32()] : [];
    }),
  );
  for (const [outputIndex, output] of outputs.entries()) {
    // A requested address may arrive as hex, so compare the bech32 form.
    // checkRequestedOutputs has refused every address that has none.
    const address = Cardano.Address.fromString(output.address)!.toBech32();
    if (!allowed.has(address)) {
      failCustodyBuild({
        code: 'grant-spend',
        reason: 'recipient-not-allowed',
        outputIndex,
      });
    }
  }
};

/**
 * Refuses an outflow the grant's scope does not allow. `fee`, when known,
 * is the part of the lovelace outflow that pays the transaction fee; each
 * refusal reports it, so a caller can size a grant for the payment and the
 * fee.
 */
const refuseScope = (
  grant: CustodyGrant,
  leaving: CustodyValueDelta,
  fee?: bigint,
): void => {
  const violations = findCustodyScopeViolations(grant.scope, leaving, fee);
  if (violations.length > 0) {
    failCustodyBuild({ code: 'grant-spend', reason: 'scope', violations });
  }
};

/**
 * The upper validity bound of a grant spend: the earlier of the funding
 * window and the slot holding the grant's expiry, whose start the contract
 * compares with the expiry. A grant that expires within the current slot
 * leaves no such slot.
 */
const grantSpendValiditySlot = (
  grant: CustodyGrant,
  funding: CardanoCustodyCollateralFunding,
  chain: CustodyChain,
): Cardano.Slot => {
  const windowSlot = validitySlotFor(funding.validUntil, chain);
  const { expiresAt } = grant.scope;
  if (expiresAt >= BigInt(chain.clock.slotStart(windowSlot))) return windowSlot;
  const expirySlot = chain.clock.slotAt(Number(expiresAt));
  return expirySlot > chain.clock.slotAt(chain.now)
    ? expirySlot
    : failCustodyBuild({
        code: 'grant-spend',
        reason: 'dead-grant',
        slot: grant.slot,
        liveness: 'expired',
      });
};

/**
 * Refuses a spend the fund UTxOs cannot pay however they are combined:
 * they hold less of a requested asset, or less lovelace, with whatever the
 * logic run draws, than the outputs and the least fee. It runs before the
 * fund input cap, because consolidation cannot help an account that is
 * short of funds.
 */
const refuseShortFunds = (
  candidates: readonly Cardano.Utxo[],
  requested: Required<Cardano.Value>,
  { leastFee, drawn }: { leastFee: bigint; drawn: bigint },
): void => {
  const available = totalValueOf(candidates.map(([, output]) => output));
  const isShort =
    available.coins + drawn < requested.coins + leastFee ||
    [...requested.assets].some(
      ([assetId, quantity]) => (available.assets.get(assetId) ?? 0n) < quantity,
    );
  if (isShort) {
    failCustodyBuild({
      code: 'insufficient-funds',
      message:
        'The fund UTxOs hold less than the requested outputs and the least fee',
    });
  }
};

const refuseFundInputCount = (funds: readonly Cardano.Utxo[]): void => {
  if (funds.length > MAX_GRANT_SPEND_FUND_INPUTS) {
    failCustodyBuild({
      code: 'grant-spend',
      reason: 'fund-input-cap',
      maxFundInputs: MAX_GRANT_SPEND_FUND_INPUTS,
      requiredFundInputs: funds.length,
    });
  }
};

/**
 * Refuses a spend whose budgets exceed the per-transaction execution limit,
 * as a fund input count above what one spend fits: the grant's run is
 * fixed, so only fewer, larger fund UTxOs help. The count that fits follows
 * from the grant's and the logic's budgets and the dearest fund budget; the
 * logic's budget already counts every fund it checked, so the count errs
 * low.
 */
const refuseOverBudget = (
  redeemers: readonly Cardano.Redeemer[],
  { maxExecutionUnitsPerTransaction: limit }: Cardano.ProtocolParameters,
): void => {
  const total = redeemers.reduce(
    (sum, { executionUnits }) => ({
      memory: sum.memory + executionUnits.memory,
      steps: sum.steps + executionUnits.steps,
    }),
    { memory: 0, steps: 0 },
  );
  if (total.memory <= limit.memory && total.steps <= limit.steps) return;
  const fixed = redeemers
    .filter(
      ({ purpose, data }) =>
        purpose === Cardano.RedeemerPurpose.withdrawal ||
        cborOf(data) === SPEND_WITH_GRANT_REDEEMER_CBOR,
    )
    .reduce(
      (sum, { executionUnits }) => ({
        memory: sum.memory + executionUnits.memory,
        steps: sum.steps + executionUnits.steps,
      }),
      { memory: 0, steps: 0 },
    );
  const fundBudgets = redeemers
    .filter(({ data }) => cborOf(data) === FUND_REDEEMER_CBOR)
    .map(({ executionUnits }) => executionUnits);
  const fundMemory = Math.max(1, ...fundBudgets.map(({ memory }) => memory));
  const fundSteps = Math.max(1, ...fundBudgets.map(({ steps }) => steps));
  const fitting = Math.floor(
    Math.min(
      (limit.memory - fixed.memory) / fundMemory,
      (limit.steps - fixed.steps) / fundSteps,
    ),
  );
  failCustodyBuild({
    code: 'grant-spend',
    reason: 'fund-input-cap',
    maxFundInputs: Math.max(0, Math.min(MAX_GRANT_SPEND_FUND_INPUTS, fitting)),
    requiredFundInputs: fundBudgets.length,
  });
};

/**
 * The grant the recreated grant UTxO carries: the caps `grant_after_spend`
 * allows for the requested outputs and `fee`, and no lower than zero. The
 * logic accepts any cap from zero to the value for the fee of the
 * transaction it checks, so a `fee` no lower than that one writes valid
 * caps.
 */
const grantAfter = (
  grant: CustodyGrant,
  requested: Required<Cardano.Value>,
  fee: bigint,
): CustodyGrant => {
  const { scope } = custodyGrantAfterSpend(grant, deltaOf(requested, fee));
  return {
    ...grant,
    scope: {
      ...scope,
      cap: scope.cap > 0n ? scope.cap : 0n,
      lovelaceCap: scope.lovelaceCap > 0n ? scope.lovelaceCap : 0n,
    },
  };
};

/**
 * The most fee the outflow carries before it breaks a lovelace cap of the
 * scope: the lower of a lovelace grant's caps, or of a token grant's
 * lovelace caps, less the requested lovelace.
 */
const feeRoomOf = (
  { scope }: CustodyGrant,
  requested: Required<Cardano.Value>,
): bigint => {
  const [perCallCap, cap] = isCustodyLovelaceAsset(scope.asset)
    ? [scope.perCallCap, scope.cap]
    : [scope.lovelacePerCallCap, scope.lovelaceCap];
  return (perCallCap < cap ? perCallCap : cap) - requested.coins;
};

/**
 * Builds a grant spend for the grantee to sign. It references the
 * account's control UTxO, spends the grant UTxO with `SpendWithGrant` and
 * plain fund UTxOs with `Fund`, largest first, never a reserve, one
 * carrying a reference script, or one in `excludedInputs`, and runs the
 * logic the control names through its withdrawal. The grant UTxO is
 * recreated with the same value and the caps lowered by the outflow, the
 * requested outputs are paid, and the change, with whatever the logic run
 * draws, returns to the account as a plain output. The account pays the
 * fee, which counts against the grant's caps; the sponsor contributes only
 * its collateral. The proxy and the logic are read from their parked UTxOs
 * on a network that has them, and attached elsewhere.
 *
 * The caps go into the datum before the fee is known, and the logic counts
 * the fee in the outflow it checks against them, both on the final
 * transaction and on the balanced draft the provider evaluates. So every
 * draft is balanced at no more than the fee the caps were lowered by, nor
 * the fee that keeps the outflow within the caps, and two builds run with
 * evaluated budgets. The first lowers the caps by the fee bound, and a fee
 * above the bound or the caps is refused. The second lowers them by the
 * first fee and a small margin, and stands when its fee fits that; the
 * first build stands whenever the second cannot be built.
 */
export const buildCustodyGrantSpend = async (
  {
    operation,
    funding,
  }: {
    operation: CustodyGrantSpendOperation;
    funding: CardanoCustodyCollateralFunding;
  },
  context: CustodyAccountContext,
  chain: CustodyChain,
): Promise<CardanoCustodyBuildResult> => {
  const { identity, control } = context;
  const { protocolParameters: parameters } = chain;
  refuseMetadata(operation);
  const feeBound = feeBoundOf(operation);
  const spent = selectGrant(operation, context, chain);
  const { grant } = spent;
  checkRequestedOutputs(
    operation.outputs,
    identity,
    parameters.coinsPerUtxoByte,
  );
  checkRecipients(grant, operation.outputs, identity.chainId.networkId);
  const requested = totalValueOf(operation.outputs);
  // A payment that alone breaks the caps is refused before any build.
  refuseScope(grant, deltaOf(requested));
  const invalidHereafter = grantSpendValiditySlot(grant, funding, chain);
  const grantee = grant.grantee as unknown as Crypto.Ed25519KeyHashHex;

  const logicRun = await readCustodyLogicRun(accountLogicOf(context), chain);
  const drawn = logicRun.withdrawal.quantity;
  const { contractVersion } = identity;
  const witnesses = custodyScriptWitnesses(contractVersion, chain, [
    contractVersion.accountValidator,
    logicRun.logic.script,
  ]);

  const excluded = new Set((operation.excludedInputs ?? []).map(outpointKey));
  const candidates = context.funds.filter(
    ([input, output]) =>
      output.scriptReference === undefined && !excluded.has(outpointKey(input)),
  );
  const planOf =
    (after: CustodyGrant) =>
    (funds: readonly Cardano.Utxo[]): CustodyTransactionPlan => ({
      inputs: [
        { utxo: spent.utxo, redeemer: SPEND_WITH_GRANT_REDEEMER },
        ...funds.map(utxo => ({ utxo, redeemer: FUND_REDEEMER })),
      ],
      referenceInputs: [control, ...witnesses.referenced],
      outputs: [
        grantOutputOf(identity, after, spent.utxo[1].value.coins),
        ...operation.outputs,
      ],
      changeAddress: identity.address,
      scripts: witnesses.attached,
      executionEstimate: custodyExecutionEstimate({
        spendWithGrant: 1,
        fund: funds.length,
        logic: 'agent',
      }),
      requiredSigner: grantee,
      invalidHereafter,
      collateral: {
        utxo: funding.collateralUtxo,
        returnAddress: funding.sponsorAddress,
      },
      withdrawals: [logicRun.withdrawal],
    });
  const needed =
    requested.coins +
    plannedFeeOf(planOf(grant)([]), parameters) +
    changeReserveAt(identity.address, parameters.coinsPerUtxoByte) -
    drawn;
  const selection = selectFunds(candidates, {
    coins: needed > 0n ? needed : 0n,
    assets: requested.assets,
  });
  if (!selection.covers) {
    refuseShortFunds(candidates, requested, {
      leastFee: leastFeeOf(planOf(grant)([]), parameters),
      drawn,
    });
  }

  const feeRoom = feeRoomOf(grant, requested);
  /** A build whose caps are lowered by `lowering` and whose drafts fit them. */
  const build = async (lowering: bigint, funds: FundSelection) => {
    const after = grantAfter(grant, requested, lowering);
    const transaction = await buildWithEvaluatedBudgets({
      chain,
      funds,
      checkFunds: refuseFundInputCount,
      plan: planOf(after),
      maxBalancedFee: lowering < feeRoom ? lowering : feeRoom,
    });
    return { transaction, after, fee: transaction.body().fee() };
  };
  /** Refuses a fee above the bound, or one that takes the outflow over a cap. */
  const refuseFee = (fee: bigint): never =>
    fee > feeBound
      ? failCustodyBuild({
          code: 'grant-spend',
          reason: 'fee-above-bound',
          fee,
          feeBound,
        })
      : failCustodyBuild({
          code: 'grant-spend',
          reason: 'scope',
          violations: findCustodyScopeViolations(
            grant.scope,
            deltaOf(requested, fee),
            fee,
          ),
        });

  const first = await build(feeBound, selection).catch((error: unknown) => {
    if (!(error instanceof MaxBalancedFeeExceeded)) throw error;
    // Too many funds explain a fee above the bound and are what to change.
    refuseOverBudget(error.evaluatedRedeemers, parameters);
    return refuseFee(error.fee);
  });
  refuseOverBudget(
    first.transaction.witnessSet().redeemers()?.toCore() ?? [],
    parameters,
  );
  const firstFunds = resolvedInputsOf(first.transaction, candidates);

  let chosen = first;
  const tightFee = first.fee + GRANT_CAP_FEE_MARGIN;
  const { scope: tight } = grantAfter(grant, requested, tightFee);
  // Both lowerings may take the caps to zero, which leaves nothing to save.
  const isTighter =
    tight.cap > first.after.scope.cap ||
    tight.lovelaceCap > first.after.scope.lovelaceCap;
  if (isTighter) {
    const used = new Set(firstFunds.map(([input]) => outpointKey(input)));
    try {
      chosen = await build(tightFee, {
        selected: firstFunds,
        remaining: candidates.filter(
          ([input]) => !used.has(outpointKey(input)),
        ),
      });
    } catch (error) {
      // The tighter caps only save the grant's allowance: the first build,
      // evaluated on its final bytes, stands whenever they cannot be met.
      if (
        !(error instanceof MaxBalancedFeeExceeded) &&
        !(error instanceof CustodyBuildFailure)
      ) {
        throw error;
      }
    }
  }

  const { transaction, after } = chosen;
  return finalizeCustodyBuild(
    {
      transaction,
      resolvedInputs: resolvedInputsOf(transaction, [
        spent.utxo,
        control,
        ...witnesses.referenced,
        ...candidates,
        funding.collateralUtxo,
      ]),
    },
    chain,
    {
      record: context.record,
      grantSpend: { slot: grant.slot, after },
      signer: grantee,
      outflow: { requested, withdrawal: drawn },
      funding,
    },
  );
};
