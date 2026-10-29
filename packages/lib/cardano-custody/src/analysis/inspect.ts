import { Cardano } from '@cardano-sdk/core';

import { parseCustodyAccountRecord } from '../record';
import { fail, ok } from '../result';

import {
  checkLogicDraws,
  findCandidates,
  inspectAccount,
  withOperations,
} from './account-inspection';
import { checkGrantSpendMetadata, readCustodyMetadata } from './auxiliary-data';
import { feeSharesOf } from './fee-shares';
import { isAtAccount } from './outputs';
import { inCheckOrder } from './refusals';
import {
  checkBodyFields,
  checkForeignStakeEffects,
  checkLogicUse,
  checkMint,
  checkOutputs,
  checkRecordAccount,
  checkRedeemerPointers,
  checkReferenceScripts,
  checkSpendWitnesses,
  checkWithdrawalAccounts,
} from './transaction-checks';
import {
  paymentCredentialOf,
  readTransaction,
  resolveBody,
} from './transaction-facts';

import type {
  CustodyAccountState,
  CustodyGrant,
} from '../codecs/account-state';
import type { CustodyContractVersion } from '../contract-version';
import type { CustodyAccountIdentity } from '../identity';
import type { CustodyResult } from '../result';
import type { InspectionScope } from './account-inspection';
import type { CustodySlotToPosixMs } from './grant-spend';
import type {
  CustodyAccountHashes,
  CustodyDatumKind,
  OutputView,
} from './outputs';
import type { CustodyRefusal } from './refusals';
import type { CustodyStateChange } from './state-change';
import type { InputView } from './transaction-facts';
import type { CustodyValueDelta } from './value';
import type { Serialization } from '@cardano-sdk/core';
import type { HexBlob } from '@cardano-sdk/util';

export interface CustodyInspectionOptions {
  /** The network the caller names; every custody address must be on it. */
  readonly chainId: Cardano.ChainId;
  /** POSIX milliseconds; a grant issued with an expiry at or before it is refused. */
  readonly now: number;
  readonly slotToPosixMs: CustodySlotToPosixMs;
  /**
   * The public record of the account the caller operates, as JSON text or a
   * parsed value. With it, the transaction may operate only that account,
   * and a creation is checked against its creator key.
   */
  readonly accountRecord?: unknown;
  /** The device that will sign: it must be listed, or the creator at creation, and a required signer. */
  readonly deviceKeyHash?: string;
  /**
   * Accepts a grant spend the contract accepts instead of refusing every
   * grant spend. Each rule of the logic's grant spend rule the spend breaks
   * is then refused as `grant-spend-violation`.
   */
  readonly allowGrantSpend?: boolean;
}

/** One custody effect of a transaction, as a consent screen names it. */
export type CustodyOperation =
  | {
      readonly kind:
        | 'change-grant-generation'
        | 'create'
        | 'owner-spend'
        | 'reorder-state'
        | 'revoke-all-grants';
    }
  | {
      readonly kind: 'add-device' | 'remove-device';
      readonly device: HexBlob;
    }
  | {
      readonly kind: 'delegate';
      readonly poolId: Cardano.PoolId;
    }
  | {
      readonly kind: 'grant-spend' | 'issue-grant' | 'revoke-grant';
      readonly slot: bigint;
    }
  /** Revokes the grant in `slot` and issues its successor in `issuedSlot`. */
  | {
      readonly kind: 'replace-grant';
      readonly slot: bigint;
      readonly issuedSlot: bigint;
    }
  /** Burns the tokens of dead grants and frees their lovelace, in slot order. */
  | {
      readonly kind: 'sweep-grants';
      readonly slots: readonly bigint[];
    }
  | {
      readonly kind: 'withdraw-rewards';
      readonly quantity: bigint;
    };

export type CustodyAccountCertificate =
  | {
      readonly certificateIndex: number;
      readonly deposit: bigint;
      readonly kind: 'registration';
    }
  | {
      readonly certificateIndex: number;
      readonly kind: 'pool-delegation';
      readonly poolId: Cardano.PoolId;
    };

