import { minAdaRequired } from '@cardano-sdk/tx-construction';
import {
  CardanoRewardAccount,
  isCardanoCustodyGrantExhausted,
  outpointKey,
} from '@lace-contract/cardano-context';
import {
  addCustodyDevice,
  custodyGrantAssetId,
  encodeCustodyAccountRedeemer,
  encodeCustodyMintRedeemer,
  encodeCustodyStakeRedeemer,
  issueCustodyGrant,
  removeCustodyDevice,
  replaceCustodyGrant,
  revokeAllCustodyGrants,
  revokeCustodyGrant,
  sweepCustodyGrants,
} from '@lace-lib/cardano-custody';
import { BigNumber } from '@lace-lib/util';

import {
  CustodyBuildFailure,
  failCustodyBuild,
  transitioned,
} from './build-failure';
import { requireListedDevice } from './custody-account';
import {
  FundShortfall,
  changeIndexOf,
  changeReserveAt,
  controlLovelaceFor,
  controlOutputOf,
  grantOutputOf,
  leastFeeOf,
  outputLovelaceFor,
  plannedFeeOf,
  resolvedInputsOf,
  scriptCredentialOf,
  selectFunds,
  totalValueOf,
  withCoins,
  withOutputs,
} from './custody-assembly';
import {
  firstSlotStartingAfter,
  readFromProvider,
  validitySlotFor,
} from './custody-chain';
import { buildWithEvaluatedBudgets } from './custody-evaluation';
import { custodyExecutionEstimate } from './custody-execution-estimate';
import {
  checkRequestedMetadata,
  checkRequestedOutputs,
  grantRequestOf,
  poolIdOf,
} from './custody-requests';
import {
  accountLogicOf,
  custodyScriptWitnesses,
  readCustodyLogicRun,
} from './custody-scripts';
import { finalizeCustodyBuild } from './custody-validation';

import type { CustodyAccountContext } from './custody-account';
import type { CustodyTransactionPlan } from './custody-assembly';
import type { CustodyChain } from './custody-chain';
import type {
  CustodyLogicRun,
  CustodyScriptWitnesses,
} from './custody-scripts';
import type { Cardano, Serialization } from '@cardano-sdk/core';
import type * as Crypto from '@cardano-sdk/crypto';
import type {
  CardanoCustodyAccountOperation,
  CardanoCustodyBuildResult,
  CardanoCustodyCollateralFunding,
  CardanoCustodyGrantScopeRequest,
} from '@lace-contract/cardano-context';
import type {
  CustodyAccountState,
  CustodyGrant,
  CustodyGrantUtxo,
  CustodyResult,
  CustodyStateTransitionError,
  IssuedCustodyGrant,
} from '@lace-lib/cardano-custody';

/** An operation a listed device signs: every account operation but a grant spend. */
type CustodyOwnerOperation = Exclude<
  CardanoCustodyAccountOperation,
  { type: 'grant-spend' }
>;

/**
 * The control output headroom, its lovelace above the state's minimum, that
 * an issue or a replace tops up to. The headroom is the owner's fee reserve:
 * an owner operation the plain funds cannot pay takes its fee from it, so an
 * owner can still revoke a grant after its agent drains the plain funds.
 * It pays two revokes. Where the proxy and the logic are attached, as on
 * Mainnet, a revoke carries about 12.7 KB, 11,871 bytes of them the two
 * scripts, at 44 lovelace per byte. At Preprod's prices and the 1.6M to 1.8M
 * memory units upstream's devnet measured over the largest state, the
 * control pays a fee of about 0.84 ADA. Before evaluation balancing prices
 * a revoke at its execution estimate, about 0.99 ADA, which the draft the
 * provider evaluates must find in the headroom. The first revoke's fee, the
 * second's draft, the state's growth and the growth margin come to about
 * 2.04 ADA. On Preprod, where the scripts are referenced at 15 lovelace per
 * byte, a revoke costs about 0.5 ADA and its draft about 0.64 ADA.
 */
const CUSTODY_OWNER_FEE_RESERVE_TARGET = 2_100_000n;

/**
 * The control datum bytes the control output keeps lovelace for beyond its
 * minimum after paying a fee. The largest growth one owner operation makes
 * is a device key: 30 bytes, its 28 bytes and their header. A revoked slot
 * adds at most 6, and a counter crossing a CBOR width at most 2. The next
 * operation's growth is then covered, whoever pays its fee.
 */
