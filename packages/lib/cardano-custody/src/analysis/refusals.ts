import type {
  CustodyAccountRedeemer,
  CustodyMintRedeemer,
} from '../codecs/redeemers';
import type { CustodyAccountRecordError } from '../record';
import type { CustodyGrantSpendViolation } from './grant-spend';
import type { CustodyAccountHashes } from './outputs';
import type {
  CustodyGrantViolation,
  CustodyStateViolation,
} from '../state/rules';
import type { Cardano } from '@cardano-sdk/core';
import type { HexBlob } from '@cardano-sdk/util';

/** The body list an input belongs to. */
export type CustodyInputSource = 'collaterals' | 'inputs' | 'referenceInputs';

/** An output of the body, or its collateral return. */
export type CustodyOutputLocation =
  | { readonly index: number; readonly kind: 'output' }
  | { readonly kind: 'collateral-return' };

/** Body fields no custody operation uses, whose effects inspection does not read. */
export type CustodyUnsupportedBodyField =
  | 'accountBalanceIntervals'
  | 'directDeposits'
  | 'guards'
  | 'proposalProcedures'
  | 'subTransactions'
  | 'update'
  | 'votingProcedures';

/**
 * A rule of the mint handler's `issues_grant` that an issued grant breaks,
 * located by the output that holds its token where there is one.
 */
export type CustodyIssuedGrantProblem =
  | {
      readonly code:
        | 'address'
        | 'datum-malformed'
        | 'datum-not-inline'
        | 'reference-script'
        | 'value';
      readonly outputIndex: number;
    }
  /** The grant's generation is not the generation of the control output. */
  | {
      readonly code: 'generation-mismatch';
      readonly outputIndex: number;
      readonly generation: bigint;
      readonly expected: bigint;
    }
  | {
      readonly code: 'slot-mismatch';
      readonly outputIndex: number;
      readonly datumSlot: bigint;
    }
  /** Its token is not the next slot of the spent state, in name order. */
  | { readonly code: 'not-next-slot'; readonly expected: bigint }
  /** Outputs holding its token: exactly one must. */
  | { readonly code: 'output-count'; readonly count: number };

/**
 * Why a custody transaction is refused before anyone signs it. `code` is
 * what the hosted signer answers; `reason` names the rule. Refusals list in
 * the order the checks run, so the first one is the one to report.
 */