/** The control UTxO a transaction spends or references, as the caller resolved it. */
interface CustodyControlInputReport {
  readonly input: Cardano.TxIn;
  /** Decoded from the caller's resolution, which nothing checks against the chain. */
  readonly state: CustodyAccountState;
  readonly lovelace: bigint;
}

/** The control output; it always holds only lovelace and the state NFT, and no reference script. */
interface CustodyControlOutputReport {
  readonly outputIndex: number;
  /** Decoded from the transaction bytes. */
  readonly state: CustodyAccountState;
  readonly lovelace: bigint;
}

/** A plain deposit the transaction spends: no account token and no datum. */
interface CustodyFundInputReport {
  readonly input: Cardano.TxIn;
  readonly value: Cardano.Value;
  readonly hasReferenceScript: boolean;
}

/** A reserve the transaction spends: no account token, a datum; only a device spends it. */
interface CustodyReserveInputReport {
  readonly input: Cardano.TxIn;
  readonly value: Cardano.Value;
  readonly datum: Exclude<CustodyDatumKind, 'none'>;
  /** Whether it carries the inline datum `d87980` and no reference script, as Lace writes reserves. */
  readonly isOwnFormat: boolean;
  readonly hasReferenceScript: boolean;
}

/** What an account UTxO is, by the tokens and datum it holds. */
type CustodyAccountUtxoKind = 'control' | 'fund' | 'grant' | 'reserve';

interface CustodyAccountOutputReport {
  readonly outputIndex: number;
  readonly value: Cardano.Value;
  readonly datum: CustodyDatumKind;
  readonly kind: CustodyAccountUtxoKind;
}

/** A grant UTxO the transaction issues, read from its output. */
export interface CustodyIssuedGrantReport {
  readonly outputIndex: number;
  /** The grant token the output holds. */
  readonly assetId: Cardano.AssetId;
  readonly grant: CustodyGrant;
  readonly lovelace: bigint;
}

/** Why a grant is dead against the spent control state, in the contract's order. */
export type CustodyGrantDeath = 'expired' | 'revoked' | 'superseded';

/** A dead grant UTxO the transaction sweeps, burning its token. */
export interface CustodySweptGrantReport {
  readonly input: Cardano.TxIn;
  /** The grant token it burns. */
  readonly assetId: Cardano.AssetId;
  /** Decoded from the caller's resolution. */
  readonly grant: CustodyGrant;
  readonly lovelace: bigint;
  /** `expired` alone means the validity interval starts after the expiry. */
  readonly death: CustodyGrantDeath;
}

/** A grant spend the contract accepts. */
export interface CustodyGrantSpendReport {
  /** The grant UTxO spent. */
  readonly input: Cardano.TxIn;
  /** The grant before the spend, decoded from the caller's resolution. */
  readonly grant: CustodyGrant;
  /** The output that recreates the grant UTxO. */
  readonly outputIndex: number;
  /** The grant after the spend, decoded from the transaction bytes: its caps lowered. */
  readonly after: CustodyGrant;
}