const CUSTODY_CONTROL_GROWTH_MARGIN_BYTES = 32;

const DEVICE_REDEEMER = encodeCustodyAccountRedeemer({ kind: 'device' });
const FUND_REDEEMER = encodeCustodyAccountRedeemer({ kind: 'fund' });
const SWEEP_REDEEMER = encodeCustodyAccountRedeemer({ kind: 'sweepGrant' });
const ISSUE_REDEEMER = encodeCustodyMintRedeemer({ kind: 'issueGrants' });
const BURN_REDEEMER = encodeCustodyMintRedeemer({ kind: 'burnGrants' });

/** What an owner operation changes, before any fee is paid. */
interface OwnerEffect {
  readonly state: CustodyAccountState;
  /** The outputs the owner asks the account to pay. */
  readonly outputs: readonly Cardano.TxOut[];
  /** The grant the operation issues into the state's next slot. */
  readonly issued?: CustodyGrant;
  /** The dead grant UTxOs the operation sweeps, and the start its validity needs. */
  readonly swept?: {
    readonly grants: readonly CustodyGrantUtxo[];
    readonly invalidBefore?: Cardano.Slot;
  };
  readonly poolId?: Cardano.PoolId;
  readonly withdrawal?: bigint;
  /** The metadata an owner spend carries as auxiliary data. */
  readonly metadata?: Cardano.TxMetadata;
}

/**
 * Refuses a grant whose per-call caps cannot pay the smallest spend: one
 * output at its minimum ADA and the default grant fee bound. Its agent could
 * never spend it.
 */
const spendableGrant = (
  { grant }: IssuedCustodyGrant,
  { identity }: CustodyAccountContext,
  { protocolParameters }: CustodyChain,
): CustodyGrant =>
  isCardanoCustodyGrantExhausted(grant.scope, {
    protocolParameters,
    networkId: identity.chainId.networkId,
  })
    ? failCustodyBuild({
        code: 'invalid-operation',
        reason: 'grant-scope',
        message:
          'The caps cannot pay the smallest spend: one output at its minimum ADA and the grant fee bound',
      })
    : grant;

/** What an issue or a replace writes: the state and the grant it issues. */
const issueEffectOf = (
  result: CustodyResult<IssuedCustodyGrant, CustodyStateTransitionError>,
  context: CustodyAccountContext,
  chain: CustodyChain,
): OwnerEffect => {
  const issued = transitioned(result);
  return {
    state: issued.state,
    outputs: [],
    issued: spendableGrant(issued, context, chain),
  };
};

/**
 * The sweep of the dead grants in `slots`. Each must be dead against the
 * state before the sweep. The validity interval starts no earlier than the
 * current slot, so a grant dead by expiry alone must expire before the
 * current slot starts; the interval then starts in the first slot after
 * the latest such expiry.
 */
const sweepEffectOf = (
  slots: readonly bigint[],
  { state, grants, spentInFlight }: CustodyAccountContext,
  chain: CustodyChain,
): OwnerEffect => {
  const swept = slots.map(slot => {
    const found = grants.find(({ grant }) => grant.slot === slot);
    if (!found) {
      return failCustodyBuild({
        code: 'invalid-operation',
        reason: 'state-transition',
        error: { code: 'grant-not-found', slot },
      });
    }
    return spentInFlight.has(outpointKey(found.utxo[0]))
      ? failCustodyBuild({ code: 'operation-in-progress' })
      : found;
  });
  const currentSlotStart = chain.clock.slotStart(chain.clock.slotAt(chain.now));
  const { state: next, startsAfter } = transitioned(
    sweepCustodyGrants(
      state,
      swept.map(({ grant }) => grant),
      currentSlotStart,
    ),
  );
  return {
    state: next,
    outputs: [],
    swept: {
      grants: swept,
      ...(startsAfter !== undefined && {
        invalidBefore: firstSlotStartingAfter(startsAfter, chain),
      }),
    },
  };
};

/**
 * The metadata an operation carries. Only an owner spend carries any: the
 * other operation types leave it out, and a caller that names it on one
 * anyway is refused rather than built without it, as a grant spend is.
 */