export type CustodyRefusal =
  /**
   * A device rewrite names another logic than the control input: an
   * upgrade, which Lace does not build or sign.
   */
  | {
      readonly account: CustodyAccountHashes;
      readonly after: HexBlob;
      readonly before: HexBlob;
      readonly code: 'custody-unsupported-operation';
      readonly reason: 'logic-changed';
    }
  | {
      readonly account: CustodyAccountHashes;
      readonly before: bigint;
      readonly after: bigint;
      readonly code: 'custody-malformed-datum';
      readonly reason: 'generation-decreased';
    }
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-context-mismatch';
      readonly reason:
        | 'account-not-operated'
        | 'control-output-without-control-input'
        | 'creation-without-record'
        | 'foreign-account'
        | 'initial-state'
        | 'multiple-control-inputs';
    }
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-device-not-listed';
      readonly keyHash: string;
      readonly reason: 'not-creator' | 'not-listed' | 'not-required-signer';
    }
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-device-not-listed';
      readonly reason: 'no-device-signer';
    }
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-malformed-datum';
      readonly count: number;
      readonly reason: 'control-output-count';
    }
  /** The rewrite moves a counter other than the grant tokens minted and burned do. */
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-malformed-datum';
      readonly counter: 'nextSlot' | 'outstanding';
      readonly expected: bigint;
      readonly actual: bigint;
      readonly reason: 'counter-mismatch';
    }
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-malformed-datum';
      readonly expiresAt: bigint;
      readonly reason: 'expired-grant';
      readonly slot: bigint;
    }
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-malformed-datum';
      readonly problem: CustodyIssuedGrantProblem;
      readonly reason: 'grant-output-invalid';
      readonly slot: bigint;
    }
  /** An issued grant breaks a rule the contract or Lace applies to every grant it authors. */
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-malformed-datum';
      readonly reason: 'grant-violation';
      readonly slot: bigint;
      readonly violation: CustodyGrantViolation;
    }
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-malformed-datum';
      readonly reason: 'state-violation';
      readonly violation: CustodyStateViolation;
    }
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-unsupported-operation';
      readonly count: number;
      readonly limit: number;
      readonly reason: 'grant-batch-limit';
    }
  /**
   * `grant-spend`: a grant spend the caller did not allow.
   * `grant-spend-foreign-input`: an input of an allowed grant spend outside
   * the account address; an agent spends from the account alone.
   */
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-unsupported-operation';
      readonly input: Cardano.TxIn;
      readonly reason: 'grant-spend-foreign-input' | 'grant-spend';
    }
  /** A grant spend carrying metadata, which only an owner attaches. */
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-unsupported-operation';
      readonly input: Cardano.TxIn;
      readonly reason: 'grant-spend-metadata';
    }
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-unsupported-operation';
      readonly input: Cardano.TxIn;
      readonly reason: 'grant-spend-violation';
      readonly violation: CustodyGrantSpendViolation;
    }
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-unsupported-operation';
      readonly input: Cardano.TxIn;
      readonly reason: 'sweep-not-dead';
      readonly slot: bigint;
    }
  /**
   * The transaction draws `quantity` lovelace from the stake credential of
   * `logic`, the logic the account's control datum names, where the drawn
   * lovelace cannot be shown to stay at the account address. Lovelace is
   * fungible, so the draw is credited to the account: it stays when the
   * account gives up no more lovelace than its part of the fee. A grant
   * spend pays out of the account by definition, so it may draw nothing.
   */
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-unsupported-operation';
      readonly logic: HexBlob;
      readonly quantity: bigint;
      readonly reason: 'logic-draw-leaves-account';
    }
  /**
   * The transaction operates the account without a withdrawal from the
   * stake credential of `logic`, the logic its control datum names. That
   * withdrawal runs the account's rules.
   */
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-unsupported-operation';
      readonly logic: HexBlob;
      readonly reason: 'logic-withdrawal-missing';
    }
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-unsupported-operation';
      readonly reason:
        | 'creation-without-registration'
        | 'fund-without-account-token'
        | 'grant-mint-without-control'
        | 'issue-sweep-mixed'
        | 'registration-without-creation'
        | 'stake-operation-without-control'
        | 'sweep-without-control';
    }
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-unsupported-operation';
      readonly reason: 'mint-redeemer-mismatch';
      readonly redeemer: CustodyMintRedeemer['kind'];
    }
  /**
   * The rewrite takes a slot off the revoked list without burning its grant
   * token, which would revive a revoked grant, or revokes a slot never issued
   * or already listed.
   */
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-unsupported-operation';
      readonly reason: 'revoked-slot-invalid' | 'revoked-slot-restored';
      readonly slot: bigint;
    }
  /** A grant token burned without its grant UTxO swept, or swept without its token burned. */
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-unsupported-operation';
      readonly reason: 'sweep-burn-mismatch';
      readonly slot: bigint;
    }
  /**
   * A control UTxO the transaction spends or references, or a control
   * output it writes, names a logic outside the contract version's
   * catalogue: rules Lace has not reviewed.
   */
  | {
      readonly account: CustodyAccountHashes;
      readonly code: 'custody-unsupported-version';
      readonly logic: HexBlob;
      readonly reason: 'unknown-logic';
    }
  | {
      readonly accountValidatorHash: string;
      readonly code: 'custody-context-mismatch';
      readonly reason: 'unused-account-validator';
    }
  | {
      readonly accountValidatorHash: string;
      readonly code: 'custody-unsupported-version';
      readonly reason: 'unsupported-contract-version';
    }
  | {
      readonly address: string;
      readonly code: 'custody-context-mismatch';
      readonly reason: 'network-mismatch';
    }
  | {
      readonly assetId: Cardano.AssetId;
      readonly code: 'custody-unsupported-operation';
      readonly quantity: bigint;
      readonly reason: 'foreign-mint' | 'unsupported-mint';
    }
  | {
      readonly certificateIndex: number;
      readonly certificateType: Cardano.CertificateType;
      readonly code: 'custody-unsupported-operation';
      readonly reason:
        | 'foreign-certificate'
        | 'refused-certificate'
        | 'unsupported-certificate';
    }
  /**
   * `reference-script-mismatch`: a reference input at the output reference
   * of a parked contract script, resolved without exactly that script.
   */
  | {
      readonly code: 'custody-context-mismatch';
      readonly input: Cardano.TxIn;
      readonly reason:
        | 'duplicate-resolution'
        | 'invalid-resolution'
        | 'redeemer-on-key-input'
        | 'reference-script-mismatch'
        | 'resolution-not-in-body';
    }
  | {
      readonly code: 'custody-context-mismatch';
      readonly input: Cardano.TxIn;
      readonly reason: 'redeemer-mismatch';
      readonly redeemer: CustodyAccountRedeemer['kind'];
    }
  | {
      readonly code: 'custody-context-mismatch';
      readonly input: Cardano.TxIn;
      readonly reason: 'unresolved-input';
      readonly source: CustodyInputSource;
    }
  /**
   * A known logic the transaction attaches without running it, or runs with
   * no control UTxO naming it: a resolution hides that control UTxO, or the
   * transaction cannot succeed.
   */
  | {
      readonly code: 'custody-context-mismatch';
      readonly logic: string;
      readonly reason: 'unused-logic';
    }
  | {
      readonly code: 'custody-context-mismatch';
      readonly reason: 'invalid-record';
      readonly recordError: CustodyAccountRecordError;
    }
  | {
      readonly code: 'custody-locked-output';
      readonly location: CustodyOutputLocation;
      readonly reason: 'datum-hash' | 'unspendable-address';
    }
  | {
      readonly code: 'custody-malformed-datum';
      readonly input: Cardano.TxIn;
      readonly reason:
        | 'control-input-datum'
        | 'control-input-value'
        | 'grant-input-datum'
        | 'grant-input-value';
    }
  | {
      readonly code: 'custody-malformed-datum';
      readonly outputIndex: number;
      readonly reason: 'control-output-datum' | 'control-output-value';
    }
  | {
      readonly code: 'custody-unsupported-operation';
      readonly field: CustodyUnsupportedBodyField;
      readonly reason: 'unsupported-body-field';
    }
  | {
      readonly code: 'custody-unsupported-operation';
      readonly index: number;
      readonly purpose: 'mint' | 'spend';
      readonly reason: 'missing-redeemer' | 'unknown-redeemer';
    }
  | {
      readonly code: 'custody-unsupported-operation';
      readonly index: number;
      readonly purpose: Cardano.RedeemerPurpose;
      readonly reason: 'duplicate-redeemer';
    }
  /**
   * `reference-control`: a control UTxO referenced by any transaction but a
   * grant spend of its account. `foreign-reference-script`: a reference
   * input carrying a reference script other than a contract script parked
   * at its pinned output reference on the inspected network.
   */
  | {
      readonly code: 'custody-unsupported-operation';
      readonly input: Cardano.TxIn;
      readonly reason: 'foreign-reference-script' | 'reference-control';
    }
  /** A reserve spent without the control UTxO, which only a device spends. */
  | {
      readonly code: 'custody-unsupported-operation';
      readonly input: Cardano.TxIn;
      readonly reason: 'reserve-without-control';
    }
  | {
      readonly code: 'custody-unsupported-operation';
      readonly location:
        | CustodyOutputLocation
        | { readonly input: Cardano.TxIn; readonly kind: 'input' };
      readonly reason: 'account-token-misplaced';
    }
  /**
   * An output at a custody account that holds no account token and is
   * neither a plain deposit nor a reserve in the format Lace writes: an
   * inline datum other than `d87980`, or a reference script.
   */
  | {
      readonly code: 'custody-unsupported-operation';
      readonly location: CustodyOutputLocation;
      readonly reason: 'deposit-reference-script' | 'foreign-reserve';
    }
  /** A reference script on the control output, which Lace never writes. */
  | {
      readonly code: 'custody-unsupported-operation';
      readonly outputIndex: number;
      readonly reason: 'control-output-reference-script';
    }
  /**
   * `auxiliary-data-hash-mismatch`: the body commits to auxiliary data the
   * transaction does not carry, or carries auxiliary data the body does not
   * commit to by that hash. `auxiliary-data-scripts`: auxiliary data holding
   * scripts, which consent cannot show as metadata.
   * `auxiliary-data-unreadable`: auxiliary data that does not decode.
   */
  | {
      readonly code: 'custody-unsupported-operation';
      readonly reason:
        | 'auxiliary-data-hash-mismatch'
        | 'auxiliary-data-scripts'
        | 'auxiliary-data-unreadable';
    }
  /**
   * `foreign-withdrawal`: a withdrawal from a credential that is neither
   * the stake script of a custody account the transaction names nor a known
   * logic. `duplicate-withdrawal`: a reward account the body's withdrawal
   * map names twice, which has no single reading.
   */
  | {
      readonly code: 'custody-unsupported-operation';
      readonly reason: 'duplicate-withdrawal' | 'foreign-withdrawal';
      readonly rewardAccount: Cardano.RewardAccount;
    };

