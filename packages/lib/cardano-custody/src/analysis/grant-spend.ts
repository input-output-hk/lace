// Ported from Biglup/cardano-account-custody-contract
// lib/cardano_account_custody_contract/grant.ak and `grant_spend_rule` of
// lib/cardano_account_custody_contract/rules.ak at revision
// b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0). Modified for Lace:
// each rule reports a typed violation instead of failing, so a builder or a
// signer learns every rule a transaction breaks.

import { recipientKey } from '../codecs/recipient';
import { isCustodyLovelaceAsset } from '../state/rules';

import {
  decodedInlineGrant,
  decodedInlineState,
  grantAssetIdOf,
  holdsAccountToken,
  holdsMisplacedAccountToken,
  holdsOnlyLovelaceAndGrantToken,
  isControlOutput,
} from './outputs';
import {
  addValueDeltas,
  isAssetIdOf,
  negateValueDelta,
  policyIdOf,
  quantityOfAsset,
} from './value';

import type { CustodyAccountHashes, OutputView } from './outputs';
import type { CustodyValueDelta } from './value';
import type {
  CustodyAccountState,
  CustodyGrant,
  CustodyScope,
} from '../codecs/account-state';
import type { Cardano } from '@cardano-sdk/core';
import type { HexBlob } from '@cardano-sdk/util';

/**
 * POSIX milliseconds at which a slot starts on the account's network. The
 * ledger hands a script the start of the `invalidBefore` slot as the lower
 * validity bound and the start of the `invalidHereafter` slot as the upper
 * one.
 */
export type CustodySlotToPosixMs = (slot: Cardano.Slot) => number;

/** A rule of `stays_within_scope` that a net outflow breaks. */
export type CustodyScopeViolation =
  | {
      readonly assetId: Cardano.AssetId;
      readonly code: 'foreign-asset-outflow';
      readonly outflow: bigint;
    }
  | {
      readonly code:
        | 'cap-exceeded'
        | 'lovelace-cap-exceeded'
        | 'lovelace-per-call-cap-exceeded'
        | 'per-call-cap-exceeded';
      readonly limit: bigint;
      readonly outflow: bigint;
      /**
       * The fee the account pays, which a lovelace `outflow` includes, when
       * the caller names it: the payment is `outflow - fee`. A caller that
       * checks before building names an estimate no lower than the fee, so
       * a cap of `outflow` covers the payment. Absent when the outflow is of
       * a token.
       */
      readonly fee?: bigint;
    };

/** Where a spent input or an output sits in the list it belongs to. */
interface CustodyInputOrOutputLocation {
  readonly index: number;
  readonly kind: 'input' | 'output';
}

/**
 * A rule of the logic's grant spend rule, which a `SpendWithGrant` spend
 * runs, that a transaction breaks. A spend the contract accepts has none.
 */
export type CustodyGrantSpendViolation =
  | CustodyScopeViolation
  | {
      readonly code:
        | 'grant-output-address'
        | 'grant-output-reference-script'
        | 'grant-output-value';
      readonly outputIndex: number;
    }
  | {
      readonly code: 'account-token-misplaced';
      readonly location: CustodyInputOrOutputLocation;
    }
  /**
   * An output away from the account to no listed recipient, or one back to
   * the account that holds no account token yet carries a datum or a
   * reference script: a reserve, which an agent may not create.
   */
  | {
      readonly code: 'deposit-not-plain' | 'recipient-not-allowed';
      readonly outputIndex: number;
    }
  | {
      readonly code: 'expired';
      readonly expiresAt: bigint;
      /** What the slot converter returned for the upper bound. */
      readonly upperBoundMs: number;
    }
  | {
      readonly code: 'grant-not-current';
      readonly liveness: 'future-generation' | 'revoked' | 'superseded';
    }
  /** A cap of the recreated grant outside zero to its old value less the outflow. */
  | {
      readonly code: 'grant-output-cap';
      readonly outputIndex: number;
      readonly field: 'cap' | 'lovelaceCap';
      readonly actual: bigint;
      readonly expected: bigint;
    }
  /** The recreated grant has no inline grant datum, or changes a field other than the caps. */
  | {
      readonly code: 'grant-output-datum';
      readonly outputIndex: number;
      readonly reason: 'field-changed' | 'malformed' | 'not-inline';
    }
  | {
      readonly code: 'mint-under-policy';
      readonly assetId: Cardano.AssetId;
      readonly quantity: bigint;
    }
  /** The spend must be the only input holding a token of the account. */
  | { readonly code: 'account-token-inputs'; readonly count: number }
  /** The spent grant UTxO carries no inline datum that decodes as a grant. */
  | { readonly code: 'grant-datum-invalid' }
  /** The spent grant UTxO holds more than lovelace and the token of its datum's slot. */
  | { readonly code: 'grant-input-value' }
  /** Outputs holding the grant token: exactly one must recreate the grant. */
  | { readonly code: 'grant-output-count'; readonly count: number }
  | { readonly code: 'grantee-not-signer'; readonly grantee: HexBlob }
  | { readonly code: 'no-upper-bound' }
  /** Reference inputs that are the account's control UTxO: exactly one is required. */
  | { readonly code: 'referenced-control-count'; readonly count: number }
  | { readonly code: 'referenced-control-datum' };