const metadataOf = (
  operation: CustodyOwnerOperation,
): Cardano.TxMetadata | undefined => {
  const { metadata } = operation as { metadata?: unknown };
  if (metadata !== undefined && operation.type !== 'owner-spend') {
    return failCustodyBuild({
      code: 'invalid-operation',
      reason: 'invalid-metadata',
      message: `A ${operation.type} carries no metadata`,
    });
  }
  return checkRequestedMetadata(metadata);
};

/**
 * The state an owner operation writes and what else it does. State changes
 * go through the library's transitions, which refuse what the account could
 * not use afterwards; withdrawal reads the reward balance now, because the
 * ledger accepts only the exact balance.
 */
const ownerEffectOf = async (
  operation: CustodyOwnerOperation,
  context: CustodyAccountContext,
  chain: CustodyChain,
): Promise<OwnerEffect> => {
  const { identity, state } = context;
  const metadata = metadataOf(operation);
  const grants = context.grants.map(({ grant }) => grant);
  const requestOf = (scope: CardanoCustodyGrantScopeRequest) =>
    grantRequestOf({ scope, slot: state.nextSlot }, identity, chain.now);
  switch (operation.type) {
    case 'issue-grant':
      return issueEffectOf(
        issueCustodyGrant(state, requestOf(operation.scope), grants),
        context,
        chain,
      );
    case 'replace-grant':
      return issueEffectOf(
        replaceCustodyGrant(
          state,
          { ...requestOf(operation.scope), slot: operation.slot },
          grants,
        ),
        context,
        chain,
      );
    case 'revoke-grant':
      return {
        state: transitioned(revokeCustodyGrant(state, operation.slot, grants)),
        outputs: [],
      };
    case 'revoke-all-grants':
      return { state: revokeAllCustodyGrants(state), outputs: [] };
    case 'sweep-grants':
      return sweepEffectOf(operation.slots, context, chain);
    case 'add-device':
      return {
        state: transitioned(addCustodyDevice(state, operation.keyHash, grants)),
        outputs: [],
      };
    case 'remove-device':
      return {
        state: transitioned(removeCustodyDevice(state, operation.keyHash)),
        outputs: [],
      };
    case 'owner-spend':
      return {
        state,
        outputs: operation.outputs,
        ...(metadata && { metadata }),
      };
    case 'delegate':
      return { state, outputs: [], poolId: poolIdOf(operation.poolId) };
    case 'withdraw-rewards': {
      const { withdrawableAmount } = await readFromProvider(
        'Custody reward account',
        () =>
          chain.provider.getRewardAccountInfo(
            { rewardAccount: CardanoRewardAccount(identity.rewardAccount) },
            { chainId: chain.chainId },
          ),
      );
      const withdrawal = BigNumber.valueOf(withdrawableAmount);
      return withdrawal > 0n
        ? { state, outputs: [], withdrawal }
        : failCustodyBuild({
            code: 'invalid-operation',
            reason: 'no-rewards',
            message: 'The custody account has no rewards to withdraw',
          });
    }
  }
};

/** Everything both fee payers build an owner operation from. */
interface OwnerBuild {
  readonly context: CustodyAccountContext;
  readonly chain: CustodyChain;
  readonly effect: OwnerEffect;
  readonly signer: Crypto.Ed25519KeyHashHex;
  readonly funding: CardanoCustodyCollateralFunding;
  /** The grant UTxO the operation issues, at its minimum ADA. */
  readonly issued?: {
    readonly grant: CustodyGrant;
    readonly output: Cardano.TxOut;
  };
  /** The new state's minimum control lovelace. */
  readonly minimum: bigint;
  /** What the spent control and swept grant UTxOs hold. */
  readonly spentAccountLovelace: bigint;
  readonly logicRun: CustodyLogicRun;
  readonly witnesses: CustodyScriptWitnesses;
}

/** How an owner operation's transaction turned out. */
interface OwnerTransaction {
  readonly transaction: Serialization.Transaction;
  readonly controlLovelace: bigint;
  /** The UTxOs other than the control and the collateral it may spend. */
  readonly candidates: readonly Cardano.Utxo[];
}

const sweptGrantsOf = ({ effect }: OwnerBuild) => effect.swept?.grants ?? [];

/**
 * The lovelace the withdrawals add to the transaction: the rewards an
 * operation withdraws and whatever the logic run draws. The change or the
 * control output keeps it at the account address.
 */