/** Everything a transaction does to one custody account it operates. */
export interface CustodyAccountInspection extends CustodyAccountHashes {
  readonly contractVersion: CustodyContractVersion;
  /** The account address on the inspected network. */
  readonly address: Cardano.PaymentAddress;
  readonly rewardAccount: Cardano.RewardAccount;
  /** The control UTxO an owner operation spends: its lovelace is the control lovelace before. */
  readonly controlInput?: CustodyControlInputReport;
  /** The recreated control UTxO: its lovelace is the control lovelace after. */
  readonly controlOutput?: CustodyControlOutputReport;
  /** The control UTxO a grant spend references, against which its grant is current. */
  readonly referencedControl?: CustodyControlInputReport;
  readonly fundInputs: readonly CustodyFundInputReport[];
  readonly reserveInputs: readonly CustodyReserveInputReport[];
  /** Every output at the account address, by kind. */
  readonly accountOutputs: readonly CustodyAccountOutputReport[];
  /** In slot order. */
  readonly issuedGrants: readonly CustodyIssuedGrantReport[];
  /** In the ledger's input order. */
  readonly sweptGrants: readonly CustodySweptGrantReport[];
  readonly grantSpend?: CustodyGrantSpendReport;
  /**
   * Spent from the account address minus paid back to it; negative is a net
   * inflow. Account tokens minted count as an inflow and burned ones as an
   * outflow, as the contract's `leaving_value` counts them.
   */
  readonly netOutflow: CustodyValueDelta;
  readonly certificates: readonly CustodyAccountCertificate[];
  /** Lovelace withdrawn from the account's reward account. */
  readonly withdrawal?: bigint;
  /**
   * Lovelace the logic run draws from the reward account of the logic the
   * account operates under, which anyone can credit; present only when
   * non-zero. Inspection accepts a draw only where it stays at the account.
   */
  readonly logicDraw?: bigint;
  /** Present for a device rewrite: the control input and output states compared. */
  readonly stateChange?: CustodyStateChange;
  /**
   * Every effect, so a single entry names the whole operation. An owner
   * operation is an `owner-spend` when an asset other than an account token
   * leaves the account, or when the lovelace leaving its address, its
   * reward account and its logic run's draw exceeds its part of the
   * accounts' fee share: an account that pays only its own fee spends
   * nothing. With several operated accounts, an account's part is what the
   * others' outflows cannot cover.
   */
  readonly operations: readonly CustodyOperation[];
}

/** A spent or collateral input outside every custody account the transaction operates. */
export interface CustodyExternalInput {
  readonly input: Cardano.TxIn;
  readonly address: string;
  readonly value: Cardano.Value;
  /** Whether the signing device's key is the address's payment key. */
  readonly isDeviceKey: boolean;
}

export interface CustodyExternalOutput {
  readonly outputIndex: number;
  readonly address: string;
  readonly value: Cardano.Value;
}

/**
 * An output paid to a custody account the transaction does not operate: a
 * plain deposit, or with an inline datum a reserve in the format Lace
 * writes, which only a device of that account spends.
 */
interface CustodyDepositOutput extends CustodyAccountHashes {
  readonly outputIndex: number;
  readonly address: string;
  readonly value: Cardano.Value;
  readonly datum: Exclude<CustodyDatumKind, 'hash'>;
}

/**
 * How the fee splits between the external inputs and the operated accounts.
 * Lovelace is fungible, so any split is an attribution. This one treats an
 * external output to the address of an external input as that payer's
 * change, and lets what external inputs put in beyond their change pay the
 * fee before the accounts do. An account that gives up more than its share
 * therefore always pays someone.
 */
export interface CustodyFeeShares {
  /** The addresses of the external inputs, each once, in the ledger's input order. */
  readonly payers: readonly string[];
  /** Lovelace of the fee the external inputs pay. */
  readonly externalShare: bigint;
  /** Lovelace of the fee the operated accounts pay: the rest of it. */
  readonly accountShare: bigint;
}

interface CustodyValidityBound {
  readonly slot: Cardano.Slot;
  readonly posixMs: number;
}

/** What a custody transaction does, read from its bytes and the caller's resolutions. */
export interface CustodyTransactionInspection {
  readonly accounts: readonly CustodyAccountInspection[];
  readonly deposits: readonly CustodyDepositOutput[];
  readonly externalOutputs: readonly CustodyExternalOutput[];
  readonly externalInputs: readonly CustodyExternalInput[];
  readonly collateralInputs: readonly CustodyExternalInput[];
  readonly collateralReturn?: {
    readonly address: string;
    readonly value: Cardano.Value;
  };
  readonly requiredSigners: readonly string[];
  readonly validity: {
    readonly invalidBefore?: CustodyValidityBound;
    readonly invalidHereafter?: CustodyValidityBound;
  };
  readonly fee: bigint;
  /** Rests on the caller's resolutions of the external inputs. */
  readonly feeShares: CustodyFeeShares;
  readonly donation?: bigint;
  /**
   * The metadata the auxiliary data carries, by label, which the body
   * commits to by its auxiliary data hash; absent without any.
   */
  readonly metadata?: Cardano.TxMetadata;
}

