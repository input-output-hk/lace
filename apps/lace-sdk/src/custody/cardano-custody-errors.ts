import { CustomError } from 'ts-custom-error';

import type { CardanoCustodySubmission } from './submit-cardano-custody-transaction';
import type { Cardano } from '@cardano-sdk/core';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type {
  CardanoCustodyAccountState,
  CardanoCustodyBuildError,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { CustodyAccountRecordError } from '@lace-lib/cardano-custody';

/**
 * An imported account record does not name a genuine custody account on the
 * wallet's network: its shape, its re-derived stake script hash or address,
 * or its network is wrong. `reason.step` names the validation step it
 * failed.
 */
export class CardanoCustodyRecordInvalidError extends CustomError {
  public readonly code = 'custody-record-invalid' as const;

  public constructor(
    readonly reason: Exclude<
      CustodyAccountRecordError,
      { code: 'unsupported-contract-version' }
    >,
  ) {
    super(`The custody account record is invalid: ${reason.code}`);
  }
}

/**
 * The account belongs to a custody contract version this SDK does not
 * support, so it cannot derive, verify or sign for it.
 */
export class CardanoCustodyUnsupportedVersionError extends CustomError {
  public readonly code = 'custody-unsupported-version' as const;

  public constructor(readonly accountValidatorHash: string) {
    super(`Custody contract version ${accountValidatorHash} is not supported`);
  }
}

/** The device key is not listed in the account's current state. */
export class CardanoCustodyDeviceNotListedError extends CustomError {
  public readonly code = 'custody-device-not-listed' as const;

  public constructor(readonly keyHash: Ed25519KeyHashHex) {
    super(`Custody device ${keyHash} is not listed in the account state`);
  }
}

/**
 * The control UTxO on chain is not the one the transaction spends or
 * references: an owner operation replaced it, which also stops every grant
 * spend built before it. Wait for the wallet to sync, then build again.
 */
export class CardanoCustodyStaleControlError extends CustomError {
  public readonly code = 'custody-stale-control' as const;

  public constructor() {
    super('The custody control UTxO changed on chain; sync and build again');
  }
}

/**
 * The grant UTxO a grant spend spends is no longer on chain: another spend
 * under the grant, or a sweep, spent it first. Wait for the wallet to sync,
 * then build again. `slot` names the grant when it is known.
 */
export class CardanoCustodyStaleGrantError extends CustomError {
  public readonly code = 'custody-stale-grant' as const;
  public readonly slot?: bigint;

  public constructor(slot?: bigint) {
    super(
      `The custody grant UTxO${
        slot === undefined ? '' : ` of slot ${slot}`
      } changed on chain; sync and build again`,
    );
    if (slot !== undefined) this.slot = slot;
  }
}

/**
 * Fund UTxOs the transaction spends are no longer on chain: another
 * transaction, such as another agent's spend, took them first. Build again;
 * the build selects funds that are still unspent. `inputs` names them when
 * the refusal did, and is empty otherwise.
 */
export class CardanoCustodyFundContentionError extends CustomError {
  public readonly code = 'custody-fund-contention' as const;

  public constructor(readonly inputs: readonly Cardano.TxIn[]) {
    super('Custody fund UTxOs were spent by another transaction; build again');
  }
}

/**
 * A reward balance the transaction withdraws changed before the node
 * received it, as rewards credited at an epoch boundary do: the ledger
 * takes a withdrawal only of the whole balance. Build again; the build
 * reads the balance anew.
 */
export class CardanoCustodyRewardBalanceChangedError extends CustomError {
  public readonly code = 'custody-reward-balance-changed' as const;

  public constructor() {
    super(
      'A reward balance the custody transaction withdraws changed; build again',
    );
  }
}

/**
 * The stake credential of the logic the transaction runs is not registered
 * on the wallet's network, so the transaction's withdrawal from the logic's
 * reward account `rewardAccount`, which runs the logic, would fail. It is
 * registered once per network, outside Lace; build again once it is.
 */
export class CardanoCustodyLogicNotRegisteredError extends CustomError {
  public readonly code = 'custody-logic-not-registered' as const;

  public constructor(readonly rewardAccount: Cardano.RewardAccount) {
    super(
      `The custody logic reward account ${rewardAccount} is not registered`,
    );
  }
}

/**
 * The reward account of the logic the account runs holds `balance`
 * lovelace, which anyone can pay into it. Every transaction that runs the
 * logic must withdraw that whole balance and keep it at the account
 * address. A grant spend may draw nothing, and an owner operation that
 * pays more than its fee out of the account would carry the draw out, so
 * both fail with this error whatever the fee sponsor accepts. Any other
 * operation keeps the draw at the account, but the fee sponsor refuses to
 * sign a logic run that draws anything, so it fails too until the balance
 * is gone or the sponsor accepts such draws. Building again does not help.
 */
export class CardanoCustodyLogicRewardBalanceError extends CustomError {
  public readonly code = 'custody-logic-reward-balance' as const;

  public constructor(readonly logic: string, readonly balance: bigint) {
    super(
      `The reward account of custody logic ${logic} holds ${balance} lovelace, which this transaction cannot draw`,
    );
  }
}

/**
 * The fee sponsor does not serve the logic the account's control state
 * names, under its `known_logic` rule, so it funds and lends collateral to
 * none of the account's transactions. Building again does not help.
 * `detail` is the sponsor's explanation.
 */
export class CardanoCustodyLogicNotServedError extends CustomError {
  public readonly code = 'custody-logic-not-served' as const;

  public constructor(readonly detail: string) {
    super(
      `The fee sponsor does not serve the custody account's logic: ${detail}`,
    );
  }
}

/**
 * The fee sponsor hashed the transaction's script data to another value
 * than its body commits to, under its `script_data_hash` rule, most likely
 * because the sponsor's chain provider reports other cost models than the
 * wallet's. Building again does not help while they differ. `detail` is the
 * sponsor's explanation. A sponsor that could not compute the hash at all
 * answers with a `CardanoCustodySponsorError`, which can pass.
 */
export class CardanoCustodyScriptDataHashError extends CustomError {
  public readonly code = 'custody-script-data-hash' as const;

  public constructor(readonly detail: string) {
    super(
      `The fee sponsor refused the custody transaction's script data hash: ${detail}`,
    );
  }
}

/**
 * The node refused an account creation because its stake credential is
 * already registered: someone registered it after the creation scan read
 * it, which also takes the creator index for good. Create again with a
 * `startIndex` past `creatorIndex`.
 */
export class CardanoCustodyAlreadyRegisteredError extends CustomError {
  public readonly code = 'custody-already-registered' as const;

  public constructor(readonly creatorIndex: number) {
    super(
      `The stake credential of custody creator index ${creatorIndex} is already registered`,
    );
  }
}

/**
 * Every creator index the scan examined was unusable: registered by someone
 * else first. Scan again from a later index.
 */
export class CardanoCustodyIndexExhaustedError extends CustomError {
  public readonly code = 'custody-index-exhausted' as const;

  public constructor(readonly startIndex: number, readonly scanned: number) {
    super(
      `No usable custody creator index in ${scanned} indices from ${startIndex}`,
    );
  }
}

/**
 * A submitted operation on the account has not settled. Custody operations
 * are never chained: wait for it with `waitForCardanoCustodyOperation`.
 */
export class CardanoCustodyOperationInProgressError extends CustomError {
  public readonly code = 'custody-operation-in-progress' as const;

  public constructor(readonly accountId: AccountId) {
    super(`A custody operation on account ${accountId} has not settled yet`);
  }
}

/** Why an operation does not fit the account or its arguments. */
export type CardanoCustodyInvalidOperationReason =
  | Extract<CardanoCustodyBuildError, { code: 'invalid-operation' }>['reason']
  | 'account-not-live'
  | 'dead-grant'
  | 'grant-limit'
  | 'grantee-has-grant'
  | 'invalid-grant'
  | 'invalid-metadata-meaning'
  | 'network-mismatch'
  | 'observer-account'
  | 'reference-too-long'
  | 'revoked-list-full'
  | 'sweep-not-dead'
  | 'unknown-account'
  | 'unknown-grant';

/**
 * The operation cannot run on this account: it is an observer, it is not
 * live, the operation's arguments break a rule of the contract, or the
 * operation belongs to another helper. `detail` carries what the rule found.
 *
 * - `account-not-live`: the account's state is `detail.status`, not live.
 *   For an `invalid` account `detail.reason` says why; with the code
 *   `unknown-logic`, its control state names a logic outside
 *   `CARDANO_CUSTODY_LOGIC_HASHES`, and no operation runs on it.
 * - `reference-too-long`: the app's `reference` has `detail.length`
 *   characters, over the `detail.limit` the pending activity keeps.
 * - `invalid-metadata-meaning`: the meaning for `detail.label` breaks a rule
 *   the device enforces, named by `detail.problem`: `not-a-label` (not a
 *   decimal 64-bit unsigned label), `not-carried` (the operation carries no
 *   metadata under that label), `empty`, or `too-long` (over `detail.limit`
 *   characters).
 * - `grantee-has-grant`: the agent key already holds the current grant in
 *   `detail.slot`; one agent key holds one current grant, so replace that
 *   grant to change its scope.
 * - `grant-limit`: the account holds `detail.limit` outstanding grants,
 *   dead ones included; sweep dead grants first.
 * - `revoked-list-full`: the revoked list holds `detail.limit` slots; sweep
 *   revoked grants first.
 * - `sweep-not-dead`: the grant in `detail.slot` still works, as
 *   `detail.liveness` says, so it cannot be swept.
 * - `dead-grant`: the grant in `detail.slot` no longer works, as
 *   `detail.liveness` says, so it has no agent policy.
 */
export class CardanoCustodyInvalidOperationError extends CustomError {
  public readonly code = 'custody-invalid-operation' as const;

  public constructor(
    readonly reason: CardanoCustodyInvalidOperationReason,
    readonly detail?: unknown,
  ) {
    super(`Invalid custody operation: ${reason}`);
  }
}

/**
 * The `account-not-live` error for an account state that is not live: its
 * status, and why an `invalid` state is invalid.
 */
export const custodyAccountNotLiveError = (
  state: CardanoCustodyAccountState | undefined,
): CardanoCustodyInvalidOperationError =>
  new CardanoCustodyInvalidOperationError('account-not-live', {
    status: state?.status ?? 'unsynced',
    ...(state?.status === 'invalid' && { reason: state.reason }),
  });

/** The most characters an app reference may have. */
const CARDANO_CUSTODY_REFERENCE_MAX_LENGTH = 200;

/**
 * The `reference-too-long` error for an app reference over the bound, so a
 * submission can refuse it before any sponsor or device request.
 */
export const custodyReferenceTooLongError = (
  reference: string | undefined,
): CardanoCustodyInvalidOperationError | undefined =>
  reference !== undefined &&
  reference.length > CARDANO_CUSTODY_REFERENCE_MAX_LENGTH
    ? new CardanoCustodyInvalidOperationError('reference-too-long', {
        length: reference.length,
        limit: CARDANO_CUSTODY_REFERENCE_MAX_LENGTH,
      })
    : undefined;

const METADATA_LABEL = /^(?:0|[1-9]\d*)$/;
// 2^64 - 1 as a literal: `**` on BigInt breaks transpilers that lower it to Math.pow.
const MAX_METADATA_LABEL = 18_446_744_073_709_551_615n;
/** The longest meaning the device's consent shows for one label. */
const MAX_METADATA_MEANING_LENGTH = 200;

/**
 * The `invalid-metadata-meaning` error for the first meaning the device
 * would refuse, so the app hears it before the sponsor is asked; undefined
 * when every meaning names a label the metadata carries.
 */
export const custodyMetadataMeaningError = (
  meanings: Readonly<Record<string, string>> | undefined,
  metadata: Cardano.TxMetadata | undefined,
): CardanoCustodyInvalidOperationError | undefined => {
  for (const [label, meaning] of Object.entries(meanings ?? {})) {
    const problem =
      !METADATA_LABEL.test(label) || BigInt(label) > MAX_METADATA_LABEL
        ? 'not-a-label'
        : !metadata?.has(BigInt(label))
        ? 'not-carried'
        : meaning.length === 0
        ? 'empty'
        : meaning.length > MAX_METADATA_MEANING_LENGTH
        ? 'too-long'
        : undefined;
    if (problem)
      return new CardanoCustodyInvalidOperationError(
        'invalid-metadata-meaning',
        {
          label,
          problem,
          ...(problem === 'too-long' && {
            limit: MAX_METADATA_MEANING_LENGTH,
          }),
        },
      );
  }
  return undefined;
};

/** Why a grant spend cannot be built or submitted. */
export type CardanoCustodyGrantSpendReason =
  | Extract<CardanoCustodyBuildError, { code: 'grant-spend' }>['reason']
  | 'collateral-changed'
  | 'transaction-witnessed';

/**
 * A grant spend cannot be built or submitted. `detail` carries what the
 * check found.
 *
 * - `unknown-grant`: the grantee holds no grant, or none in the named slot.
 * - `ambiguous-grant`: the grantee holds more than one current grant, in
 *   `detail.slots`; name the slot.
 * - `dead-grant`: the grant no longer works, as `detail.liveness` says.
 * - `scope`, `recipient-not-allowed`: the outputs, with the fee, break the
 *   grant's caps or recipients.
 * - `fee-above-bound`: the fee is above the spend's fee bound.
 * - `fund-input-cap`: paying needs more fund inputs than one spend fits;
 *   fewer, larger deposits help.
 * - `collateral-changed`: the sponsor replaced its collateral since the
 *   build; build again and have the agent sign again.
 * - `transaction-witnessed`: the transaction already carries vkey or
 *   bootstrap witnesses; submit the unsigned transaction the build
 *   returned, with the agent witness beside it.
 */
export class CardanoCustodyGrantSpendError extends CustomError {
  public readonly code = 'custody-grant-spend' as const;

  public constructor(
    readonly reason: CardanoCustodyGrantSpendReason,
    readonly detail?: unknown,
  ) {
    super(`Custody grant spend refused: ${reason}`);
  }
}

/** Why a witness was refused. */
export type CardanoCustodyWitnessRefusal =
  /** The signature does not verify over the transaction body hash. */
  | 'invalid-signature'
  /** Not a vkey witness, or a witness set that holds anything but vkeys. */
  | 'malformed'
  /** Signed by a key the transaction does not expect from this signer. */
  | 'unexpected-key';

/**
 * The fee sponsor or the device signer answered with witnesses that are not
 * exactly one valid signature by the expected key over the body hash.
 */
export class CardanoCustodyWitnessError extends CustomError {
  public readonly code = 'custody-witness' as const;

  public constructor(
    readonly signer: 'device' | 'sponsor',
    readonly reason: CardanoCustodyWitnessRefusal,
  ) {
    super(`The ${signer} witness was refused: ${reason}`);
  }
}

/**
 * The agent witness of a grant spend is malformed, does not verify over the
 * body hash, or is not by the grantee of the spent grant
 * (`unexpected-key`).
 */
export class CardanoCustodyAgentWitnessError extends CustomError {
  public readonly code = 'custody-agent-witness' as const;

  public constructor(readonly reason: CardanoCustodyWitnessRefusal) {
    super(`The agent witness was refused: ${reason}`);
  }
}

/**
 * The signer does not serve the custody request: the hosted signer answered
 * `unsupported-request`, or the device signer has no `signData`.
 * `signerCode` is the refusal code.
 */
export class CardanoCustodyUnsupportedSignerError extends CustomError {
  public readonly code = 'custody-unsupported-signer' as const;

  public constructor(readonly signerCode: string) {
    super(`The signer does not support custody requests (${signerCode})`);
  }
}

/**
 * The custody transaction build failed for a reason no other custody error
 * names, such as `insufficient-funds`, `unavailable` chain data or a
 * script evaluation failure. `reason` is the builder's typed failure.
 */
export class CardanoCustodyBuildFailedError extends CustomError {
  public readonly code = 'custody-build-failed' as const;

  public constructor(readonly reason: CardanoCustodyBuildError) {
    super(`The custody transaction build failed: ${reason.code}`);
  }
}

/** A device enrollment value is malformed or for another network. */
export class CardanoCustodyEnrollmentInvalidError extends CustomError {
  public readonly code = 'custody-enrollment-invalid' as const;

  public constructor(readonly reason: string, readonly field?: string) {
    super(
      `The custody device enrollment is invalid: ${reason}${
        field === undefined ? '' : ` (${field})`
      }`,
    );
  }
}

/**
 * An agent policy is malformed, or its grant breaks a rule of the contract
 * or is for another network. `field` names the part that failed, such as
 * `grant.recipients`. A policy whose account record fails validation throws
 * the record's own errors instead.
 */
export class CardanoCustodyAgentPolicyInvalidError extends CustomError {
  public readonly code = 'custody-agent-policy-invalid' as const;

  public constructor(readonly reason: string, readonly field?: string) {
    super(
      `The custody agent policy is invalid: ${reason}${
        field === undefined ? '' : ` (${field})`
      }`,
    );
  }
}

/**
 * The wallet carries no custody store: it was created without
 * `m.blockchainCardanoCustody`, which custody helpers need next to the
 * Cardano modules. Create the wallet with it.
 */
export class CardanoCustodyModuleNotLoadedError extends CustomError {
  public readonly code = 'custody-module-not-loaded' as const;

  public constructor() {
    super(
      'The wallet has no custody store: create it with m.blockchainCardanoCustody',
    );
  }
}

/**
 * The wallet's Cardano network was not ready within `timeoutMs`. `missing`
 * names what it lacked:
 *
 * - `network`: no network is selected. Create the wallet with the Cardano
 *   modules (`blockchainCardano` and a Cardano provider): a new wallet
 *   selects its network shortly after creation.
 * - `era-summaries`: the Cardano provider has not answered the era
 *   summaries a custody build reads. Check that the provider is reachable.
 */
export class CardanoCustodyNetworkNotReadyError extends CustomError {
  public readonly code = 'custody-network-not-ready' as const;

  public constructor(
    readonly timeoutMs: number,
    readonly missing: 'era-summaries' | 'network' = 'network',
  ) {
    super(
      missing === 'network'
        ? `Cardano network not initialized after ${timeoutMs} ms: load the Cardano modules and select a network`
        : `Cardano era summaries not loaded after ${timeoutMs} ms: check that the Cardano provider is reachable`,
    );
  }
}

/**
 * The transaction's validity interval ended without the wallet seeing it
 * settle: it can no longer be included, and the operation did not apply.
 */
export class CardanoCustodyOperationExpiredError extends CustomError {
  public readonly code = 'custody-operation-expired' as const;

  public constructor(
    readonly txId: Cardano.TransactionId,
    readonly invalidHereafter: Cardano.Slot,
  ) {
    super(
      `Custody transaction ${txId} expired at slot ${invalidHereafter} without settling`,
    );
  }
}

/**
 * Submission did not answer in time: the transaction may still settle. It is
 * not a failure. The transaction is recorded as the account's pending
 * operation, a creation opens its account, and further operations on the
 * account are refused until it settles or expires: wait for it with
 * `waitForCardanoCustodyOperation` and these `accountId`, `txId` and
 * `invalidHereafter`. `grantSlot` is the slot of the grant an `issue-grant`
 * or `replace-grant` operation issues if it settles.
 */
export class CardanoCustodyOutcomeUnknownError extends CustomError {
  public readonly code = 'custody-outcome-unknown' as const;
  public readonly txId: Cardano.TransactionId;
  public readonly invalidHereafter: Cardano.Slot;
  public readonly grantSlot?: bigint;

  public constructor(
    readonly accountId: AccountId,
    { txId, invalidHereafter, grantSlot }: CardanoCustodySubmission,
  ) {
    super(`The outcome of custody transaction ${txId} is unknown`);
    this.txId = txId;
    this.invalidHereafter = invalidHereafter;
    if (grantSlot !== undefined) this.grantSlot = grantSlot;
  }
}
