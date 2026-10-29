import {
  Cardano,
  Serialization,
  coalesceValueQuantities,
  setInConwayEra,
} from '@cardano-sdk/core';
import { minAdaRequired } from '@cardano-sdk/tx-construction';

import { resolveSlotNo } from '../common/time';
import { LargeFirstCoinSelector } from '../input-selection/LargeFirstCoinSelector';
import { RoundRobinRandomCoinSelector } from '../input-selection/RoundRobinRandomCoinSelector';

import {
  balanceTransaction,
  correctFeeAfterEvaluation,
  type CollateralBodyFields,
} from './balancing';
import { referenceScriptFee, referenceScriptSize } from './reference-scripts';
import { computeConwayScriptDataHash } from './script-data-hash';

import type { CoinSelector } from '../input-selection/types';
import type { RequiredProtocolParameters } from '../types';
import type * as Crypto from '@cardano-sdk/crypto';
import type { TxEvaluator } from '@cardano-sdk/tx-construction';

/** Script-unlock witness data for spending a UTxO that sits at a script address. */
export interface ScriptInputProps {
  redeemer: Cardano.PlutusData;
  /** Inline datum is read from the UTxO; supply only when the datum is provided by hash. */
  datum?: Cardano.PlutusData;
}

/**
 * Script witness data for a certificate whose stake credential is a script
 * hash. The script itself is attached separately with `attachScript`.
 */
interface ScriptCertificateProps {
  /** Redeemer for the certificate (Conway `publish`) purpose. */
  redeemer: Cardano.PlutusData;
}

/**
 * The Plutus context the builder needs to evaluate redeemer execution units and
 * compute the script-data-hash. Only required when the transaction carries
 * Plutus scripts; pure-payment / certificate transactions never touch it.
 */
export interface PlutusContext {
  /**
   * FULL protocol cost models (incl. the Plutus V3 cost model). The
   * script-data-hash is computed over ONLY the language views of the scripts
   * actually attached — a stray V1/V2 view would make the node's recomputed
   * hash diverge.
   */
  costModels: Cardano.CostModels;
  /**
   * Computes redeemer execution units. Supply a provider-backed evaluator
   * (Ogmios / Blockfrost `evaluate`) for tight fees, or a fixed-budget
   * evaluator for a deterministic, network-free build.
   */
  txEvaluator: TxEvaluator;
  /**
   * Resolves a `TxIn` to its `TxOut`. Required so the builder can resolve
   * script inputs (and any input not in `availableUtxos`) when serialising and
   * evaluating the transaction.
   */
  inputResolver: Cardano.InputResolver;
  /**
   * The execution units the caller expects every redeemer together to
   * measure. Balancing then prices the fee, and the collateral reservation,
   * at this estimate instead of the per-transaction maximum, so the inputs
   * need to cover little more than the real fee. The fee is linear in the
   * total units, so one total serves every redeemer.
   *
   * The fee is never raised after evaluation: when the evaluated units need
   * more fee than balancing funded, {@link TransactionBuilder.build} fails with
   * `EvaluatedFeeShortfallError`, and the caller rebuilds at a larger
   * estimate. Without an estimate the builder prices the per-transaction
   * maximum, which no valid transaction exceeds.
   */
  executionUnitsEstimate?: Cardano.ExUnits;
}

/**
 * Per-TX ex-units budget used to SEED the witness before balancing — split
 * across redeemers by `seedRedeemers` — so the balancer's `minFee` prices
 * script execution, unless the {@link PlutusContext} gives an estimate. The
 * injected evaluator replaces the seeds with concrete budgets after
 * balancing, before the script-data-hash is computed. A generous figure (the
 * Plutus V3 mainnet per-tx max) is safe here: it only inflates the
 * pre-balance fee estimate, which the evaluator corrects.
 */
const SEED_EX_UNITS: Cardano.ExUnits = {
  memory: 14_000_000,
  steps: 10_000_000_000,
};

/**
 * 32-byte zero placeholder for `scriptDataHash` written into the tx body
 * before balancing starts, so that `minFee` accounts for the 35-byte CBOR
 * field during fee estimation. Replaced by the real hash in finalizePlutusTx.
 */
const DUMMY_SCRIPT_INTEGRITY_HASH = '0'.repeat(64) as Crypto.Hash32ByteBase16;

/**
 * The reward-account payment credential hash, used to canonically order script
 * withdrawals (mirrors `@cardano-sdk/tx-construction`'s `rewardAccountCredential`).
 */
const rewardAccountCredentialHash = (
  rewardAccount: Cardano.RewardAccount,
): string =>
  Cardano.Address.fromBech32(rewardAccount).asReward()?.getPaymentCredential()
    .hash ?? '';

/** Hex comparator matching `@cardano-sdk/tx-construction`'s `compareHex`. */
const compareHex = (a: string, b: string): number =>
  a === b ? 0 : a < b ? -1 : 1;

/**
 * Fallback collateral amount (5 ADA), used when the fee or the
 * collateralPercentage protocol parameter is 0 and the proportional
 * `ceil(fee * collateralPercentage / 100)` cannot be derived.
 */
const COLLATERAL_COVERAGE_TARGET = 5_000_000n;

/**
 * Thrown when the available collateral UTxOs cannot fund the required
 * collateral and still leave a return output that meets the min-ADA rule.
 */
export class InsufficientCollateralError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InsufficientCollateralError';
  }
}

const utxoRefKey = (utxo: Cardano.Utxo): string =>
  `${utxo[0].txId}#${utxo[0].index}`;

/**
 * Builds Cardano transactions: transfers, certificates and, with a
 * {@link PlutusContext}, Plutus script transactions. `build()` balances the
 * transaction, evaluates the execution units of any scripts it runs and
 * resolves with it unsigned.
 *
 * Its parts are inputs, reference inputs, outputs and certificates and, for
 * Plutus smart-contract spends, mints, script spends, script certificates and
 * script withdrawals with their redeemers, collateral and required signers.
 */
export class TransactionBuilder {
  private readonly params: RequiredProtocolParameters;
  private readonly transaction: Serialization.Transaction;
  private readonly preSelectedUtxos: Cardano.Utxo[] = [];
  private readonly referenceUtxos: Cardano.Utxo[] = [];
  private readonly certificates: Cardano.Certificate[] = [];
  private readonly withdrawals: Map<Cardano.RewardAccount, Cardano.Lovelace> =
    new Map();
  private coinSelector: CoinSelector = new RoundRobinRandomCoinSelector();
  private changeAddress?: Cardano.PaymentAddress;
  private availableUtxos: Cardano.Utxo[] = [];
  private networkMagic: Cardano.NetworkMagics;