const withdrawnOf = ({ effect, logicRun }: OwnerBuild): bigint =>
  (effect.withdrawal ?? 0n) + logicRun.withdrawal.quantity;

/** The transaction's plan with `funds` paying and the control output at `controlLovelace`. */
const planOf = (
  build: OwnerBuild,
  funds: readonly Cardano.Utxo[],
  controlLovelace: bigint,
): CustodyTransactionPlan => {
  const { context, chain, effect, signer, funding, issued, witnesses } = build;
  const { identity, control } = context;
  const swept = sweptGrantsOf(build);
  const isStakeOperation =
    effect.poolId !== undefined || effect.withdrawal !== undefined;
  const mint = issued
    ? {
        assets: new Map([
          [custodyGrantAssetId(context.record, issued.grant.slot), 1n],
        ]),
        redeemer: ISSUE_REDEEMER,
      }
    : swept.length > 0
    ? {
        assets: new Map(swept.map(({ token }) => [token, -1n] as const)),
        redeemer: BURN_REDEEMER,
      }
    : undefined;
  return {
    inputs: [
      { utxo: control, redeemer: DEVICE_REDEEMER },
      ...swept.map(({ utxo }) => ({ utxo, redeemer: SWEEP_REDEEMER })),
      ...funds.map(utxo => ({ utxo, redeemer: FUND_REDEEMER })),
    ],
    outputs: [
      controlOutputOf(identity, effect.state, controlLovelace),
      ...(issued ? [issued.output] : []),
      ...effect.outputs,
    ],
    referenceInputs: witnesses.referenced,
    changeAddress: identity.address,
    scripts: [
      ...witnesses.attached,
      ...(isStakeOperation ? [identity.stakeScript] : []),
    ],
    executionEstimate: custodyExecutionEstimate({
      device: 1,
      sweepGrant: swept.length,
      fund: funds.length,
      issueGrants: issued ? 1 : 0,
      burnGrants: swept.length > 0 ? 1 : 0,
      operate: isStakeOperation ? 1 : 0,
      logic: 'owner',
    }),
    requiredSigner: signer,
    ...(effect.swept?.invalidBefore !== undefined && {
      invalidBefore: effect.swept.invalidBefore,
    }),
    invalidHereafter: validitySlotFor(funding.validUntil, chain),
    collateral: {
      utxo: funding.collateralUtxo,
      returnAddress: funding.sponsorAddress,
    },
    ...(mint && { mint }),
    ...(effect.poolId && {
      delegation: {
        stakeCredential: scriptCredentialOf(identity.stakeScriptHash),
        poolId: effect.poolId,
        redeemer: encodeCustodyStakeRedeemer(),
      },
    }),
    withdrawals: [
      build.logicRun.withdrawal,
      ...(effect.withdrawal
        ? [
            {
              rewardAccount: identity.rewardAccount,
              quantity: effect.withdrawal,
              redeemer: encodeCustodyStakeRedeemer(),
            },
          ]
        : []),
    ],
    ...(effect.metadata && { metadata: effect.metadata }),
  };
};

/**
 * Moves `amount` lovelace from the change into the control output once the
 * fee is final. A change left below its minimum ADA joins the control
 * output whole, when it holds no token.
 *
 * @throws `FundShortfall` when the change cannot spare `amount`; once no
 *   fund is left the build fails with `owner-reserve-required`, or with
 *   `insufficient-funds` when there is no change at all
 */
