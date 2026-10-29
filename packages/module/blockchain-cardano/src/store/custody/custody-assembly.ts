import { Cardano, Serialization } from '@cardano-sdk/core';
import { minAdaRequired } from '@cardano-sdk/tx-construction';
import {
  EvaluatedFeeShortfallError,
  InputSelectionError,
  InsufficientCollateralError,
  LargeFirstCoinSelector,
  TransactionBuilder,
  createInputResolver,
  outpointKey,
  referenceScriptFee,
  referenceScriptSize,
} from '@lace-contract/cardano-context';
import {
  custodyGrantAssetId,
  encodeCustodyAccountState,
  encodeCustodyGrant,
} from '@lace-lib/cardano-custody';

import { failCustodyBuild } from './build-failure';
import {
  custodyReseedOf,
  estimateWithinLimit,
  reseededExecutionUnits,
} from './custody-execution-estimate';

import type { CustodyChain } from './custody-chain';
import type { CustodyReseed } from './custody-execution-estimate';
import type * as Crypto from '@cardano-sdk/crypto';
import type { TxEvaluator } from '@cardano-sdk/tx-construction';
import type {
  CardanoCustodyBuildError,
  RedeemerExecutionUnits,
  RequiredProtocolParameters,
} from '@lace-contract/cardano-context';
import type {
  CustodyAccountIdentity,
  CustodyAccountState,
  CustodyGrant,
} from '@lace-lib/cardano-custody';

/** An input of a custody transaction, with its spend redeemer when a script locks it. */
interface CustodyInput {
  readonly utxo: Cardano.Utxo;
  readonly redeemer?: Cardano.PlutusData;
}

/** A withdrawal from a script reward account, with the redeemer that runs the script. */
export interface CustodyWithdrawal {
  readonly rewardAccount: Cardano.RewardAccount;
  readonly quantity: bigint;
  readonly redeemer: Cardano.PlutusData;
}

/** Everything one custody transaction holds before the builder balances it. */
export interface CustodyTransactionPlan {
  readonly inputs: readonly CustodyInput[];
  /**
   * UTxOs the transaction reads without spending, fully resolved: a
   * referenced control UTxO and the parked UTxOs whose reference scripts
   * witness the contract scripts the plan does not attach.
   */
  readonly referenceInputs?: readonly Cardano.Utxo[];
  /**
   * The account outputs first (the control output, then any issued grant
   * output, or the recreated grant of a grant spend), then the requested
   * outputs. The build keeps every one at its planned lovelace.
   */
  readonly outputs: readonly Cardano.TxOut[];
  /** Receives the change: the sponsor in fee mode, the account otherwise. */
  readonly changeAddress: Cardano.PaymentAddress;
  /**
   * The first output pays the fee instead of a change output: the inputs are
   * exactly what the transaction spends, and the first output takes what
   * they hold beyond the other outputs and the fee.
   */
  readonly isFeePaidByFirstOutput?: boolean;
  /** The scripts the witness set attaches. */
  readonly scripts: readonly Cardano.PlutusScript[];
  /**
   * What the plan's scripts are expected to measure together. Balancing
   * prices the fee at it, so the inputs need to cover little more than the
   * real fee.
   */
  readonly executionEstimate: Cardano.ExUnits;
  readonly requiredSigner: Crypto.Ed25519KeyHashHex;
  readonly invalidBefore?: Cardano.Slot;
  readonly invalidHereafter: Cardano.Slot;
  readonly collateral: {
    readonly utxo: Cardano.Utxo;
    readonly returnAddress: Cardano.PaymentAddress;
  };
  /** Tokens minted (positive) or burned (negative) under one policy. */
  readonly mint?: {
    readonly assets: Cardano.TokenMap;
    readonly redeemer: Cardano.PlutusData;
  };
  readonly registration?: {
    readonly stakeCredential: Cardano.Credential;
    readonly deposit: bigint;
    readonly redeemer: Cardano.PlutusData;
  };
  readonly delegation?: {
    readonly stakeCredential: Cardano.Credential;
    readonly poolId: Cardano.PoolId;
    readonly redeemer: Cardano.PlutusData;
  };
  /** At most one per reward account: the logic run, then any stake withdrawal. */
  readonly withdrawals?: readonly CustodyWithdrawal[];
  /** Carried as auxiliary data, whose hash the body commits to. */
  readonly metadata?: Cardano.TxMetadata;
}

/** The funds a build spends and the ones it may still add. */
export interface FundSelection {
  readonly selected: readonly Cardano.Utxo[];
  readonly remaining: readonly Cardano.Utxo[];
}