  // --- Plutus state ---------------------------------------------------------
  private plutusContext?: PlutusContext;
  private readonly scripts: Cardano.Script[] = [];
  private readonly datums: Cardano.PlutusData[] = [];
  private readonly scriptVersions = new Set<Cardano.PlutusLanguageVersion>();
  private readonly requiredSigners = new Set<Crypto.Ed25519KeyHashHex>();
  private mint?: Cardano.TokenMap;
  /** Spend redeemers keyed by `${txId}#${index}` (canonical index assigned at build). */
  private readonly spendRedeemers = new Map<string, Cardano.PlutusData>();
  /** Mint redeemers keyed by PolicyId (canonical index assigned at build). */
  private readonly mintRedeemers = new Map<
    Cardano.PolicyId,
    Cardano.PlutusData
  >();
  /** Withdrawal redeemers keyed by RewardAccount (canonical index assigned at build). */
  private readonly withdrawalRedeemers = new Map<
    Cardano.RewardAccount,
    Cardano.PlutusData
  >();
  /** Certificate redeemers keyed by the certificate entry in `certificates`. */
  private readonly certificateRedeemers = new Map<
    Cardano.Certificate,
    Cardano.PlutusData
  >();
  private collateralUtxos: Cardano.Utxo[] = [];
  private collateralReturnAddress?: Cardano.PaymentAddress;
  private validityInterval?: Cardano.ValidityInterval;

  /**
   * Creates a new {@link TransactionBuilder}.
   *
   * Initializes an empty transaction body (no inputs/outputs, fee `0n`),
   * and sets Conway era mode for `@cardano-sdk/core` serialization.
   *
   * @param networkMagic - Cardano network magic (e.g. `Mainnet`, `Preprod`, `Preview`).
   * @param params - Protocol parameters to be used during balancing and fee/min-ADA calculations.
   */
  public constructor(
    networkMagic: Cardano.NetworkMagics,
    params: RequiredProtocolParameters,
  ) {
    setInConwayEra(true);
    this.params = params;
    this.transaction = new Serialization.Transaction(
      new Serialization.TransactionBody(
        Serialization.CborSet.fromCore(
          [],
          Serialization.TransactionInput.fromCore,
        ),
        [],
        0n,
        undefined,
      ),
      Serialization.TransactionWitnessSet.fromCore({ signatures: new Map() }),
    );
    this.networkMagic = networkMagic;
  }

  /**
   * Sets the change (return) address used by the balancer when creating a change output.
   *
   * @param address - Bech32 payment address for change.
   * @returns `this` for fluent chaining.
   */
  public setChangeAddress(address: Cardano.PaymentAddress): TransactionBuilder {
    this.changeAddress = address;
    return this;
  }

  /**
   * Replaces the coin selection strategy.
   *
   * Balancing keeps a deterministic {@link LargeFirstCoinSelector} fallback:
   * when the supplied selector fails, balancing is retried once with
   * Large-First. The fallback is omitted when the supplied selector is itself
   * Large-First, as retrying the same deterministic strategy cannot succeed.
   *
   * @param selector - A {@link CoinSelector} implementation.
   * @returns `this` for fluent chaining.
   */
  public useCoinSelector(selector: CoinSelector): TransactionBuilder {
    this.coinSelector = selector;
    return this;
  }

  /**
   * Sets the network on the transaction body (Mainnet/Testnet) and updates internal `networkMagic`.
   *
   * @param networkMagic - Cardano network magic.
   * @returns `this` for fluent chaining.
   */
  public setNetwork(networkMagic: Cardano.NetworkMagics): TransactionBuilder {
    const body = this.transaction.body();
    const networkId =
      networkMagic === Cardano.NetworkMagics.Mainnet
        ? Cardano.NetworkId.Mainnet
        : Cardano.NetworkId.Testnet;
    body.setNetworkId(networkId);

    this.networkMagic = networkMagic;
    this.transaction.setBody(body);

    return this;
  }

  /**
   * Provides the set of UTxOs that are available for selection during balancing.
   *
   * @param utxos - Available unspent transaction outputs.
   * @returns `this` for fluent chaining.
   */
  public setUnspentOutputs(utxos: Cardano.Utxo[]): TransactionBuilder {
    this.availableUtxos = utxos;
    return this;
  }

  /**
   * Supplies the Plutus context (cost models + ex-units evaluator + input
   * resolver) required to build a smart-contract transaction. Required before
   * {@link build} if any Plutus script is attached.
   *
   * @param context - See {@link PlutusContext}.
   * @returns `this` for fluent chaining.
   */
  public setPlutusContext(context: PlutusContext): TransactionBuilder {
    this.plutusContext = context;
    return this;
  }

  /**
   * Adds a specific input (preselected UTxO) to the transaction.
   *
   * The input is also recorded as "preselected" so the balancer will ensure it
   * remains included. For a UTxO at a script address, pass
   * {@link ScriptInputProps} with the spend redeemer (and, when the datum is by
   * hash, the datum).
   *
   * @throws If the same input (same txId and index) is added more than once,
   *   or is already a reference input.
   *
   * @param utxo - The UTxO to add as an input.
   * @param script - Optional script-unlock data for a script input.
   * @returns `this` for fluent chaining.
   */
  public addInput(
    utxo: Cardano.Utxo,
    script?: ScriptInputProps,
  ): TransactionBuilder {
    // The ledger refuses a transaction that spends an input it also references.
    if (this.isReferenced(utxo)) {
      throw new Error(
        `Cannot spend an input the transaction references: ${utxoRefKey(utxo)}`,
      );
    }
    const body = this.transaction.body();
    const inputs = body.inputs();
    const values = [...inputs.values()];
    if (
      values.find(
        value =>
          Number(value.index()) == utxo[0].index &&
          value.transactionId() == utxo[0].txId,
      )
    ) {
      throw new Error('Cannot add duplicate input to the transaction');
    }
    values.push(Serialization.TransactionInput.fromCore(utxo[0]));
    inputs.setValues(values);

    body.setInputs(inputs);
    this.transaction.setBody(body);
    this.preSelectedUtxos.push(utxo);

    if (script) {
      const [txIn] = utxo;
      this.spendRedeemers.set(`${txIn.txId}#${txIn.index}`, script.redeemer);
      if (script.datum) this.datums.push(script.datum);
    }

    return this;
  }

  /**
   * Adds a reference input: a UTxO the transaction reads without spending,
   * such as a state output a validator inspects. Balancing never selects it.
   *
   * The builder resolves the input from `utxo` itself, so the
   * {@link PlutusContext} input resolver need not know it. Ex-unit evaluation
   * receives that resolution, and the fee and the collateral reservation price
   * any reference script it carries at `minFeeRefScriptCostPerByte`.
   *
   * A Plutus script the UTxO carries witnesses every redeemer that runs it,
   * as the ledger allows, and its language joins the script data hash when
   * a redeemer runs it. Attach only the scripts no reference input carries:
   * the ledger refuses a script provided both ways.
   *
   * @throws If the UTxO is already a reference input or a spent input.
   *
   * @param utxo - The resolved UTxO to reference.
   * @returns `this` for fluent chaining.
   */
  public addReferenceInput(utxo: Cardano.Utxo): TransactionBuilder {
    const key = utxoRefKey(utxo);
    if (this.isReferenced(utxo)) {
      throw new Error(`Cannot add duplicate reference input: ${key}`);
    }
    // The ledger refuses a transaction that spends an input it also references.
    if (this.preSelectedUtxos.some(spent => utxoRefKey(spent) === key)) {
      throw new Error(
        `Cannot reference an input the transaction spends: ${key}`,
      );
    }
    this.referenceUtxos.push(utxo);
    return this;
  }