const topUpControl = (
  transaction: Serialization.Transaction,
  { context, chain, effect, issued }: OwnerBuild,
  amount: bigint,
): { transaction: Serialization.Transaction; controlLovelace: bigint } => {
  const outputs = [...transaction.body().toCore().outputs];
  const [control] = outputs;
  const changeIndex = changeIndexOf(
    outputs,
    context.identity.address,
    1 + (issued ? 1 : 0) + effect.outputs.length,
  );
  if (changeIndex < 0) {
    throw new FundShortfall('No change output to top the reserve up from');
  }
  const change = outputs[changeIndex];
  const left = change.value.coins - amount;
  const kept = minAdaRequired(
    change,
    BigInt(chain.protocolParameters.coinsPerUtxoByte),
  );
  const hasTokens = (change.value.assets?.size ?? 0) > 0;
  if (left >= kept) {
    outputs[0] = withCoins(control, control.value.coins + amount);
    outputs[changeIndex] = withCoins(change, left);
  } else if (!hasTokens && left >= 0n) {
    outputs[0] = withCoins(control, control.value.coins + change.value.coins);
    outputs.splice(changeIndex, 1);
  } else {
    // A change holding tokens must keep its minimum; any other change
    // holds less than the top-up.
    const movable = hasTokens ? change.value.coins - kept : change.value.coins;
    throw new FundShortfall('The change cannot top the owner fee reserve up', {
      code: 'owner-reserve-required',
      target: CUSTODY_OWNER_FEE_RESERVE_TARGET,
      shortfall: amount - movable,
    });
  }
  return {
    transaction: withOutputs(transaction, outputs),
    controlLovelace: outputs[0].value.coins,
  };
};

/**
 * Plain funds, then reserves, largest first, pay the requested outputs, the
 * issued grant's lovelace, any growth of the control output and the fee, and
 * the change, rewards included, returns to the account without a datum. A
 * reserve's remainder becomes plain change. Swept grant lovelace goes to the
 * control output, and an issue tops the control headroom up to the owner fee
 * reserve target from the change.
 *
 * A fund carrying a reference script is never spent. Anyone can send one to
 * the account. Where the proxy and the logic are attached, such a fund
 * holding one of them would make the ledger refuse every owner operation
 * for providing the script twice, instead of falling back to the control
 * headroom; anywhere, its script would add to the fee and, for the fee
 * sponsor, to the languages of the script data hash.
 */
const buildPaidByFunds = async (
  build: OwnerBuild,
): Promise<OwnerTransaction> => {
  const { context, chain, effect, issued, minimum } = build;
  const { identity } = context;
  const spendable = context.funds.filter(
    ([, output]) => output.scriptReference === undefined,
  );
  const { protocolParameters: parameters } = chain;
  const swept = sweptGrantsOf(build);
  const controlLovelace =
    build.spentAccountLovelace > minimum ? build.spentAccountLovelace : minimum;
  const reserveTarget = minimum + CUSTODY_OWNER_FEE_RESERVE_TARGET;
  const topUp =
    issued && reserveTarget > controlLovelace
      ? reserveTarget - controlLovelace
      : 0n;
  const requested = totalValueOf(effect.outputs);
  const needed =
    requested.coins +
    (issued?.output.value.coins ?? 0n) +
    (controlLovelace - build.spentAccountLovelace) +
    topUp +
    plannedFeeOf(planOf(build, [], controlLovelace), parameters) +
    changeReserveAt(identity.address, parameters.coinsPerUtxoByte) -
    withdrawnOf(build);
  let settledLovelace = controlLovelace;
  const transaction = await buildWithEvaluatedBudgets({
    chain,
    funds: selectFunds(
      spendable,
      { coins: needed > 0n ? needed : 0n, assets: requested.assets },
      context.reserves,
    ),
    plan: funds => planOf(build, funds, controlLovelace),
    ...(topUp > 0n && {
      settle: built => {
        const settled = topUpControl(built, build, topUp);
        settledLovelace = settled.controlLovelace;
        return settled.transaction;
      },
    }),
  });
  return {
    transaction,
    controlLovelace: settledLovelace,
    candidates: [
      ...spendable,
      ...context.reserves,
      ...swept.map(({ utxo }) => utxo),
    ],
  };
};

const headroomShortfall = (): never =>
  failCustodyBuild({
    code: 'insufficient-funds',
    message:
      'The plain funds and reserves cannot pay the fee, and the control output headroom cannot either',
  });

/**
 * The control output pays the fee from its headroom: the transaction spends
 * only the control UTxO and any swept grant UTxOs, and the control output
 * takes everything they hold and whatever the withdrawals add, less the
 * fee. It must keep the new state's minimum and the growth margin, which a
 * headroom below the least fee never keeps, so such a build is refused
 * before any evaluation.
 */