interface CustodyInspectionRefused {
  /** Never empty; in check order, so the first is the one to report. */
  readonly refusals: readonly CustodyRefusal[];
}

const readRecord = (
  options: CustodyInspectionOptions,
): CustodyResult<CustodyAccountIdentity | undefined, CustodyRefusal> => {
  if (options.accountRecord === undefined) return ok(undefined);
  const parsed = parseCustodyAccountRecord(
    options.accountRecord,
    options.chainId.networkMagic,
  );
  if (parsed.ok) return ok(parsed.value.identity);
  return fail(
    parsed.error.code === 'unsupported-contract-version'
      ? {
          code: 'custody-unsupported-version',
          reason: 'unsupported-contract-version',
          accountValidatorHash: parsed.error.accountValidatorHash,
        }
      : {
          code: 'custody-context-mismatch',
          reason: 'invalid-record',
          recordError: parsed.error,
        },
  );
};

const paymentKeyHashOf = (view: OutputView): string | undefined => {
  const credential = paymentCredentialOf(view);
  return credential?.type === Cardano.CredentialType.KeyHash
    ? credential.hash
    : undefined;
};

const externalInputOf = (
  { input, output }: InputView,
  deviceKeyHash: string | undefined,
): CustodyExternalInput => ({
  input,
  address: output.txOut.address,
  value: output.txOut.value,
  isDeviceKey:
    deviceKeyHash !== undefined && paymentKeyHashOf(output) === deviceKeyHash,
});

const validityOf = (
  { validityInterval }: Cardano.TxBody,
  slotToPosixMs: CustodySlotToPosixMs,
): CustodyTransactionInspection['validity'] => {
  const bounds: {
    -readonly [K in keyof CustodyTransactionInspection['validity']]: CustodyValidityBound;
  } = {};
  if (validityInterval?.invalidBefore !== undefined) {
    const slot = validityInterval.invalidBefore;
    bounds.invalidBefore = { slot, posixMs: slotToPosixMs(slot) };
  }
  if (validityInterval?.invalidHereafter !== undefined) {
    const slot = validityInterval.invalidHereafter;
    bounds.invalidHereafter = { slot, posixMs: slotToPosixMs(slot) };
  }
  return bounds;
};

/**
 * Reads every custody effect of a transaction from its bytes and the
 * caller's resolutions of its inputs, and refuses what Lace never signs.
 * The SDK checks its own builds with it before asking for a signature, and
 * the hosted signer derives its consent and its refusals from it, so both
 * apply one set of rules.
 *
 * It takes the `Serialization.Transaction` whose body hash is signed, so
 * what it reads is what a signature commits to. Resolutions come from the
 * caller and are not checked against the chain; an inline datum in a
 * resolution wins over a datum hash reported beside it. A custody account
 * is any address whose payment credential is a supported account validator
 * and whose stake credential is an inline script.
 *
 * Every operation on an account runs the logic its control datum names,
 * through a withdrawal from the logic's stake credential, and that logic
 * must be one of the contract version's catalogue. A reference input may
 * carry a reference script only as a contract script parked at the output
 * reference the version pins on the inspected network.
 *
 * Witness-set redeemers are bound to the signed body only through its
 * script data hash, which inspection does not recompute. A spend redeemer
 * must fit the UTxO it spends: `Device` the control UTxO, `SpendWithGrant`
 * or `SweepGrant` a grant UTxO, `Fund` a deposit. `SpendWithGrant` is
 * refused unless `allowGrantSpend` is set, and the mint redeemer must fit
 * the mint: `CreateAccount` a state NFT, `IssueGrants` grant tokens minted,
 * `BurnGrants` grant tokens burned. Another redeemer set under the same body
 * cannot change what the body does: it can only run a contract branch that
 * the device's signature does not authorise.
 */