/**
 * The account's control output: lovelace and the state NFT only, with the
 * state encoded afresh as an inline datum.
 */
export const controlOutputOf = (
  identity: CustodyAccountIdentity,
  state: CustodyAccountState,
  lovelace: bigint,
): Cardano.TxOut => ({
  address: identity.address,
  value: {
    coins: lovelace,
    assets: new Map([[identity.stateNftAssetId, 1n]]),
  },
  datum: encodeCustodyAccountState(state),
});

/**
 * A grant UTxO at the account: lovelace and the grant's token only, with
 * the grant as an inline datum and no reference script.
 */
export const grantOutputOf = (
  identity: CustodyAccountIdentity,
  grant: CustodyGrant,
  lovelace: bigint,
): Cardano.TxOut => ({
  address: identity.address,
  value: {
    coins: lovelace,
    assets: new Map([
      [
        custodyGrantAssetId(
          {
            accountValidatorHash: identity.contractVersion.accountValidatorHash,
            stakeScriptHash: identity.stakeScriptHash,
          },
          grant.slot,
        ),
        1n,
      ],
    ]),
  },
  datum: encodeCustodyGrant(grant),
});

/**
 * The least lovelace an output holds at its own size, at least `floor`. The
 * coin's own width changes the size, so the minimum is taken until it
 * settles.
 */
export const outputLovelaceFor = (
  outputWith: (lovelace: bigint) => Cardano.TxOut,
  floor: bigint,
  coinsPerUtxoByte: number,
): bigint => {
  let lovelace = floor;
  for (;;) {
    const minimum = minAdaRequired(
      outputWith(lovelace),
      BigInt(coinsPerUtxoByte),
    );
    if (minimum <= lovelace) return lovelace;
    lovelace = minimum;
  }
};

/**
 * The lovelace a control output carrying `state` holds: at least `floor`
 * and at least the minimum for its size.
 */
export const controlLovelaceFor = (
  {
    identity,
    state,
    floor,
  }: {
    identity: CustodyAccountIdentity;
    state: CustodyAccountState;
    floor: bigint;
  },
  coinsPerUtxoByte: number,
): bigint =>
  outputLovelaceFor(
    lovelace => controlOutputOf(identity, state, lovelace),
    floor,
    coinsPerUtxoByte,
  );

/** What `units` of execution cost at the protocol's prices. */
const executionFeeOf = (
  units: Cardano.ExUnits,
  { prices }: Cardano.ProtocolParameters,
): bigint =>
  BigInt(Math.ceil(prices.memory * units.memory + prices.steps * units.steps));

/**
 * The most the builder prices a fee at before evaluation, when it seeds
 * `seed` execution units: the largest transaction's size fee plus the seed
 * at the protocol's prices. Balancing must fund that fee from the inputs
 * before evaluation lowers it.
 */
export const preEvaluationFeeBound = (
  parameters: Cardano.ProtocolParameters,
  seed: Cardano.ExUnits,
): bigint =>
  BigInt(parameters.minFeeConstant) +
  BigInt(parameters.minFeeCoefficient) * BigInt(parameters.maxTxSize) +
  executionFeeOf(seed, parameters);

/**
 * The least fee a plan's transaction pays, whatever its body and its
 * scripts measure: the size fee of the scripts it attaches and the
 * reference-script fee of the scripts its reference inputs carry.
 */
export const leastFeeOf = (
  plan: Pick<CustodyTransactionPlan, 'referenceInputs' | 'scripts'>,
  parameters: Cardano.ProtocolParameters,
): bigint => {
  const references = plan.referenceInputs ?? [];
  return (
    BigInt(parameters.minFeeConstant) +
    BigInt(parameters.minFeeCoefficient) *
      BigInt(
        plan.scripts.reduce(
          (bytes, script) => bytes + script.bytes.length / 2,
          0,
        ),
      ) +
    referenceScriptFee(
      referenceScriptSize(
        references.map(([txIn]) => txIn),
        references,
      ),
      parameters,
    )
  );
};

/**
 * The fee a plan is expected to balance at before evaluation, less the
 * bytes of its body beyond its scripts: its least fee and its seed
 * execution units at the protocol's prices. Fund selection aims at it; a
 * selection that falls short gains the next fund UTxO when balancing
 * fails, before any evaluation.
 */
export const plannedFeeOf = (
  plan: Pick<
    CustodyTransactionPlan,
    'executionEstimate' | 'referenceInputs' | 'scripts'
  >,
  parameters: Cardano.ProtocolParameters,
): bigint =>
  leastFeeOf(plan, parameters) +
  executionFeeOf(
    estimateWithinLimit(
      plan.executionEstimate,
      parameters.maxExecutionUnitsPerTransaction,
    ),
    parameters,
  );