/** A grant spend whose views and upper bound are already read. */
interface GrantSpendFacts {
  /** The resolution of the input spent with `SpendWithGrant`. */
  readonly grantInput: OutputView;
  readonly inputs: readonly OutputView[];
  readonly referenceInputs: readonly OutputView[];
  readonly outputs: readonly OutputView[];
  /** Lower-case asset ids. */
  readonly mint: ReadonlyMap<Cardano.AssetId, bigint>;
  /** Lower-case key hashes. */
  readonly requiredSigners: ReadonlySet<string>;
  /** The upper bound in POSIX milliseconds; undefined when open. */
  readonly upperBoundMs: number | undefined;
  readonly account: CustodyAccountHashes;
}

const valueAt = (
  views: readonly OutputView[],
  plutusAddressKey: string | undefined,
): CustodyValueDelta =>
  addValueDeltas(
    views
      .filter(
        view =>
          view.plutusAddressKey !== undefined &&
          view.plutusAddressKey === plutusAddressKey,
      )
      .map(view => view.value),
  );

/** `leaving_value` over outputs that are already read. */
export const leavingValueAt = (
  inputs: readonly OutputView[],
  outputs: readonly OutputView[],
  plutusAddressKey: string | undefined,
): CustodyValueDelta =>
  addValueDeltas([
    valueAt(inputs, plutusAddressKey),
    negateValueDelta(valueAt(outputs, plutusAddressKey)),
  ]);

/**
 * Every rule of `stays_within_scope` a net outflow breaks: the scoped asset
 * within its per call and remaining caps; for a token scope, lovelace within
 * both lovelace caps; and no other asset class leaving. A net inflow breaks
 * nothing.
 *
 * @param accountFee - the fee the account pays, which `leaving.lovelace`
 *   already includes; each violation whose outflow is lovelace reports it
 *   as `fee`
 */
export const findCustodyScopeViolations = (
  scope: CustodyScope,
  leaving: CustodyValueDelta,
  accountFee?: bigint,
): CustodyScopeViolation[] => {
  const violations: CustodyScopeViolation[] = [];
  const isLovelaceScope = isCustodyLovelaceAsset(scope.asset);
  const lovelaceFee = accountFee === undefined ? {} : { fee: accountFee };
  const assetFee = isLovelaceScope ? lovelaceFee : {};
  const assetOutflow = quantityOfAsset(leaving, scope.asset);
  if (assetOutflow > scope.perCallCap) {
    violations.push({
      code: 'per-call-cap-exceeded',
      outflow: assetOutflow,
      limit: scope.perCallCap,
      ...assetFee,
    });
  }
  if (assetOutflow > scope.cap) {
    violations.push({
      code: 'cap-exceeded',
      outflow: assetOutflow,
      limit: scope.cap,
      ...assetFee,
    });
  }
  if (!isLovelaceScope) {
    if (leaving.lovelace > scope.lovelacePerCallCap) {
      violations.push({
        code: 'lovelace-per-call-cap-exceeded',
        outflow: leaving.lovelace,
        limit: scope.lovelacePerCallCap,
        ...lovelaceFee,
      });
    }
    if (leaving.lovelace > scope.lovelaceCap) {
      violations.push({
        code: 'lovelace-cap-exceeded',
        outflow: leaving.lovelace,
        limit: scope.lovelaceCap,
        ...lovelaceFee,
      });
    }
  }
  for (const [assetId, quantity] of leaving.assets) {
    if (quantity > 0n && !isAssetIdOf(assetId, scope.asset)) {
      violations.push({
        code: 'foreign-asset-outflow',
        assetId,
        outflow: quantity,
      });
    }
  }
  return violations;
};

const clampedOutflow = (quantity: bigint): bigint =>
  quantity > 0n ? quantity : 0n;

/**
 * `grant_after_spend`: the grant with `cap`, and for a token grant
 * `lovelaceCap`, lowered by the net outflow of its asset, never raised by a
 * net deposit. These are the most the recreated grant may keep: the
 * contract accepts any cap from zero to this value, so a builder may write
 * lower caps that already count a fee it has not yet computed.
 */