export type CustodyRefusalCode = CustodyRefusal['code'];

/**
 * The order checks run in: the record, the caller's context, the account
 * UTxOs it resolves, a grant spend, unsupported shapes, the written datums,
 * the signing device, the initial state at creation and locked outputs.
 */
const STAGE: Record<CustodyRefusal['reason'], number> = {
  'unsupported-contract-version': 0,
  'invalid-record': 0,
  'unresolved-input': 1,
  'resolution-not-in-body': 1,
  'duplicate-resolution': 1,
  'invalid-resolution': 1,
  'network-mismatch': 1,
  'redeemer-mismatch': 1,
  'redeemer-on-key-input': 1,
  'reference-script-mismatch': 1,
  'unused-account-validator': 1,
  'unused-logic': 1,
  'multiple-control-inputs': 1,
  'foreign-account': 1,
  'account-not-operated': 1,
  'creation-without-record': 1,
  'control-output-without-control-input': 1,
  'control-input-datum': 2,
  'unknown-logic': 2,
  'control-input-value': 2,
  'grant-input-datum': 2,
  'grant-input-value': 2,
  'grant-spend': 3,
  'grant-spend-violation': 3,
  'grant-spend-foreign-input': 3,
  'grant-spend-metadata': 3,
  'unsupported-body-field': 4,
  'auxiliary-data-hash-mismatch': 4,
  'auxiliary-data-scripts': 4,
  'auxiliary-data-unreadable': 4,
  'missing-redeemer': 4,
  'unknown-redeemer': 4,
  'duplicate-redeemer': 4,
  'mint-redeemer-mismatch': 4,
  'foreign-certificate': 4,
  'refused-certificate': 4,
  'unsupported-certificate': 4,
  'foreign-withdrawal': 4,
  'duplicate-withdrawal': 4,
  'logic-draw-leaves-account': 4,
  'logic-withdrawal-missing': 4,
  'foreign-mint': 4,
  'unsupported-mint': 4,
  'issue-sweep-mixed': 4,
  'grant-batch-limit': 4,
  'grant-mint-without-control': 4,
  'reference-control': 4,
  'foreign-reference-script': 4,
  'creation-without-registration': 4,
  'fund-without-account-token': 4,
  'reserve-without-control': 4,
  'sweep-without-control': 4,
  'sweep-burn-mismatch': 4,
  'registration-without-creation': 4,
  'stake-operation-without-control': 4,
  'account-token-misplaced': 4,
  'foreign-reserve': 4,
  'deposit-reference-script': 4,
  'control-output-count': 5,
  'control-output-datum': 5,
  'control-output-value': 5,
  'control-output-reference-script': 5,
  'state-violation': 5,
  'counter-mismatch': 5,
  'generation-decreased': 5,
  'logic-changed': 5,
  'revoked-slot-restored': 5,
  'revoked-slot-invalid': 5,
  'grant-output-invalid': 5,
  'grant-violation': 5,
  'expired-grant': 5,
  'sweep-not-dead': 5,
  'no-device-signer': 6,
  'not-creator': 6,
  'not-listed': 6,
  'not-required-signer': 6,
  'initial-state': 7,
  'datum-hash': 8,
  'unspendable-address': 8,
};

/** Refusals in check order; refusals of one stage keep the order found. */
export const inCheckOrder = (
  refusals: readonly CustodyRefusal[],
): CustodyRefusal[] =>
  refusals
    .map((refusal, position) => ({ refusal, position }))
    .sort(
      (a, b) =>
        STAGE[a.refusal.reason] - STAGE[b.refusal.reason] ||
        a.position - b.position,
    )
    .map(({ refusal }) => refusal);