const quantityOf = (utxo: Cardano.Utxo, assetId: Cardano.AssetId): bigint =>
  utxo[1].value.assets?.get(assetId) ?? 0n;

const byCoinsDescending = (a: Cardano.Utxo, b: Cardano.Utxo): number =>
  a[1].value.coins === b[1].value.coins
    ? 0
    : a[1].value.coins > b[1].value.coins
    ? -1
    : 1;

/**
 * Large-First selection over fund UTxOs: first the UTxOs holding most of
 * each requested asset, then the largest by lovelace, with `reserves` after
 * every fund. When the UTxOs cannot cover the target, everything is
 * selected, `covers` is false and the build decides: the target holds only
 * an estimate of the fee.
 */
export const selectFunds = (
  funds: readonly Cardano.Utxo[],
  target: Cardano.Value,
  reserves: readonly Cardano.Utxo[] = [],
): FundSelection & { readonly covers: boolean } => {
  const remaining = [
    ...[...funds].sort(byCoinsDescending),
    ...[...reserves].sort(byCoinsDescending),
  ];
  const selected: Cardano.Utxo[] = [];
  const take = (utxo: Cardano.Utxo) => {
    remaining.splice(remaining.indexOf(utxo), 1);
    selected.push(utxo);
  };
  for (const [assetId, quantity] of target.assets ?? []) {
    let covered = selected.reduce(
      (sum, utxo) => sum + quantityOf(utxo, assetId),
      0n,
    );
    while (covered < quantity) {
      // The first UTxO holding the most of the asset, so a fund comes
      // before a reserve holding as much.
      const richest = remaining.reduce<Cardano.Utxo | undefined>(
        (best, utxo) =>
          !best || quantityOf(utxo, assetId) > quantityOf(best, assetId)
            ? utxo
            : best,
        undefined,
      );
      if (!richest || quantityOf(richest, assetId) === 0n) {
        return {
          selected: [...selected, ...remaining],
          remaining: [],
          covers: false,
        };
      }
      take(richest);
      covered += quantityOf(richest, assetId);
    }
  }
  let lovelace = selected.reduce(
    (sum, [, output]) => sum + output.value.coins,
    0n,
  );
  while (lovelace < target.coins && remaining.length > 0) {
    const [next] = remaining;
    take(next);
    lovelace += next[1].value.coins;
  }
  return { selected, remaining, covers: lovelace >= target.coins };
};

/** The sum of outputs' values. */
export const totalValueOf = (
  outputs: readonly Cardano.TxOut[],
): Required<Cardano.Value> => {
  const assets = new Map<Cardano.AssetId, bigint>();
  let coins = 0n;
  for (const { value } of outputs) {
    coins += value.coins;
    for (const [assetId, quantity] of value.assets ?? []) {
      assets.set(assetId, (assets.get(assetId) ?? 0n) + quantity);
    }
  }
  return { coins, assets };
};

/**
 * The funds can no longer pay for the transaction; one more fund UTxO may.
 * Once none is left, the build fails with `exhausted`, or with
 * `insufficient-funds` when it is absent.
 */
export class FundShortfall extends Error {
  public constructor(
    message: string,
    readonly exhausted?: CardanoCustodyBuildError,
  ) {
    super(message);
    this.name = 'FundShortfall';
  }
}

/**
 * The evaluated transaction needs a larger fee than its plan balanced at:
 * the scripts measured above the execution estimate. Building again seeded
 * from `reseed` funds it.
 */
export class ExecutionEstimateShortfall extends Error {
  public constructor(readonly reseed: CustodyReseed) {
    super('The scripts measure above the execution estimate');
    this.name = 'ExecutionEstimateShortfall';
  }
}

/**
 * The transaction needs a fee above the most it may be balanced at. `fee`
 * is the fee it needs, or, when even the fee of its body without execution
 * is above that most, that fee. `evaluatedRedeemers` holds the budgets the
 * fee was priced at when an evaluation priced it.
 */
export class MaxBalancedFeeExceeded extends Error {
  public constructor(
    readonly fee: bigint,
    readonly evaluatedRedeemers: readonly Cardano.Redeemer[] = [],
  ) {
    super(
      `The transaction needs a fee of ${fee} lovelace, above the most it may be balanced at`,
    );
    this.name = 'MaxBalancedFeeExceeded';
  }
}

/** The builder balanced a draft above the most fee allowed; nothing evaluated it. */
class DraftFeeAboveMax extends Error {
  public constructor(readonly fee: bigint) {
    super(`The draft is balanced at ${fee} lovelace, above the most allowed`);
    this.name = 'DraftFeeAboveMax';
  }
}