  /**
   * Appends a new output to the transaction body.
   *
   * @param output - Core output containing destination address and `Value`
   *   (ADA and/or assets), optionally an inline `datum`.
   * @returns `this` for fluent chaining.
   */
  public addOutput(output: Cardano.TxOut): TransactionBuilder {
    const body = this.transaction.body();

    const outputs = body.outputs();
    outputs.push(Serialization.TransactionOutput.fromCore(output));
    body.setOutputs(outputs);
    this.transaction.setBody(body);

    return this;
  }

  /**
   * Sets the transaction to be valid for a specific duration from now.
   *
   * This is a convenience method that calculates a future expiration date and sets it.
   * The transaction will be marked as invalid if it is not included in a block
   * within the specified duration.
   *
   * @param seconds - The number of seconds from now that the transaction should remain valid.
   * @returns The builder instance for chaining.
   */
  public expiresIn(seconds: number): TransactionBuilder {
    const body = this.transaction.body();

    const now = Date.now() / 1000;
    const unixTime = Math.floor(now + seconds) * 1000;
    const slot = resolveSlotNo(this.networkMagic, unixTime);

    body.setTtl(slot);
    this.transaction.setBody(body);

    return this;
  }

  /**
   * Sets the validity interval (e.g. an `invalidHereafter` TTL slot) directly.
   * Applied to the body during {@link build}.
   *
   * @param validityInterval - The validity interval to set.
   * @returns `this` for fluent chaining.
   */
  public setValidityInterval(
    validityInterval: Cardano.ValidityInterval,
  ): TransactionBuilder {
    this.validityInterval = validityInterval;
    return this;
  }

  /**
   * Adds a transaction output to send a value (lovelace and/or other assets) to an address.
   *
   * @param address - The recipient's address as a bech32 string.
   * @param value - The value object, containing the coins and/or other assets to send.
   * @returns The builder instance for chaining.
   */
  public transferValue(
    address: Cardano.PaymentAddress,
    value: Cardano.Value,
  ): TransactionBuilder {
    return this.addOutput({
      address,
      value,
    });
  }

  /**
   * Attaches a Plutus (or native) script to the witness set.
   *
   * @param script - The script to attach.
   * @returns `this` for fluent chaining.
   */
  public attachScript(script: Cardano.Script): TransactionBuilder {
    this.scripts.push(script);
    if (script.__type === Cardano.ScriptType.Plutus) {
      this.scriptVersions.add(script.version);
    }
    return this;
  }

  /**
   * Mints (or burns, with negative quantities) assets under a policy, with a
   * mint redeemer. The redeemer's canonical index (position of the policy in
   * the sorted mint map) is assigned during {@link build}.
   *
   * @param assets - The assets to mint or burn.
   * @param redeemer - The mint redeemer.
   * @returns `this` for fluent chaining.
   */
  public mintAssets(
    assets: Cardano.TokenMap,
    redeemer: Cardano.PlutusData,
  ): TransactionBuilder {
    this.mint = new Map([...(this.mint ?? []), ...assets]);
    for (const assetId of assets.keys()) {
      this.mintRedeemers.set(Cardano.AssetId.getPolicyId(assetId), redeemer);
    }
    return this;
  }

  /**
   * Marks an extra key hash as a required signer (e.g. Plutus scripts that
   * check `extra_signatories`).
   *
   * @param keyHash - The Ed25519 key hash to require.
   * @returns `this` for fluent chaining.
   */
  public addRequiredSigner(
    keyHash: Crypto.Ed25519KeyHashHex,
  ): TransactionBuilder {
    this.requiredSigners.add(keyHash);
    return this;
  }

  /**
   * Sets the pool of UTxOs the builder may draw collateral from for a Plutus
   * transaction. The builder selects largest-first and may combine several to
   * cover the required collateral. A collateral return sends the unused portion
   * (incl. native assets) to the collateral change address on script failure;
   * an ADA-only remainder below min-ADA may be absorbed into total collateral.
   *
   * The pool may overlap `setUnspentOutputs`; overlapping UTxOs may be spent as
   * funding inputs on success. To keep a dedicated collateral UTxO unspent,
   * supply it only here, not to `setUnspentOutputs` or `addInput`.
   *
   * @param utxos - Candidate collateral UTxOs (need not be pure ADA).
   * @returns `this` for fluent chaining.
   */
  public setCollateralUtxos(utxos: Cardano.Utxo[]): TransactionBuilder {
    this.collateralUtxos = utxos;
    return this;
  }

  /**
   * Sets the address that receives the unused collateral (the collateral
   * return).
   *
   * @param address - Address that receives the collateral return.
   * @returns `this` for fluent chaining.
   */
  public setCollateralChangeAddress(
    address: Cardano.PaymentAddress,
  ): TransactionBuilder {
    this.collateralReturnAddress = address;
    return this;
  }

  /**
   * Attaches a memo/message as auxiliary data using label `674` with the `msg` field (CIP-20 style).
   *
   * @param memo - Human-readable memo text.
   * @returns `this` for fluent chaining.
   */
  public setMemo(memo: string): TransactionBuilder {
    return this.setMetadata(674n, new Map([['msg', [memo]]]));
  }

  /**
   * Sets a transaction metadata entry under the given label, preserving any
   * previously set entries (including those added via {@link setMemo}). Calling
   * with an existing label overwrites that label's value.
   *
   * @param label - Metadata label (e.g. `674` for CIP-20 messages, `721` for CIP-25 NFT metadata).
   * @param metadatum - The metadatum value to associate with the label.
   * @returns `this` for fluent chaining.
   */
  public setMetadata(
    label: bigint,
    metadatum: Cardano.Metadatum,
  ): TransactionBuilder {
    const existing = this.transaction.auxiliaryData()?.toCore();
    const blob = new Map(existing?.blob);
    blob.set(label, metadatum);
    this.transaction.setAuxiliaryData(
      Serialization.AuxiliaryData.fromCore({ ...existing, blob }),
    );

    return this;
  }

  /**
   * Adds a stake delegation certificate to delegate stake to a pool.
   *
   * @param poolId - The ID of the stake pool to delegate to.
   * @param stakeCredential - The stake credential (key hash or script hash) being delegated.
   * @param script - Certificate redeemer for a script-hash `stakeCredential`.
   *   Its canonical index is assigned during {@link build}.
   * @throws If `script` is given for a key-hash credential.
   * @returns `this` for fluent chaining.
   */
  public addStakeDelegationCertificate(
    poolId: Cardano.PoolId,
    stakeCredential: Cardano.Credential,
    script?: ScriptCertificateProps,
  ): TransactionBuilder {
    const certificate: Cardano.StakeDelegationCertificate = {
      __typename: Cardano.CertificateType.StakeDelegation,
      poolId,
      stakeCredential,
    };
    return this.addCertificate(certificate, stakeCredential, script);
  }