export const inspectCustodyTransaction = (
  transaction: Serialization.Transaction,
  resolvedInputs: readonly Cardano.Utxo[],
  options: CustodyInspectionOptions,
): CustodyResult<CustodyTransactionInspection, CustodyInspectionRefused> => {
  const record = readRecord(options);
  if (!record.ok) return fail({ refusals: [record.error] });
  const serializedBody = transaction.body();
  const body = serializedBody.toCore();
  const resolved = resolveBody(body, resolvedInputs);
  if (!resolved.ok) return fail({ refusals: resolved.error });
  const metadata = readCustodyMetadata(transaction, body);
  if (!metadata.ok) return fail({ refusals: [metadata.error] });
  const facts = readTransaction(
    {
      body,
      bodyCbor: serializedBody.toCbor(),
      witness: transaction.witnessSet().toCore(),
    },
    resolved.value,
    options,
  );
  const { networkId } = options.chainId;
  const scope: InspectionScope = {
    options,
    record: record.value,
    deviceKeyHash: options.deviceKeyHash?.toLowerCase(),
  };

  const candidates = findCandidates(facts, record.value);
  const outcomes = candidates.map(candidate =>
    inspectAccount(candidate, facts, scope),
  );
  const operated = outcomes.filter(({ isOperated }) => isOperated);
  const isOperatedAccount = (view: OutputView): boolean =>
    operated.some(({ report }) => isAtAccount(view, report));
  const externalInputs = facts.inputs
    .filter(({ output }) => !isOperatedAccount(output))
    .map(view => externalInputOf(view, scope.deviceKeyHash));
  const externalOutputs = facts.outputs.flatMap((view, outputIndex) =>
    view.addressClass.kind === 'other'
      ? [
          {
            outputIndex,
            address: view.txOut.address,
            value: view.txOut.value,
          },
        ]
      : [],
  );
  const feeShares = feeSharesOf({
    externalInputs,
    externalOutputs,
    fee: body.fee,
  });
  const refusals = inCheckOrder([
    ...checkBodyFields(facts),
    ...checkWithdrawalAccounts(facts),
    ...checkForeignStakeEffects(facts, candidates, networkId),
    ...checkMint(facts),
    ...checkRedeemerPointers(facts),
    ...checkSpendWitnesses(facts),
    ...checkLogicUse(
      facts,
      outcomes.flatMap(({ logics }) => logics),
    ),
    ...checkReferenceScripts(facts, options.chainId.networkMagic),
    ...checkOutputs(facts, networkId),
    ...checkRecordAccount(
      operated.map(({ report }) => report),
      record.value,
    ),
    ...outcomes.flatMap(outcome => outcome.refusals),
    ...checkGrantSpendMetadata(operated, metadata.value),
    ...checkLogicDraws(
      operated,
      feeShares,
      externalOutputs.some(({ address }) => feeShares.payers.includes(address)),
    ),
  ]);
  if (refusals.length > 0) return fail({ refusals });

  return ok({
    accounts: withOperations(operated, feeShares),
    deposits: facts.outputs.flatMap(
      (view, outputIndex): CustodyDepositOutput[] =>
        view.addressClass.kind === 'account' &&
        view.datumKind !== 'hash' &&
        !isOperatedAccount(view)
          ? [
              {
                outputIndex,
                address: view.txOut.address,
                value: view.txOut.value,
                accountValidatorHash:
                  view.addressClass.contractVersion.accountValidatorHash,
                stakeScriptHash: view.addressClass.stakeScriptHash,
                datum: view.datumKind,
              },
            ]
          : [],
    ),
    externalOutputs,
    externalInputs,
    collateralInputs: facts.collaterals.map(view =>
      externalInputOf(view, scope.deviceKeyHash),
    ),
    ...(body.collateralReturn
      ? {
          collateralReturn: {
            address: body.collateralReturn.address,
            value: body.collateralReturn.value,
          },
        }
      : {}),
    requiredSigners: [...facts.requiredSigners],
    validity: validityOf(body, options.slotToPosixMs),
    fee: body.fee,
    feeShares,
    ...(body.donation === undefined ? {} : { donation: body.donation }),
    ...(metadata.value === undefined ? {} : { metadata: metadata.value }),
  });
};