/** Stops a draft balanced above `maxFee` before the provider evaluates it. */
const withMaxDraftFee = (
  evaluator: TxEvaluator,
  maxFee: bigint,
): TxEvaluator => ({
  evaluate: async (tx, resolvedInputs) => {
    if (tx.body.fee > maxFee) throw new DraftFeeAboveMax(tx.body.fee);
    return evaluator.evaluate(tx, resolvedInputs);
  },
});

/**
 * `seed` scaled so that its execution costs at most `fee` at the protocol's
 * prices, which are linear in the units.
 */
const seedPricedAt = (
  seed: Cardano.ExUnits,
  fee: bigint,
  parameters: Cardano.ProtocolParameters,
): Cardano.ExUnits => {
  const seedFee = executionFeeOf(seed, parameters);
  if (seedFee === 0n) return seed;
  const scale = Number(fee) / Number(seedFee);
  return {
    memory: Math.floor(seed.memory * scale),
    steps: Math.floor(seed.steps * scale),
  };
};

/**
 * Seed changes that keep a draft within the most fee it may be balanced
 * at. A draft lands within a few bytes of the fee its seed aims at, so one
 * change usually suffices.
 */
const MAX_DRAFT_FEE_ROUNDS = 4;

/**
 * The plain change output a collateral-mode build returns to the account:
 * the largest output at `address` after the planned ones, without a datum.
 * -1 when there is none.
 */
export const changeIndexOf = (
  outputs: readonly Cardano.TxOut[],
  address: Cardano.PaymentAddress,
  plannedCount: number,
): number => {
  let changeIndex = -1;
  for (const [index, output] of outputs.entries()) {
    const isChange =
      index >= plannedCount &&
      output.address === address &&
      output.datum === undefined &&
      output.datumHash === undefined &&
      (changeIndex < 0 ||
        output.value.coins > outputs[changeIndex].value.coins);
    if (isChange) changeIndex = index;
  }
  return changeIndex;
};

const withBody = (
  transaction: Serialization.Transaction,
  fields: Partial<Cardano.TxBody>,
): Serialization.Transaction => {
  const core = transaction.toCore();
  return Serialization.Transaction.fromCore({
    ...core,
    body: { ...core.body, ...fields },
  });
};

const hasGrown = (
  rewritten: Serialization.Transaction,
  transaction: Serialization.Transaction,
): boolean =>
  rewritten.body().toCbor().length > transaction.body().toCbor().length;

const grewBody = (): never =>
  failCustodyBuild({
    code: 'build-failed',
    message: 'Moving lovelace between outputs grew the body',
  });

/**
 * The transaction with `outputs` in place of its own. The fee was priced
 * for the body's size, so the body must not grow, as it would when a coin
 * crosses a CBOR width boundary. A smaller body keeps a fee that also pays
 * for the bytes it dropped.
 */
export const withOutputs = (
  transaction: Serialization.Transaction,
  outputs: Cardano.TxOut[],
): Serialization.Transaction => {
  const rewritten = withBody(transaction, { outputs });
  return hasGrown(rewritten, transaction) ? grewBody() : rewritten;
};

/** `output` holding `coins` lovelace. */
export const withCoins = (
  output: Cardano.TxOut,
  coins: bigint,
): Cardano.TxOut => ({ ...output, value: { ...output.value, coins } });

/**
 * The transaction with `outputs` in place of its own and its fee raised by
 * `excess`. The declared collateral rises with the fee, taken from the
 * collateral return, which must keep its minimum ADA.
 */
const withExcessInFee = (
  transaction: Serialization.Transaction,
  { outputs, excess }: { outputs: Cardano.TxOut[]; excess: bigint },
  {
    collateralPercentage,
    coinsPerUtxoByte,
  }: Pick<
    Cardano.ProtocolParameters,
    'coinsPerUtxoByte' | 'collateralPercentage'
  >,
): Serialization.Transaction => {
  const { fee, totalCollateral, collateralReturn } = transaction
    .body()
    .toCore();
  const raised = fee + excess;
  const required = (raised * BigInt(collateralPercentage) + 99n) / 100n;
  let collateral: Partial<Cardano.TxBody> = {};
  if (totalCollateral !== undefined && totalCollateral < required) {
    const returned =
      collateralReturn &&
      withCoins(
        collateralReturn,
        collateralReturn.value.coins - (required - totalCollateral),
      );
    if (
      !returned ||
      returned.value.coins < minAdaRequired(returned, BigInt(coinsPerUtxoByte))
    ) {
      return failCustodyBuild({
        code: 'collateral-insufficient',
        message: `The collateral cannot cover a fee of ${raised} lovelace`,
      });
    }
    collateral = { totalCollateral: required, collateralReturn: returned };
  }
  const rewritten = withBody(transaction, {
    outputs,
    fee: raised,
    ...collateral,
  });
  return hasGrown(rewritten, transaction) ? grewBody() : rewritten;
};