  /**
   * Adds a Conway-era combined stake registration + delegation certificate.
   * This registers the stake key and delegates to a pool in a single certificate.
   *
   * @param poolId - The pool to delegate to.
   * @param stakeCredential - The stake credential to register and delegate.
   * @param deposit - The deposit amount in lovelace.
   * @returns `this` for fluent chaining.
   */
  public addStakeRegistrationDelegationCertificate(
    poolId: Cardano.PoolId,
    stakeCredential: Cardano.Credential,
    deposit: bigint,
  ): TransactionBuilder {
    const certificate: Cardano.StakeRegistrationDelegationCertificate = {
      __typename: Cardano.CertificateType.StakeRegistrationDelegation,
      poolId,
      stakeCredential,
      deposit,
    };
    this.certificates.push(certificate);
    return this;
  }

  /**
   * Adds a Conway-era stake registration certificate with deposit.
   * This registers the stake key.
   *
   * @param stakeCredential - The stake credential to register and delegate.
   * @param deposit - The deposit amount in lovelace.
   * @param script - Certificate redeemer for a script-hash `stakeCredential`.
   *   Its canonical index is assigned during {@link build}.
   * @throws If `script` is given for a key-hash credential.
   * @returns `this` for fluent chaining.
   */
  public addNewStakeAddressCertificate(
    stakeCredential: Cardano.Credential,
    deposit: bigint,
    script?: ScriptCertificateProps,
  ): TransactionBuilder {
    const certificate: Cardano.NewStakeAddressCertificate = {
      __typename: Cardano.CertificateType.Registration,
      stakeCredential,
      deposit,
    };
    return this.addCertificate(certificate, stakeCredential, script);
  }

  /**
   * Adds a Conway-era stake unregistration certificate.
   * This de-registers the stake key and returns the deposit.
   *
   * @param stakeCredential - The stake credential to deregister.
   * @param deposit - The deposit amount in lovelace to be returned.
   * @returns `this` for fluent chaining.
   */
  public addStakeDeregistrationCertificate(
    stakeCredential: Cardano.Credential,
    deposit: bigint,
  ): TransactionBuilder {
    const certificate: Cardano.NewStakeAddressCertificate = {
      __typename: Cardano.CertificateType.Unregistration,
      stakeCredential,
      deposit,
    };
    this.certificates.push(certificate);
    return this;
  }

  /**
   * Adds a Conway-era vote delegation certificate.
   * This delegates the stake credential's voting power to a DRep.
   *
   * @param stakeCredential - The stake credential delegating its vote.
   * @param dRep - The delegate representative to delegate to (credential, AlwaysAbstain, or AlwaysNoConfidence).
   * @returns `this` for fluent chaining.
   */
  public addVoteDelegationCertificate(
    stakeCredential: Cardano.Credential,
    dRep: Cardano.DelegateRepresentative,
  ): TransactionBuilder {
    const certificate: Cardano.VoteDelegationCertificate = {
      __typename: Cardano.CertificateType.VoteDelegation,
      stakeCredential,
      dRep,
    };
    this.certificates.push(certificate);
    return this;
  }

  /**
   * Adds a Conway-era combined stake registration + vote delegation certificate.
   * Registers the stake key and delegates voting power to a DRep in a single certificate.
   *
   * @param dRep - The DRep to delegate voting power to.
   * @param stakeCredential - The stake credential to register and delegate.
   * @param deposit - The stake key deposit amount in lovelace.
   * @returns `this` for fluent chaining.
   */
  public addVoteRegistrationDelegationCertificate(
    dRep: Cardano.DelegateRepresentative,
    stakeCredential: Cardano.Credential,
    deposit: bigint,
  ): TransactionBuilder {
    const certificate: Cardano.VoteRegistrationDelegationCertificate = {
      __typename: Cardano.CertificateType.VoteRegistrationDelegation,
      dRep,
      stakeCredential,
      deposit,
    };
    this.certificates.push(certificate);
    return this;
  }

  /**
   * @param rewardAccount - stake address to withdraw rewards from
   * @param amount - amount to withdraw (must match the available amount exactly - either withdraw all or nothing)
   * @returns `this` for fluent chaining.
   */
  public addRewardsWithdrawal(
    rewardAccount: Cardano.RewardAccount,
    amount: Cardano.Lovelace,
  ): TransactionBuilder {
    this.withdrawals.set(rewardAccount, amount);
    return this;
  }

  /**
   * Withdraws rewards from a script-controlled reward account, with a
   * withdrawal redeemer. The redeemer's canonical index (position of the
   * account in the sorted script withdrawals) is assigned during {@link build}.
   *
   * @param rewardAccount - The script reward account to withdraw from.
   * @param amount - The amount to withdraw.
   * @param redeemer - The withdrawal redeemer.
   * @returns `this` for fluent chaining.
   */
  public addScriptWithdrawal(
    rewardAccount: Cardano.RewardAccount,
    amount: Cardano.Lovelace,
    redeemer: Cardano.PlutusData,
  ): TransactionBuilder {
    this.withdrawals.set(rewardAccount, amount);
    this.withdrawalRedeemers.set(rewardAccount, redeemer);
    return this;
  }