export const custodyGrantAfterSpend = (
  grant: CustodyGrant,
  leaving: CustodyValueDelta,
): CustodyGrant => {
  const { scope } = grant;
  return {
    ...grant,
    scope: {
      ...scope,
      cap: scope.cap - clampedOutflow(quantityOfAsset(leaving, scope.asset)),
      lovelaceCap: isCustodyLovelaceAsset(scope.asset)
        ? scope.lovelaceCap
        : scope.lovelaceCap - clampedOutflow(leaving.lovelace),
    },
  };
};

/** `ends_before_expiry`: a finite upper bound no later than the expiry. */
const findExpiryViolation = (
  upperBoundMs: number | undefined,
  expiresAt: bigint,
): CustodyGrantSpendViolation | undefined => {
  if (upperBoundMs === undefined) return { code: 'no-upper-bound' };
  // A converter that yields no exact instant cannot prove the bound is early enough.
  return Number.isSafeInteger(upperBoundMs) && BigInt(upperBoundMs) <= expiresAt
    ? undefined
    : { code: 'expired', upperBoundMs, expiresAt };
};

const findMisplacedAccountTokens = (
  facts: GrantSpendFacts,
): CustodyGrantSpendViolation[] =>
  (
    [
      ['input', facts.inputs],
      ['output', facts.outputs],
    ] as const
  ).flatMap(([kind, views]) =>
    views.flatMap((view, index) =>
      holdsMisplacedAccountToken(view, [facts.account.accountValidatorHash])
        ? [
            {
              code: 'account-token-misplaced' as const,
              location: { kind, index },
            },
          ]
        : [],
    ),
  );

/** `pays_only_recipients` and `deposits_are_plain`, per output. */
const findOutputViolations = (
  facts: GrantSpendFacts,
  grant: CustodyGrant,
): CustodyGrantSpendViolation[] => {
  const { recipients } = grant.scope;
  const recipientKeys = new Set(recipients.map(recipientKey));
  const { plutusAddressKey } = facts.grantInput;
  return facts.outputs.flatMap((view, outputIndex) => {
    const violations: CustodyGrantSpendViolation[] = [];
    const isBack =
      view.plutusAddressKey !== undefined &&
      view.plutusAddressKey === plutusAddressKey;
    if (
      recipients.length > 0 &&
      !isBack &&
      (view.plutusAddressKey === undefined ||
        !recipientKeys.has(view.plutusAddressKey))
    ) {
      violations.push({ code: 'recipient-not-allowed', outputIndex });
    }
    if (
      isBack &&
      !holdsAccountToken(view, facts.account) &&
      (view.datumKind !== 'none' || view.hasReferenceScript)
    ) {
      violations.push({ code: 'deposit-not-plain', outputIndex });
    }
    return violations;
  });
};

/** `referenced_control`: the account's control UTxO among the reference inputs, exactly once. */
const findReferencedControl = (
  facts: GrantSpendFacts,
): {
  readonly state?: CustodyAccountState;
  readonly violations: readonly CustodyGrantSpendViolation[];
} => {
  const controls = facts.referenceInputs.filter(view =>
    isControlOutput(view, facts.account),
  );
  if (controls.length !== 1) {
    return {
      violations: [
        { code: 'referenced-control-count', count: controls.length },
      ],
    };
  }
  const state = decodedInlineState(controls[0]);
  return state
    ? { state, violations: [] }
    : { violations: [{ code: 'referenced-control-datum' }] };
};

/** `is_current`, naming why a grant is not current against the referenced state. */
const findCurrencyViolation = (
  grant: CustodyGrant,
  state: CustodyAccountState,
): CustodyGrantSpendViolation | undefined => {
  if (grant.generation < state.grantGeneration) {
    return { code: 'grant-not-current', liveness: 'superseded' };
  }
  if (grant.generation > state.grantGeneration) {
    return { code: 'grant-not-current', liveness: 'future-generation' };
  }
  return state.revoked.includes(grant.slot)
    ? { code: 'grant-not-current', liveness: 'revoked' }
    : undefined;
};

const isSameExceptCaps = (actual: CustodyGrant, expected: CustodyGrant) => {
  const a = actual.scope;
  const b = expected.scope;
  return (
    actual.slot === expected.slot &&
    actual.grantee === expected.grantee &&
    actual.generation === expected.generation &&
    a.asset.policyId === b.asset.policyId &&
    a.asset.assetName === b.asset.assetName &&
    a.perCallCap === b.perCallCap &&
    a.lovelacePerCallCap === b.lovelacePerCallCap &&
    a.expiresAt === b.expiresAt &&
    a.recipients.length === b.recipients.length &&
    a.recipients.every(
      (recipient, index) =>
        recipientKey(recipient) === recipientKey(b.recipients[index]),
    )
  );
};