/**
 * Moves the lovelace the builder's fee correction credited to a planned
 * output back to the change. The correction refunds the largest output at
 * the change address, and in collateral mode the planned account outputs
 * share that address: a control output would lock the lovelace for the
 * account's life, and a grant output must hold what was planned.
 *
 * The change takes it unless that grows the body the fee was priced for,
 * which happens only when its lovelace crosses 2^32; the fee then keeps
 * the saving instead.
 *
 * @throws `FundShortfall` when no change output exists to take it
 */
export const restorePlannedOutputs = (
  transaction: Serialization.Transaction,
  plan: Pick<CustodyTransactionPlan, 'changeAddress' | 'outputs'>,
  parameters: Pick<
    Cardano.ProtocolParameters,
    'coinsPerUtxoByte' | 'collateralPercentage'
  >,
): Serialization.Transaction => {
  const outputs = [...transaction.body().toCore().outputs];
  let excess = 0n;
  for (const [index, planned] of plan.outputs.entries()) {
    const credited = outputs[index].value.coins - planned.value.coins;
    if (credited > 0n) {
      excess += credited;
      outputs[index] = withCoins(outputs[index], planned.value.coins);
    }
  }
  if (excess === 0n) return transaction;
  const changeIndex = changeIndexOf(
    outputs,
    plan.changeAddress,
    plan.outputs.length,
  );
  if (changeIndex < 0) {
    throw new FundShortfall('No change output to return the fee saving to');
  }
  const credited = [...outputs];
  credited[changeIndex] = withCoins(
    outputs[changeIndex],
    outputs[changeIndex].value.coins + excess,
  );
  const rewritten = withBody(transaction, { outputs: credited });
  return hasGrown(rewritten, transaction)
    ? withExcessInFee(transaction, { outputs, excess }, parameters)
    : rewritten;
};

type CoinSelector = Parameters<TransactionBuilder['useCoinSelector']>[0];

/**
 * The lovelace the first output of a plan whose first output pays the fee
 * must hold to balance at the fee the builder settled on.
 */
class FirstOutputCoinsMissed extends Error {
  public constructor(readonly coins: bigint) {
    super(`The first output must hold ${coins} lovelace to balance`);
    this.name = 'FirstOutputCoinsMissed';
  }
}

/**
 * Coin selection for a plan whose first output pays the fee: it spends
 * exactly the preselected inputs and returns no change. The balancer prices
 * each target and asks again until the fee settles; when the settled target
 * still misses the inputs, the build stops with the first output's lovelace
 * that meets it.
 */
const firstOutputPaysSelector = (firstOutputCoins: bigint): CoinSelector => {
  let previousTarget: bigint | undefined;
  return {
    select: ({ preSelectedUtxo = [], targetValue }) => {
      const surplus =
        preSelectedUtxo.reduce(
          (total, [, output]) => total + output.value.coins,
          0n,
        ) - targetValue.coins;
      if (surplus !== 0n && previousTarget === targetValue.coins) {
        throw new FirstOutputCoinsMissed(firstOutputCoins + surplus);
      }
      previousTarget = targetValue.coins;
      return {
        selection: [...preSelectedUtxo],
        remaining: [],
        changeOutputs: [],
      };
    },
  };
};

/** How one plan is balanced and priced. */
interface PlanBuildOptions {
  readonly evaluator: TxEvaluator;
  readonly coinSelector: CoinSelector;
  /** The execution units balancing prices the fee at. */
  readonly seed: Cardano.ExUnits;
}

/**
 * Builds and balances one plan with the shared `TransactionBuilder`. Every
 * input is preselected, so balancing never adds an input without its
 * redeemer; the collateral is the sponsor's shared UTxO, returned to the
 * sponsor with total collateral set.
 *
 * @throws `FundShortfall` when the inputs cannot pay for the transaction
 * @throws `EvaluatedFeeShortfallError` when the scripts measure above `seed`
 *   by more than the balanced fee covers
 */