const buildPaidByControl = async (
  build: OwnerBuild,
): Promise<OwnerTransaction> => {
  const { chain, minimum, spentAccountLovelace } = build;
  const held = spentAccountLovelace + withdrawnOf(build);
  const plan: CustodyTransactionPlan = {
    ...planOf(build, [], held),
    isFeePaidByFirstOutput: true,
  };
  const floor =
    minimum +
    BigInt(CUSTODY_CONTROL_GROWTH_MARGIN_BYTES) *
      BigInt(chain.protocolParameters.coinsPerUtxoByte);
  if (held - leastFeeOf(plan, chain.protocolParameters) < floor) {
    return headroomShortfall();
  }
  const transaction = await buildWithEvaluatedBudgets({
    chain,
    funds: { selected: [], remaining: [] },
    plan: () => plan,
  });
  const controlLovelace = held - transaction.body().fee();
  if (controlLovelace < floor) return headroomShortfall();
  return {
    transaction,
    controlLovelace,
    candidates: sweptGrantsOf(build).map(({ utxo }) => utxo),
  };
};

const isInsufficientFunds = (error: unknown): boolean =>
  error instanceof CustodyBuildFailure &&
  error.reason.code === 'insufficient-funds';

/**
 * Builds an owner operation in the sponsor's collateral mode: the account
 * pays and the sponsor contributes only its shared collateral. The control
 * UTxO is spent with `Device` and recreated from the resulting state, the
 * logic its state names runs through its withdrawal, and the bound device
 * key is the only required signer. The proxy and the logic are read from
 * their parked UTxOs on a network that has them, and attached elsewhere; a
 * stake operation attaches the stake script.
 *
 * Plain funds and reserves pay first. When they cannot, an operation that
 * pays nothing out and issues no grant takes its fee from the control
 * output's headroom instead.
 */
export const buildCustodyOwnerOperation = async (
  {
    operation,
    funding,
  }: {
    operation: CustodyOwnerOperation;
    funding: CardanoCustodyCollateralFunding;
  },
  context: CustodyAccountContext,
  chain: CustodyChain,
): Promise<CardanoCustodyBuildResult> => {
  const signer = requireListedDevice(context);
  const { identity, control } = context;
  const { coinsPerUtxoByte } = chain.protocolParameters;
  const effect = await ownerEffectOf(operation, context, chain);
  checkRequestedOutputs(effect.outputs, identity, coinsPerUtxoByte);
  const logicRun = await readCustodyLogicRun(accountLogicOf(context), chain);
  const { contractVersion } = identity;

  const swept = effect.swept?.grants ?? [];
  const { issued: grant } = effect;
  const issued = grant && {
    grant,
    output: grantOutputOf(
      identity,
      grant,
      outputLovelaceFor(
        lovelace => grantOutputOf(identity, grant, lovelace),
        0n,
        coinsPerUtxoByte,
      ),
    ),
  };
  const build: OwnerBuild = {
    context,
    chain,
    effect,
    signer,
    funding,
    ...(issued && { issued }),
    minimum: controlLovelaceFor(
      { identity, state: effect.state, floor: 0n },
      coinsPerUtxoByte,
    ),
    spentAccountLovelace: swept.reduce(
      (total, { utxo: [, output] }) => total + output.value.coins,
      control[1].value.coins,
    ),
    logicRun,
    witnesses: custodyScriptWitnesses(contractVersion, chain, [
      contractVersion.accountValidator,
      logicRun.logic.script,
    ]),
  };
  const isControlPayable = effect.outputs.length === 0 && !issued;
  let paid: OwnerTransaction;
  try {
    paid = await buildPaidByFunds(build);
  } catch (error) {
    if (!isControlPayable || !isInsufficientFunds(error)) throw error;
    paid = await buildPaidByControl(build);
  }

  const { transaction } = paid;
  return finalizeCustodyBuild(
    {
      transaction,
      resolvedInputs: resolvedInputsOf(transaction, [
        control,
        ...paid.candidates,
        ...build.witnesses.referenced,
        funding.collateralUtxo,
      ]),
    },
    chain,
    {
      record: context.record,
      control: { state: effect.state, lovelace: paid.controlLovelace },
      issuedGrants: issued
        ? [{ grant: issued.grant, lovelace: issued.output.value.coins }]
        : [],
      sweptSlots: swept.map(({ grant }) => grant.slot),
      signer,
      deviceKeyHash: signer,
      outflow: {
        requested: totalValueOf(effect.outputs),
        withdrawal: withdrawnOf(build),
      },
      funding,
    },
  );
};