const isSameValue = (a: CustodyValueDelta, b: CustodyValueDelta): boolean =>
  a.lovelace === b.lovelace &&
  a.assets.size === b.assets.size &&
  [...a.assets].every(
    ([assetId, quantity]) => b.assets.get(assetId) === quantity,
  );

/**
 * `find_grant_output` and the checks on it: one output holding the grant
 * token, at the spent UTxO's address with its exact value and no reference
 * script, carrying the grant with every field kept but caps lowered within
 * `carries_grant_within`.
 */
const findGrantOutputViolations = (
  facts: GrantSpendFacts,
  grant: CustodyGrant,
  expected: CustodyGrant,
): CustodyGrantSpendViolation[] => {
  const assetId = grantAssetIdOf(facts.account, grant.slot);
  const holders = facts.outputs.flatMap((view, outputIndex) =>
    assetId !== undefined && view.value.assets.get(assetId) === 1n
      ? [{ view, outputIndex }]
      : [],
  );
  if (holders.length !== 1) {
    return [{ code: 'grant-output-count', count: holders.length }];
  }
  const [{ view, outputIndex }] = holders;
  const violations: CustodyGrantSpendViolation[] = [];
  if (
    view.plutusAddressKey === undefined ||
    view.plutusAddressKey !== facts.grantInput.plutusAddressKey
  ) {
    violations.push({ code: 'grant-output-address', outputIndex });
  }
  if (!isSameValue(view.value, facts.grantInput.value)) {
    violations.push({ code: 'grant-output-value', outputIndex });
  }
  if (view.hasReferenceScript) {
    violations.push({ code: 'grant-output-reference-script', outputIndex });
  }
  if (view.inlineDatum === undefined) {
    return [
      ...violations,
      { code: 'grant-output-datum', outputIndex, reason: 'not-inline' },
    ];
  }
  const actual = decodedInlineGrant(view);
  if (!actual) {
    return [
      ...violations,
      { code: 'grant-output-datum', outputIndex, reason: 'malformed' },
    ];
  }
  if (!isSameExceptCaps(actual, expected)) {
    violations.push({
      code: 'grant-output-datum',
      outputIndex,
      reason: 'field-changed',
    });
  }
  for (const field of ['cap', 'lovelaceCap'] as const) {
    const capActual = actual.scope[field];
    const capExpected = expected.scope[field];
    if (capActual < 0n || capActual > capExpected) {
      violations.push({
        code: 'grant-output-cap',
        outputIndex,
        field,
        actual: capActual,
        expected: capExpected,
      });
    }
  }
  return violations;
};

/** Every violation of a grant spend whose views are already read. */
export const grantSpendViolationsOf = (
  facts: GrantSpendFacts,
): CustodyGrantSpendViolation[] => {
  const grant = decodedInlineGrant(facts.grantInput);
  if (!grant) return [{ code: 'grant-datum-invalid' }];
  const violations: CustodyGrantSpendViolation[] = [];
  if (
    !holdsOnlyLovelaceAndGrantToken(
      facts.grantInput.value,
      facts.account,
      grant.slot,
    )
  ) {
    violations.push({ code: 'grant-input-value' });
  }
  const tokenInputs = facts.inputs.filter(view =>
    holdsAccountToken(view, facts.account),
  ).length;
  if (tokenInputs !== 1) {
    violations.push({ code: 'account-token-inputs', count: tokenInputs });
  }
  const control = findReferencedControl(facts);
  violations.push(...control.violations);
  const currency = control.state && findCurrencyViolation(grant, control.state);
  if (currency) violations.push(currency);
  if (!facts.requiredSigners.has(grant.grantee)) {
    violations.push({ code: 'grantee-not-signer', grantee: grant.grantee });
  }
  const expiry = findExpiryViolation(facts.upperBoundMs, grant.scope.expiresAt);
  if (expiry) violations.push(expiry);
  const leaving = leavingValueAt(
    facts.inputs,
    facts.outputs,
    facts.grantInput.plutusAddressKey,
  );
  return [
    ...violations,
    ...findCustodyScopeViolations(grant.scope, leaving),
    ...findOutputViolations(facts, grant),
    ...findMisplacedAccountTokens(facts),
    ...findGrantOutputViolations(
      facts,
      grant,
      custodyGrantAfterSpend(grant, leaving),
    ),
    ...[...facts.mint]
      .filter(
        ([assetId]) =>
          policyIdOf(assetId) === facts.account.accountValidatorHash,
      )
      .map(
        ([assetId, quantity]): CustodyGrantSpendViolation => ({
          code: 'mint-under-policy',
          assetId,
          quantity,
        }),
      ),
  ];
};