const buildPlan = async (
  plan: CustodyTransactionPlan,
  chain: CustodyChain,
  { evaluator, coinSelector, seed }: PlanBuildOptions,
): Promise<Serialization.Transaction> => {
  const parameters = chain.protocolParameters;
  const referenceInputs = plan.referenceInputs ?? [];
  const builder = new TransactionBuilder(
    chain.chainId.networkMagic as Cardano.NetworkMagics,
    // Full protocol parameters are a structural superset of the pick.
    parameters as RequiredProtocolParameters,
  )
    .setChangeAddress(plan.changeAddress)
    .useCoinSelector(coinSelector)
    .setCollateralUtxos([plan.collateral.utxo])
    .setCollateralChangeAddress(plan.collateral.returnAddress)
    .setPlutusContext({
      costModels: parameters.costModels,
      txEvaluator: evaluator,
      inputResolver: createInputResolver([
        ...plan.inputs.map(({ utxo }) => utxo),
        plan.collateral.utxo,
      ]),
      executionUnitsEstimate: seed,
    })
    .setValidityInterval({
      ...(plan.invalidBefore !== undefined && {
        invalidBefore: plan.invalidBefore,
      }),
      invalidHereafter: plan.invalidHereafter,
    })
    .addRequiredSigner(plan.requiredSigner);
  for (const { utxo, redeemer } of plan.inputs) {
    builder.addInput(utxo, redeemer ? { redeemer } : undefined);
  }
  for (const utxo of referenceInputs) builder.addReferenceInput(utxo);
  for (const output of plan.outputs) builder.addOutput(output);
  for (const script of plan.scripts) builder.attachScript(script);
  if (plan.mint) builder.mintAssets(plan.mint.assets, plan.mint.redeemer);
  if (plan.registration) {
    const { stakeCredential, deposit, redeemer } = plan.registration;
    builder.addNewStakeAddressCertificate(stakeCredential, deposit, {
      redeemer,
    });
  }
  if (plan.delegation) {
    const { poolId, stakeCredential, redeemer } = plan.delegation;
    builder.addStakeDelegationCertificate(poolId, stakeCredential, {
      redeemer,
    });
  }
  for (const { rewardAccount, quantity, redeemer } of plan.withdrawals ?? []) {
    builder.addScriptWithdrawal(rewardAccount, quantity, redeemer);
  }
  for (const [label, metadatum] of plan.metadata ?? []) {
    builder.setMetadata(label, metadatum);
  }
  try {
    return await builder.build();
  } catch (error) {
    if (error instanceof InputSelectionError) {
      throw new FundShortfall(error.message);
    }
    if (error instanceof InsufficientCollateralError) {
      return failCustodyBuild({
        code: 'collateral-insufficient',
        message: error.message,
      });
    }
    throw error;
  }
};

/**
 * Rounds of a plan whose first output pays the fee. The first round finds
 * the fee the builder settles on, the second lands on it; a third covers a
 * coin that crossed a CBOR width between them.
 */
const MAX_FIRST_OUTPUT_ROUNDS = 3;

/**
 * Builds a plan whose first output pays the fee. The builder balances at a
 * fee priced for the seed execution units, so the first output is set to
 * what the inputs hold beyond that fee and the other outputs; once
 * evaluation lowers the fee, the builder refunds the saving to it, the
 * largest output at the change address.
 *
 * @throws `FundShortfall` when the inputs cannot pay the fee the builder
 *   balances at
 */
const buildFeePaidByFirstOutput = async (
  plan: CustodyTransactionPlan,
  chain: CustodyChain,
  { evaluator, seed }: Omit<PlanBuildOptions, 'coinSelector'>,
): Promise<Serialization.Transaction> => {
  const [first, ...rest] = plan.outputs;
  let coins = first.value.coins;
  for (let round = 1; ; round++) {
    try {
      return await buildPlan(
        { ...plan, outputs: [withCoins(first, coins), ...rest] },
        chain,
        { evaluator, coinSelector: firstOutputPaysSelector(coins), seed },
      );
    } catch (error) {
      if (
        !(error instanceof FirstOutputCoinsMissed) ||
        round >= MAX_FIRST_OUTPUT_ROUNDS
      ) {
        throw error;
      }
      if (error.coins < 0n) {
        throw new FundShortfall(
          'The first output cannot pay the fee the builder balances at',
        );
      }
      coins = error.coins;
    }
  }
};

/** How many redeemers a plan's transaction carries. */
const redeemerCountOf = (plan: CustodyTransactionPlan): number =>
  plan.inputs.filter(({ redeemer }) => redeemer !== undefined).length +
  [plan.mint, plan.registration, plan.delegation].filter(
    part => part !== undefined,
  ).length +
  (plan.withdrawals?.length ?? 0);