  /**
   * Finalizes and balances the transaction.
   *
   * Steps:
   * 1. Validates that `availableUtxos`/`preSelectedUtxos` and `changeAddress` are set.
   * 2. Applies the reference inputs and the Plutus surface (scripts, datums,
   *    mint, required signers, collateral, validity interval) and seeds the
   *    redeemers at the per-tx max ex-units, or at the
   *    {@link PlutusContext} estimate, so the balancer prices script
   *    execution.
   * 3. If auxiliary data is present, computes and sets the `auxiliaryDataHash`.
   * 4. Calls {@link balanceTransaction} to select inputs, compute fee/min-ADA,
   *    create change, and iterate until balanced; if the configured selector
   *    fails, balancing is retried with a Large-First fallback (see
   *    {@link useCoinSelector}).
   * 5. For Plutus transactions: re-indexes redeemers canonically over the
   *    balanced tx's sorted inputs / mint policies / certificates /
   *    withdrawals, evaluates their execution units via the injected
   *    evaluator, and computes the `scriptIntegrityHash` over the used cost
   *    models, evaluated redeemers and datums.
   *
   * @throws Error If no UTxOs are available, no change address is set, the tx
   *   cannot be balanced, a Plutus tx is missing its {@link PlutusContext}, a
   *   certificate redeemer has no Plutus script attached or referenced, or a
   *   reference input carries an attached script.
   * @throws `EvaluatedFeeShortfallError` When the evaluated ex-units need a
   *   larger fee than balancing priced at the seed.
   *
   * @returns A `Serialization.Transaction` ready for signing.
   */
  public async build(): Promise<Serialization.Transaction> {
    if (
      this.availableUtxos.length === 0 &&
      this.preSelectedUtxos.length === 0
    ) {
      throw new Error('No available UTXOs to select from');
    }

    if (!this.changeAddress) {
      throw new Error('Change address is not set');
    }

    const hasRedeemers =
      this.spendRedeemers.size > 0 ||
      this.mintRedeemers.size > 0 ||
      this.certificateRedeemers.size > 0 ||
      this.withdrawalRedeemers.size > 0;
    // A script a reference input carries runs only through a redeemer, so a
    // transaction without one never needs the Plutus context for it.
    const hasPlutusScripts =
      this.scripts.some(
        script => script.__type === Cardano.ScriptType.Plutus,
      ) ||
      (hasRedeemers && this.referencedPlutusScripts().length > 0);
    if (hasPlutusScripts && !this.plutusContext) {
      throw new Error(
        'Plutus context is not set — call setPlutusContext() before build()',
      );
    }
    // Without a Plutus script the build skips reindexing, evaluation and the
    // script-data hash, so the node would refuse the transaction only at submit.
    if (this.certificateRedeemers.size > 0 && !hasPlutusScripts) {
      throw new Error(
        'Certificate redeemer requires a Plutus script — call attachScript() or reference a UTxO that carries it before build()',
      );
    }
    this.assertNoAttachedScriptIsReferenced();

    this.applyAuxiliaryDataHash();

    const unbalancedTx = this.transaction.toCore();
    if (this.certificates.length > 0) {
      unbalancedTx.body.certificates = this.certificates;
    }
    if (this.withdrawals.size > 0) {
      unbalancedTx.body.withdrawals = [...this.withdrawals].map(
        ([stakeAddress, quantity]) => ({ stakeAddress, quantity }),
      );
    }
    if (this.validityInterval?.invalidHereafter !== undefined) {
      unbalancedTx.body.validityInterval = {
        ...unbalancedTx.body.validityInterval,
        invalidHereafter: this.validityInterval.invalidHereafter,
      };
    }
    if (this.validityInterval?.invalidBefore !== undefined) {
      unbalancedTx.body.validityInterval = {
        ...unbalancedTx.body.validityInterval,
        invalidBefore: this.validityInterval.invalidBefore,
      };
    }
    if (this.mint) {
      unbalancedTx.body.mint = this.mint;
    }
    if (this.requiredSigners.size > 0) {
      unbalancedTx.body.requiredExtraSignatures = [...this.requiredSigners];
    }
    if (this.referenceUtxos.length > 0) {
      unbalancedTx.body.referenceInputs = this.referenceUtxos.map(
        ([{ txId, index }]) => ({ txId, index }),
      );
    }

    let reservedCollateral: Cardano.Utxo[] = [];
    let spendableUtxos = this.availableUtxos;
    if (
      hasPlutusScripts &&
      this.collateralUtxos.length > 0 &&
      this.collateralReturnAddress
    ) {
      const coverageTarget = this.collateralCoverageTarget();
      reservedCollateral = this.selectCollateralInputs(coverageTarget);
      unbalancedTx.body.collaterals = reservedCollateral.map(utxo => utxo[0]);
      const seeded = this.buildCollateralFields(
        reservedCollateral,
        coverageTarget,
      );
      unbalancedTx.body.totalCollateral = seeded.totalCollateral;
      if (seeded.collateralReturn) {
        unbalancedTx.body.collateralReturn = seeded.collateralReturn;
      }
      // Inputs are consumed on success and collateral only on script failure,
      // so collateral may also fund the transaction. Reference inputs may not.
    }
    if (this.referenceUtxos.length > 0) {
      spendableUtxos = spendableUtxos.filter(utxo => !this.isReferenced(utxo));
    }

    if (this.scripts.length > 0) {
      unbalancedTx.witness.scripts = this.scripts;
    }
    if (this.datums.length > 0) {
      unbalancedTx.witness.datums = this.datums;
    }

    // Seed the witness redeemers at the per-tx max ex-units, or the caller's
    // estimate, so `minFee` (called by the balancer) prices script execution.
    // Indices are corrected after balancing; the evaluator then assigns
    // concrete budgets.
    if (hasRedeemers) {
      unbalancedTx.witness.redeemers = this.seedRedeemers();
      unbalancedTx.body.scriptIntegrityHash = DUMMY_SCRIPT_INTEGRITY_HASH;
    }

    const { tx: balancedTx, selection } = balanceTransaction({
      unbalancedTx,
      availableUtxo: spendableUtxos,
      protocolParameters: this.params,
      preSelectedUtxo: this.preSelectedUtxos,
      collateralUtxos:
        reservedCollateral.length > 0 ? reservedCollateral : undefined,
      referenceUtxos: this.referenceUtxos,
      coinSelector: this.coinSelector,
      fallbackCoinSelector:
        this.coinSelector instanceof LargeFirstCoinSelector
          ? undefined
          : new LargeFirstCoinSelector(),
      changeAddress: this.changeAddress,
    });

    if (!hasPlutusScripts) {
      return Serialization.Transaction.fromCore(balancedTx);
    }

    const finalTx = await this.finalizePlutusTx(
      balancedTx,
      selection,
      reservedCollateral,
    );
    return Serialization.Transaction.fromCore(finalTx);
  }

  // --- private: body assembly ----------------------------------------------

  private addCertificate(
    certificate: Cardano.Certificate,
    stakeCredential: Cardano.Credential,
    script: ScriptCertificateProps | undefined,
  ): TransactionBuilder {
    // A key-hash credential is witnessed by a vkey signature; a redeemer for it
    // would make the ledger refuse the transaction for an extraneous redeemer.
    if (script && stakeCredential.type !== Cardano.CredentialType.ScriptHash) {
      throw new Error(
        `Certificate redeemer requires a script-hash stake credential, got key hash ${stakeCredential.hash}`,
      );
    }
    this.certificates.push(certificate);
    if (script) this.certificateRedeemers.set(certificate, script.redeemer);
    return this;
  }

  private isReferenced(utxo: Cardano.Utxo): boolean {
    const key = utxoRefKey(utxo);
    return this.referenceUtxos.some(
      referenced => utxoRefKey(referenced) === key,
    );
  }

  private referencedPlutusScripts(): Cardano.PlutusScript[] {
    return this.referenceUtxos.flatMap(([, { scriptReference }]) =>
      scriptReference?.__type === Cardano.ScriptType.Plutus
        ? [scriptReference]
        : [],
    );
  }