export interface AssembleWithFundsParams {
  readonly chain: CustodyChain;
  readonly funds: FundSelection;
  readonly plan: (funds: readonly Cardano.Utxo[]) => CustodyTransactionPlan;
  readonly evaluator: (funds: readonly Cardano.Utxo[]) => TxEvaluator;
  /**
   * What an earlier build of these plans measured above its seed; each plan
   * is then seeded from it. Absent, a plan is seeded at its execution
   * estimate within the per-transaction limit.
   */
  readonly reseed?: CustodyReseed;
  /** Refuses a fund set before it is built, such as one over an input cap. */
  readonly checkFunds?: (funds: readonly Cardano.Utxo[]) => void;
  /**
   * The most fee the transaction may be balanced at. The provider
   * evaluates the balanced draft, and a grant spend's logic counts the
   * draft's fee against the caps as it counts the final fee, so the draft
   * must fit them too. A draft above it is not evaluated: the seed is
   * lowered until the draft fits.
   */
  readonly maxBalancedFee?: bigint;
  /**
   * Rewrites the balanced transaction once its fee is final, such as to move
   * change into the control output.
   *
   * @throws `FundShortfall` when the change cannot pay for the rewrite
   */
  readonly settle?: (
    transaction: Serialization.Transaction,
  ) => Serialization.Transaction;
}

/**
 * Builds a plan, adding the next fund UTxO each time the selected ones
 * cannot pay for it. Once none is left, it refuses with the shortfall's
 * reason, `insufficient-funds` by default. Planned outputs keep their
 * lovelace unless the first output pays the fee.
 *
 * With `maxBalancedFee`, a draft balanced above it gets a seed priced at
 * that much less, and an evaluated transaction that needs more than its
 * draft's fee gets a seed priced at what it needs, while that fits.
 *
 * @throws `ExecutionEstimateShortfall` when the scripts measure above the
 *   seed by more than the balanced fee covers
 * @throws `MaxBalancedFeeExceeded` when the transaction needs a fee above
 *   `maxBalancedFee`
 */
export const assembleWithFunds = async ({
  chain,
  funds,
  plan,
  evaluator,
  reseed,
  checkFunds,
  settle,
  maxBalancedFee,
}: AssembleWithFundsParams): Promise<{
  transaction: Serialization.Transaction;
  funds: FundSelection;
}> => {
  const parameters = chain.protocolParameters;
  let { selected, remaining } = funds;
  // What the seed's execution may cost so the draft stays within
  // `maxBalancedFee`; the full seed while undefined.
  let seedFeeLimit: bigint | undefined;
  let draftFeeRounds = 0;
  for (;;) {
    checkFunds?.(selected);
    const planned = plan(selected);
    const fullSeed = reseed
      ? reseededExecutionUnits(reseed, redeemerCountOf(planned))
      : estimateWithinLimit(
          planned.executionEstimate,
          parameters.maxExecutionUnitsPerTransaction,
        );
    const seed =
      seedFeeLimit === undefined
        ? fullSeed
        : seedPricedAt(fullSeed, seedFeeLimit, parameters);
    const planEvaluator =
      maxBalancedFee === undefined
        ? evaluator(selected)
        : withMaxDraftFee(evaluator(selected), maxBalancedFee);
    try {
      const built = planned.isFeePaidByFirstOutput
        ? await buildFeePaidByFirstOutput(planned, chain, {
            evaluator: planEvaluator,
            seed,
          })
        : restorePlannedOutputs(
            await buildPlan(planned, chain, {
              evaluator: planEvaluator,
              // Every input is preselected; Large-First keeps the change in
              // one output and the build deterministic.
              coinSelector: new LargeFirstCoinSelector(),
              seed,
            }),
            planned,
            parameters,
          );
      return {
        transaction: settle ? settle(built) : built,
        funds: { selected, remaining },
      };
    } catch (error) {
      if (error instanceof DraftFeeAboveMax && maxBalancedFee !== undefined) {
        const seedFee = executionFeeOf(seed, parameters);
        const limit = seedFee - (error.fee - maxBalancedFee);
        // Without execution the draft is still above the most.
        if (limit < 0n) throw new MaxBalancedFeeExceeded(error.fee - seedFee);
        if (++draftFeeRounds > MAX_DRAFT_FEE_ROUNDS) {
          throw new MaxBalancedFeeExceeded(error.fee);
        }
        seedFeeLimit = limit;
        continue;
      }
      if (error instanceof EvaluatedFeeShortfallError) {
        if (
          maxBalancedFee !== undefined &&
          error.requiredFee > maxBalancedFee
        ) {
          throw new MaxBalancedFeeExceeded(
            error.requiredFee,
            error.evaluatedRedeemers,
          );
        }
        // A seed lowered for the most fee may undershoot what the scripts
        // measure; price it at what they need, which still fits.
        if (
          seedFeeLimit !== undefined &&
          ++draftFeeRounds <= MAX_DRAFT_FEE_ROUNDS
        ) {
          seedFeeLimit =
            executionFeeOf(seed, parameters) +
            error.requiredFee -
            error.balancedFee;
          continue;
        }
        throw new ExecutionEstimateShortfall(
          custodyReseedOf(
            error.evaluatedRedeemers.map(
              ({ executionUnits }) => executionUnits,
            ),
            seed,
          ),
        );
      }
      if (!(error instanceof FundShortfall)) throw error;
      if (remaining.length === 0) {
        return failCustodyBuild(
          error.exhausted ?? {
            code: 'insufficient-funds',
            message: error.message,
          },
        );
      }
      selected = [...selected, remaining[0]];
      remaining = remaining.slice(1);
    }
  }
};