  /**
   * The hashes of the scripts the redeemers run: the spent inputs' payment
   * scripts, the mint policies and the script credentials of the
   * withdrawals and certificates.
   */
  private redeemedScriptHashes(spent: Cardano.Utxo[]): Set<string> {
    const hashes = new Set<string>(this.mintRedeemers.keys());
    for (const rewardAccount of this.withdrawalRedeemers.keys()) {
      hashes.add(Cardano.RewardAccount.toHash(rewardAccount));
    }
    for (const certificate of this.certificateRedeemers.keys()) {
      if ('stakeCredential' in certificate && certificate.stakeCredential) {
        hashes.add(certificate.stakeCredential.hash);
      }
    }
    for (const key of this.spendRedeemers.keys()) {
      const output = spent.find(utxo => utxoRefKey(utxo) === key)?.[1];
      const payment =
        output &&
        Cardano.Address.fromString(output.address)?.getProps().paymentPart;
      if (payment?.type === Cardano.CredentialType.ScriptHash) {
        hashes.add(payment.hash);
      }
    }
    return hashes;
  }

  /**
   * The languages the script data hash covers, as the ledger counts them:
   * every attached script runs, and a script a reference input carries
   * counts only when a redeemer runs it.
   */
  private usedLanguages(
    spent: Cardano.Utxo[],
  ): Cardano.PlutusLanguageVersion[] {
    const languages = new Set(this.scriptVersions);
    const redeemed = this.redeemedScriptHashes(spent);
    for (const script of this.referencedPlutusScripts()) {
      if (redeemed.has(Serialization.Script.fromCore(script).hash())) {
        languages.add(script.version);
      }
    }
    return [...languages];
  }

  /**
   * The ledger refuses a witness-set script that a spent or reference input
   * also provides, as an extraneous witness. Reference scripts never replace
   * attached ones here, so such a transaction could not be submitted.
   */
  private assertNoAttachedScriptIsReferenced(): void {
    const referencedScripts = this.referenceUtxos.filter(
      ([, output]) => output.scriptReference,
    );
    if (referencedScripts.length === 0) return;
    const attachedHashes = new Set(
      this.scripts.map(script => Serialization.Script.fromCore(script).hash()),
    );
    for (const [txIn, output] of referencedScripts) {
      const hash = Serialization.Script.fromCore(
        output.scriptReference as Cardano.Script,
      ).hash();
      if (attachedHashes.has(hash)) {
        throw new Error(
          `Reference input ${txIn.txId}#${txIn.index} carries attached script ${hash}`,
        );
      }
    }
  }

  private applyAuxiliaryDataHash(): void {
    const auxDataHash = Cardano.computeAuxiliaryDataHash(
      this.transaction.auxiliaryData()?.toCore(),
    );
    if (auxDataHash) {
      const body = this.transaction.body();
      body.setAuxiliaryDataHash(auxDataHash);
      this.transaction.setBody(body);
    }
  }

  // --- private: Plutus finalisation ----------------------------------------

  /**
   * The ex-units balancing prices every redeemer together at: the caller's
   * estimate, or the per-tx maximum.
   */
  private seedExecutionUnits(): Cardano.ExUnits {
    return this.plutusContext?.executionUnitsEstimate ?? SEED_EX_UNITS;
  }

  /**
   * Flattens the accumulated redeemers, seeding each with a SHARE of the seed
   * execution units so their TOTAL stays at (just above, from rounding) the
   * seed — never `count × seed`. The seed only prices `minFee` during
   * balancing (the evaluator assigns concrete budgets afterwards), so it must
   * upper-bound the tx's real ex-units. The per-tx maximum does, since the
   * ledger caps a tx at it regardless of redeemer count — seeding each
   * redeemer at the full max would over-price a multi-redeemer tx by that
   * multiple. Indices are placeholders; corrected canonically after
   * balancing in {@link reindexRedeemers}.
   */
  private seedRedeemers(): Cardano.Redeemer[] {
    const count =
      this.spendRedeemers.size +
      this.mintRedeemers.size +
      this.certificateRedeemers.size +
      this.withdrawalRedeemers.size;
    const seed = this.seedExecutionUnits();
    // ceil keeps the summed seed >= the seed total (a valid upper bound)
    // while staying ~1× it rather than count×.
    const perRedeemer: Cardano.ExUnits =
      count <= 1
        ? seed
        : {
            memory: Math.ceil(seed.memory / count),
            steps: Math.ceil(seed.steps / count),
          };
    // Without an estimate every placeholder index is 0, which the Conway
    // redeemer map encodes once per purpose: the per-tx maximum's fee covers
    // the bytes of the others many times over. An estimate leaves no such
    // room, so each redeemer gets its own placeholder and its bytes are
    // priced.
    const isEstimated =
      this.plutusContext?.executionUnitsEstimate !== undefined;
    const seeded = (
      purpose: Cardano.RedeemerPurpose,
      redeemerData: Iterable<Cardano.PlutusData>,
    ): Cardano.Redeemer[] =>
      [...redeemerData].map((data, position) => ({
        index: isEstimated ? position : 0,
        purpose,
        data,
        executionUnits: perRedeemer,
      }));
    return [
      ...seeded(Cardano.RedeemerPurpose.spend, this.spendRedeemers.values()),
      ...seeded(Cardano.RedeemerPurpose.mint, this.mintRedeemers.values()),
      ...seeded(
        Cardano.RedeemerPurpose.certificate,
        this.certificateRedeemers.values(),
      ),
      ...seeded(
        Cardano.RedeemerPurpose.withdrawal,
        this.withdrawalRedeemers.values(),
      ),
    ];
  }

  /**
   * Re-indexes redeemers canonically over the balanced transaction body,
   * mirroring `@cardano-sdk/tx-construction`'s `assignCanonicalIndices`:
   * - spend: index = position of the input in the sorted input set
   *   (`txId.localeCompare`, then numeric `index`),
   * - mint: index = position of the policy id in the deduped, hex-sorted mint
   *   policies,
   * - certificate: index = position of the certificate in the body
   *   certificate list, counting every certificate,
   * - withdrawal: index = position of the (script) reward account in the
   *   withdrawals sorted by payment-credential hash.
   */
  private reindexRedeemers(body: Cardano.TxBody): Cardano.Redeemer[] {
    const redeemers: Cardano.Redeemer[] = [];

    // spend: position of the input in the canonically sorted input set.
    const sortedInputs = [...body.inputs].sort((a, b) => {
      const txIdComparison = a.txId.localeCompare(b.txId);
      return txIdComparison === 0 ? a.index - b.index : txIdComparison;
    });
    for (const [key, data] of this.spendRedeemers) {
      const index = sortedInputs.findIndex(
        input => `${input.txId}#${input.index}` === key,
      );
      if (index < 0) {
        throw new Error(
          `Spend redeemer input not found in transaction: ${key}`,
        );
      }
      redeemers.push(
        this.seedRedeemerAt(Cardano.RedeemerPurpose.spend, index, data),
      );
    }

    // mint: position of the policy id in the deduped, hex-sorted mint policies.
    const policyIds = [
      ...new Set(
        [...(body.mint?.keys() ?? [])].map(Cardano.AssetId.getPolicyId),
      ),
    ].sort(compareHex);
    for (const [policyId, data] of this.mintRedeemers) {
      const index = policyIds.indexOf(policyId);
      if (index < 0) {
        throw new Error(
          `Mint redeemer policy not present in transaction mint: ${policyId}`,
        );
      }
      redeemers.push(
        this.seedRedeemerAt(Cardano.RedeemerPurpose.mint, index, data),
      );
    }

    // certificate: the body keeps the order certificates were added in.
    const bodyCertificates = body.certificates ?? [];
    for (const [certificate, data] of this.certificateRedeemers) {
      const index = this.certificates.indexOf(certificate);
      if (bodyCertificates[index]?.__typename !== certificate.__typename) {
        throw new Error(
          `Certificate redeemer not present in transaction certificates: ${certificate.__typename}#${index}`,
        );
      }
      redeemers.push(
        this.seedRedeemerAt(Cardano.RedeemerPurpose.certificate, index, data),
      );
    }

    // withdrawal: position among the script reward accounts (those that carry a
    // withdrawal redeemer), sorted by payment-credential hash.
    const scriptRewardAccounts = (body.withdrawals ?? [])
      .map(withdrawal => withdrawal.stakeAddress)
      .filter(rewardAccount => this.withdrawalRedeemers.has(rewardAccount))
      .sort((a, b) =>
        compareHex(
          rewardAccountCredentialHash(a),
          rewardAccountCredentialHash(b),
        ),
      );
    for (const [rewardAccount, data] of this.withdrawalRedeemers) {
      const index = scriptRewardAccounts.indexOf(rewardAccount);
      if (index < 0) {
        throw new Error(
          `Withdrawal redeemer not present in transaction withdrawals: ${rewardAccount}`,
        );
      }
      redeemers.push(
        this.seedRedeemerAt(Cardano.RedeemerPurpose.withdrawal, index, data),
      );
    }

    return redeemers;
  }

  private seedRedeemerAt(
    purpose: Cardano.RedeemerPurpose,
    index: number,
    data: Cardano.PlutusData,
  ): Cardano.Redeemer {
    return { index, purpose, data, executionUnits: SEED_EX_UNITS };
  }

  /**
   * Evaluates redeemer ex-units, corrects the fee downward if actual ex-units
   * are smaller than the seeded budget, and computes the script-data-hash.
   * Returns the final unsigned `Cardano.Tx`.
   */
  /**
   * Lovelace the collateral reservation must cover so finalisation never fails
   * on an under-sized pick.
   *
   * Collateral is selected once, before balancing, but the amount the ledger
   * requires is `ceil(fee * collateralPercentage / 100)`, derived from the
   * post-evaluation fee. The reservation must therefore cover the worst-case
   * fee the balancer could price — `ceil(maxFee * collateralPercentage / 100)` —
   * because the fee is only corrected downward from there.
   *
   * `maxFee = maxSizeFee + maxScriptFee + referenceScriptFee`:
   * - the size component is `minFeeConstant + minFeeCoefficient * maxTxSize`;
   * - the script component prices the seed execution units (the per-tx max
   *   ex-units, or the caller's estimate, which is exactly the TOTAL
   *   {@link seedRedeemers} seeds regardless of redeemer count, so this
   *   matches the fee the balancer prices);
   * - the reference-script component prices the scripts the reference inputs
   *   carry, which are fixed before balancing.
   *
   * `minFee` also charges reference scripts carried by SPENT inputs. The bound
   * leaves those out, since balancing chooses most inputs after collateral is
   * reserved; it holds while no spent input carries a reference script.
   *
   * A blunt 5-ADA floor here would over-reserve: on a wallet with few cover
   * UTxOs it forces a whole large UTxO to be locked as collateral (its excess
   * over the floor falls below a return output's min-ADA, so a second UTxO is
   * grabbed), starving the tx of funding inputs (LW-15113). `COLLATERAL_COVERAGE_TARGET`
   * is kept only for the `collateralPercentage === 0` case, mirroring
   * `finalizePlutusTx`'s collateral derivation.
   */
  private collateralCoverageTarget(): bigint {
    const pct = BigInt(this.params.collateralPercentage);
    if (pct === 0n) return COLLATERAL_COVERAGE_TARGET;
    const maxSizeFee =
      BigInt(this.params.minFeeConstant) +
      BigInt(this.params.minFeeCoefficient) * BigInt(this.params.maxTxSize);
    // 0 when prices are missing/zero; the target is then size-proportional,
    // which still upper-bounds the (zero-script) fee's proportional collateral.
    const seed = this.seedExecutionUnits();
    const maxScriptFee = BigInt(
      Math.ceil(
        (this.params.prices?.memory ?? 0) * seed.memory +
          (this.params.prices?.steps ?? 0) * seed.steps,
      ),
    );
    const referenceFee = referenceScriptFee(
      referenceScriptSize(
        this.referenceUtxos.map(([txIn]) => txIn),
        this.referenceUtxos,
      ),
      this.params,
    );
    return ((maxSizeFee + maxScriptFee + referenceFee) * pct + 99n) / 100n;
  }

  /**
   * Selects collateral inputs largest-first from `collateralUtxos`, combining
   * up to `maxCollateralInputs` until they cover `coverAmount`. Native assets
   * and positive remainders under an execution estimate must fund a return
   * output; otherwise an ADA-only pick needs nothing further.
   *
   * @param coverAmount - Lovelace the selected collateral must cover.
   * @returns The selected collateral UTxOs.
   * @throws `InsufficientCollateralError` When the pool cannot fund a valid return.
   */
  private selectCollateralInputs(coverAmount: bigint): Cardano.Utxo[] {
    const returnAddress = this
      .collateralReturnAddress as Cardano.PaymentAddress;
    const maxInputs = this.params.maxCollateralInputs;
    const sorted = [...this.collateralUtxos].sort((a, b) => {
      const diff = (b[1].value.coins ?? 0n) - (a[1].value.coins ?? 0n);
      return diff > 0n ? 1 : diff < 0n ? -1 : 0;
    });

    const selected: Cardano.Utxo[] = [];
    for (const utxo of sorted) {
      if (selected.length >= maxInputs) break;
      selected.push(utxo);

      const total = coalesceValueQuantities(
        selected.map(([, out]) => out.value),
      );
      if (total.coins < coverAmount) continue;

      const returnCoin = total.coins - coverAmount;
      const hasAssets = (total.assets?.size ?? 0) > 0;
      // An estimated fee may not cover a return that appears after evaluation.
      if (
        !hasAssets &&
        (this.plutusContext?.executionUnitsEstimate === undefined ||
          returnCoin === 0n)
      ) {
        return selected;
      }

      const minReturn = minAdaRequired(
        {
          address: returnAddress,
          value: { coins: returnCoin, assets: total.assets },
        },
        BigInt(this.params.coinsPerUtxoByte),
      );
      if (returnCoin >= minReturn) return selected;
    }

    throw new InsufficientCollateralError(
      `Collateral UTxOs cannot cover ${coverAmount} lovelace plus a valid return output (max ${maxInputs} inputs)`,
    );
  }