const EVALUATION_MARGIN_PERCENT = 10n;

/**
 * Pads a measured budget. The fee correction after evaluation changes the
 * body the scripts see, so the final transaction is not the one measured.
 */
export const withEvaluationMargin = ({
  memory,
  steps,
}: Cardano.ExUnits): Cardano.ExUnits => ({
  memory: Number(
    (BigInt(memory) * (100n + EVALUATION_MARGIN_PERCENT) + 99n) / 100n,
  ),
  steps: Number(
    (BigInt(steps) * (100n + EVALUATION_MARGIN_PERCENT) + 99n) / 100n,
  ),
});

export const atLeast = (
  budget: Cardano.ExUnits,
  floor: Cardano.ExUnits | undefined,
): Cardano.ExUnits =>
  floor
    ? {
        memory: Math.max(budget.memory, floor.memory),
        steps: Math.max(budget.steps, floor.steps),
      }
    : budget;

export const redeemerKey = ({
  purpose,
  index,
}: {
  purpose: Cardano.RedeemerPurpose;
  index: number;
}): string => `${purpose}:${index}`;

/** A redeemer the provider did not evaluate fails, as it does for the sponsor service. */
export const unmeasured = ({
  purpose,
  index,
}: {
  purpose: Cardano.RedeemerPurpose;
  index: number;
}): never =>
  failCustodyBuild({
    code: 'script-evaluation-failed',
    message: `The provider did not evaluate redeemer ${purpose}#${index}`,
  });

/**
 * Every redeemer whose declared budget is below what the provider measures,
 * with the measurement.
 */
export const findUnderDeclaredBudgets = (
  transaction: Serialization.Transaction,
  measured: readonly RedeemerExecutionUnits[],
): RedeemerExecutionUnits[] => {
  const declared = transaction.witnessSet().redeemers()?.toCore() ?? [];
  return declared.flatMap(({ purpose, index, executionUnits }) => {
    const measurement =
      measured.find(
        entry => entry.purpose === purpose && entry.index === index,
      ) ?? unmeasured({ purpose, index });
    return measurement.budget.memory > executionUnits.memory ||
      measurement.budget.steps > executionUnits.steps
      ? [measurement]
      : [];
  });
};

/**
 * The outputs a transaction's inputs, reference inputs and collateral
 * resolve to, in that order, from the UTxOs the build chose them from.
 */
export const resolvedInputsOf = (
  transaction: Serialization.Transaction,
  candidates: readonly Cardano.Utxo[],
): Cardano.Utxo[] => {
  const body = transaction.body().toCore();
  const byOutpoint = new Map(
    candidates.map(utxo => [outpointKey(utxo[0]), utxo] as const),
  );
  return [
    ...body.inputs,
    ...(body.referenceInputs ?? []),
    ...(body.collaterals ?? []),
  ]
    .map(input => byOutpoint.get(outpointKey(input)))
    .filter((utxo): utxo is Cardano.Utxo => utxo !== undefined);
};

/** A lovelace amount whose CBOR width every change output reaches. */
const CHANGE_COIN_WIDTH_PROBE = 1_000_000n;

/** The minimum ADA of a lovelace-only change output at an address. */
export const changeReserveAt = (
  address: Cardano.PaymentAddress,
  coinsPerUtxoByte: number,
): bigint =>
  minAdaRequired(
    { address, value: { coins: CHANGE_COIN_WIDTH_PROBE } },
    BigInt(coinsPerUtxoByte),
  );

export const scriptCredentialOf = (
  hash: Crypto.Hash28ByteBase16,
): Cardano.Credential => ({ type: Cardano.CredentialType.ScriptHash, hash });