  /**
   * Computes `totalCollateral` and (when there is a remainder or native assets)
   * `collateralReturn` for a given collateral amount drawn from
   * `reservedCollateral`. The return carries every native asset on the
   * collateral inputs and must meet the min-ADA rule. Called pre-balancing with
   * the coverage target so the fee prices the collateral fields, and again in
   * finalization with the fee-derived amount.
   *
   * @throws `InsufficientCollateralError` When the inputs cannot fund the
   *   amount plus a valid return output.
   */
  private buildCollateralFields(
    reservedCollateral: Cardano.Utxo[],
    amount: Cardano.Lovelace,
  ): { totalCollateral: Cardano.Lovelace; collateralReturn?: Cardano.TxOut } {
    const returnAddress = this
      .collateralReturnAddress as Cardano.PaymentAddress;
    const collateralValue = coalesceValueQuantities(
      reservedCollateral.map(([, out]) => out.value),
    );
    const returnCoin = collateralValue.coins - amount;
    if (returnCoin < 0n) {
      throw new InsufficientCollateralError(
        `Collateral inputs hold ${collateralValue.coins} lovelace but the required collateral is ${amount}`,
      );
    }
    const hasAssets = (collateralValue.assets?.size ?? 0) > 0;
    if (returnCoin === 0n && !hasAssets) {
      return { totalCollateral: amount };
    }
    const returnValue: Cardano.Value = { coins: returnCoin };
    if (hasAssets) returnValue.assets = collateralValue.assets;
    const collateralReturn: Cardano.TxOut = {
      address: returnAddress,
      value: returnValue,
    };
    const minReturn = minAdaRequired(
      collateralReturn,
      BigInt(this.params.coinsPerUtxoByte),
    );
    if (returnCoin < minReturn) {
      if (hasAssets) {
        // Native assets can only leave the collateral inputs through a return
        // output, so a return that cannot meet min-ADA is unrecoverable.
        throw new InsufficientCollateralError(
          `Collateral return needs ${minReturn} lovelace but only ${returnCoin} is available`,
        );
      }
      // Over-declare instead of failing: the ledger checks only
      // `totalCollateral === inputs - return` plus `>= ceil(fee * pct / 100)`,
      // and both hold when the whole reservation is declared with no return.
      // The alternative is a hard failure, because a dust remainder cannot ship
      // as an output — and the first pricing pass reaches here on ANY
      // exact-cover reservation, whose remainder is only
      // `minFeeCoefficient * pct% * (maxTxSize - txSize)` (LW-15113).
      return { totalCollateral: collateralValue.coins };
    }
    return { totalCollateral: amount, collateralReturn };
  }

  private async finalizePlutusTx(
    balancedTx: Cardano.Tx,
    selection: Cardano.Utxo[],
    reservedCollateral: Cardano.Utxo[],
  ): Promise<Cardano.Tx> {
    const context = this.plutusContext as PlutusContext;
    const reindexed = this.reindexRedeemers(balancedTx.body);

    const txForEvaluation: Cardano.Tx = {
      ...balancedTx,
      witness: { ...balancedTx.witness, redeemers: reindexed },
    };
    const resolvedInputs = [
      ...(await this.resolveInputs(
        balancedTx.body.inputs,
        context.inputResolver,
      )),
      ...this.referenceUtxos,
    ];
    const evaluation = await context.txEvaluator.evaluate(
      txForEvaluation,
      resolvedInputs,
    );
    const evaluatedRedeemers = reindexed.map(redeemer => {
      const result = evaluation.find(
        item =>
          item.purpose === redeemer.purpose && item.index === redeemer.index,
      );
      if (!result) {
        // No evaluated budget for this redeemer would otherwise ship the seed
        // (per-tx Plutus maximum) ex-units -- over-paying at best, and at worst
        // exceeding the tx budget or masking an evaluator that skipped a
        // redeemer. Fail fast rather than submit unevaluated ex-units.
        throw new Error(
          `No ex-units evaluation for redeemer ${redeemer.purpose}#${redeemer.index}`,
        );
      }
      return { ...redeemer, executionUnits: result.budget };
    });

    const allResolvedInputs = [
      ...selection,
      ...reservedCollateral,
      ...this.referenceUtxos,
    ];

    const scriptIntegrityHash = computeConwayScriptDataHash({
      costModels: context.costModels,
      usedLanguages: this.usedLanguages(resolvedInputs),
      redeemers: evaluatedRedeemers,
      datums: this.datums.length > 0 ? this.datums : undefined,
    });

    // The ledger requires `ceil(fee * collateralPercentage / 100)` collateral,
    // but collateral was reserved before balancing against the (larger)
    // coverage target. Re-derive the collateral fields per candidate fee so the
    // fee correction prices the fee over the exact fields that ship (see
    // correctFeeAfterEvaluation).
    const pct = BigInt(this.params.collateralPercentage);
    const deriveCollateralFields = (
      fee: Cardano.Lovelace,
    ): CollateralBodyFields => {
      if (reservedCollateral.length === 0 || !this.collateralReturnAddress) {
        return {};
      }
      const amount =
        pct === 0n || fee === 0n
          ? COLLATERAL_COVERAGE_TARGET
          : (fee * pct + 99n) / 100n;
      return this.buildCollateralFields(reservedCollateral, amount);
    };

    const {
      outputs: correctedOutputs,
      fee: correctedFee,
      collateralFields,
    } = correctFeeAfterEvaluation({
      balancedTx,
      evaluatedRedeemers,
      resolvedInputs: allResolvedInputs,
      protocolParameters: this.params,
      changeAddress: this.changeAddress!,
      scriptIntegrityHash,
      deriveCollateralFields,
    });

    return {
      ...balancedTx,
      body: {
        ...balancedTx.body,
        fee: correctedFee,
        outputs: correctedOutputs,
        scriptIntegrityHash,
        collateralReturn: undefined,
        ...collateralFields,
      },
      witness: {
        ...balancedTx.witness,
        ...(this.scripts.length > 0 && { scripts: this.scripts }),
        ...(this.datums.length > 0 && { datums: this.datums }),
        ...(evaluatedRedeemers.length > 0 && {
          redeemers: evaluatedRedeemers,
        }),
      },
    };
  }

  private async resolveInputs(
    inputs: Cardano.TxIn[],
    inputResolver: Cardano.InputResolver,
  ): Promise<Cardano.Utxo[]> {
    const resolved: Cardano.Utxo[] = [];
    for (const input of inputs) {
      const output = await inputResolver.resolveInput(input);
      if (!output) {
        // Ex-unit evaluation and the script-data-hash are computed over the
        // resolved UTXO set. Silently dropping an unresolved input would feed
        // the evaluator an incomplete set, yielding wrong redeemer budgets or
        // a scriptIntegrityHash the ledger rejects on submit. Fail fast.
        throw new Error(
          `Cannot resolve transaction input ${input.txId}#${input.index}`,
        );
      }
      resolved.push([{ ...input, address: output.address }, output]);
    }
    return resolved;
  }
}
