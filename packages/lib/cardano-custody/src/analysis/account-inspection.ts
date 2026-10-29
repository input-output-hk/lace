// Ported from Biglup/cardano-account-custody-contract validators/account.ak,
// validators/account_stake.ak, validators/logic_v1.ak and
// lib/cardano_account_custody_contract/{account,logic,rules}.ak at revision
// b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0). Modified for Lace:
// the conditions the proxy and the logic set on one account are read off a
// transaction and its caller-supplied resolutions to report the account's
// effects, and Lace adds refusals for shapes it never builds.

import { Cardano } from '@cardano-sdk/core';

import { decodeCustodyGrant } from '../codecs/account-state';
import {
  decodeCustodyAccountRedeemer,
  decodeCustodyMintRedeemer,
} from '../codecs/redeemers';
import { isCustodyReserveDatum } from '../codecs/reserve';
import {
  findCustodyLogic,
  SUPPORTED_CUSTODY_CONTRACT_VERSIONS,
} from '../contract-version';
import {
  CUSTODY_MAX_GRANT_BATCH,
  findCustodyGrantViolations,
  findCustodyStateViolations,
  isCustodyGrantExpired,
} from '../state/rules';
import { parseCustodyAccountTokenName } from '../tokens';

import { accountFeeSharesOf } from './fee-shares';
import { grantSpendViolationsOf, leavingValueAt } from './grant-spend';
import {
  accountAddressOf,
  accountPlutusAddressKey,
  accountRewardAccountOf,
  accountUtxoKindOf,
  decodedInlineGrant,
  decodedInlineState,
  grantAssetIdOf,
  holdsOnlyLovelaceAndGrantToken,
  holdsOnlyLovelaceAndStateNft,
  isAtAccount,
  isControlOutput,
  stateNftAssetIdOf,
} from './outputs';
import { diffCustodyStates } from './state-change';
import {
  redeemerData,
  scriptHashOfRewardAccount,
  stakeCredentialOf,
} from './transaction-facts';
import { assetNameOf, policyIdOf } from './value';

import type {
  CustodyAccountState,
  CustodyGrant,
} from '../codecs/account-state';
import type {
  CustodyAccountRedeemer,
  CustodyMintRedeemer,
} from '../codecs/redeemers';
import type { CustodyContractVersion } from '../contract-version';
import type { CustodyAccountIdentity } from '../identity';
import type {
  CustodyAccountCertificate,
  CustodyAccountInspection,
  CustodyFeeShares,
  CustodyGrantDeath,
  CustodyGrantSpendReport,
  CustodyInspectionOptions,
  CustodyIssuedGrantReport,
  CustodyOperation,
  CustodySweptGrantReport,
} from './inspect';
import type { CustodyAccountHashes, OutputView } from './outputs';
import type { CustodyIssuedGrantProblem, CustodyRefusal } from './refusals';
import type { CustodyStateChange } from './state-change';
import type { InputView, TransactionFacts } from './transaction-facts';
import type { CustodyValueDelta } from './value';
import type { CustodyStateViolation } from '../state/rules';
import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import type { HexBlob } from '@cardano-sdk/util';

export interface AccountCandidate extends CustodyAccountHashes {
  readonly contractVersion: CustodyContractVersion;
}

export interface InspectionScope {
  readonly options: CustodyInspectionOptions;
  readonly record: CustodyAccountIdentity | undefined;
  /** Lower-case. */
  readonly deviceKeyHash: string | undefined;
}

const accountKey = (account: CustodyAccountHashes): string =>
  `${account.accountValidatorHash}${account.stakeScriptHash}`;

export const hashesOf = (
  account: CustodyAccountHashes,
): CustodyAccountHashes => ({
  accountValidatorHash: account.accountValidatorHash,
  stakeScriptHash: account.stakeScriptHash,
});

export const versionOfPolicy = (
  policyId: string,
): CustodyContractVersion | undefined =>
  SUPPORTED_CUSTODY_CONTRACT_VERSIONS.find(
    version => version.accountValidatorHash === policyId,
  );

/**
 * Every custody account the transaction names: by an input, reference input
 * or output at its address, by a mint of one of its account tokens, or by
 * the record.
 */
export const findCandidates = (
  facts: TransactionFacts,
  record: CustodyAccountIdentity | undefined,
): AccountCandidate[] => {
  const candidates = new Map<string, AccountCandidate>();
  const add = (candidate: AccountCandidate) =>
    candidates.set(accountKey(candidate), candidate);
  const views = [
    ...facts.inputs.map(({ output }) => output),
    ...facts.referenceInputs.map(({ output }) => output),
    ...facts.outputs,
  ];
  for (const { addressClass } of views) {
    if (addressClass.kind === 'account') {
      add({
        contractVersion: addressClass.contractVersion,
        accountValidatorHash: addressClass.contractVersion.accountValidatorHash,
        stakeScriptHash: addressClass.stakeScriptHash,
      });
    }
  }
  for (const assetId of facts.mint.keys()) {
    const contractVersion = versionOfPolicy(policyIdOf(assetId));
    const name = parseCustodyAccountTokenName(assetNameOf(assetId));
    if (contractVersion && name) {
      add({
        contractVersion,
        accountValidatorHash: contractVersion.accountValidatorHash,
        stakeScriptHash: name.stakeScriptHash,
      });
    }
  }
  if (record) {
    add({
      contractVersion: record.contractVersion,
      accountValidatorHash: record.contractVersion.accountValidatorHash,
      stakeScriptHash: record.stakeScriptHash,
    });
  }
  return [...candidates.values()];
};

const VOTE_DELEGATIONS: ReadonlySet<Cardano.CertificateType> = new Set([
  Cardano.CertificateType.StakeRegistrationDelegation,
  Cardano.CertificateType.StakeVoteDelegation,
  Cardano.CertificateType.StakeVoteRegistrationDelegation,
  Cardano.CertificateType.VoteDelegation,
  Cardano.CertificateType.VoteRegistrationDelegation,
]);

interface AccountEffects {
  readonly certificates: readonly CustodyAccountCertificate[];
  readonly withdrawal: bigint | undefined;
  readonly refusals: readonly CustodyRefusal[];
  /** Whether a certificate or withdrawal names the account. */
  readonly isStaked: boolean;
}

/**
 * The certificates on the account's stake credential and the withdrawal
 * from its reward account, apart from the logic run, which withdraws from
 * the logic's credential. Registration with a deposit and pool delegation
 * are what Lace builds; vote and combined delegations are valid on chain
 * but unsupported, and every other certificate is refused.
 */
const readStakeEffects = (
  account: AccountCandidate,
  facts: TransactionFacts,
): AccountEffects => {
  const refusals: CustodyRefusal[] = [];
  const certificates: CustodyAccountCertificate[] = [];
  let isStaked = false;
  for (const [certificateIndex, certificate] of (
    facts.body.certificates ?? []
  ).entries()) {
    const credential = stakeCredentialOf(certificate);
    if (
      credential?.type !== Cardano.CredentialType.ScriptHash ||
      credential.hash !== account.stakeScriptHash
    ) {
      continue;
    }
    isStaked = true;
    if (certificate.__typename === Cardano.CertificateType.Registration) {
      certificates.push({
        certificateIndex,
        kind: 'registration',
        deposit: certificate.deposit,
      });
    } else if (
      certificate.__typename === Cardano.CertificateType.StakeDelegation
    ) {
      certificates.push({
        certificateIndex,
        kind: 'pool-delegation',
        poolId: certificate.poolId,
      });
    } else {
      refusals.push({
        code: 'custody-unsupported-operation',
        reason: VOTE_DELEGATIONS.has(certificate.__typename)
          ? 'unsupported-certificate'
          : 'refused-certificate',
        certificateIndex,
        certificateType: certificate.__typename,
      });
    }
  }
  const withdrawal = (facts.body.withdrawals ?? []).find(
    ({ stakeAddress }) =>
      scriptHashOfRewardAccount(stakeAddress) === account.stakeScriptHash,
  );
  return {
    certificates,
    withdrawal: withdrawal?.quantity,
    refusals,
    isStaked: isStaked || withdrawal !== undefined,
  };
};

/** The logic an account operates under in a transaction and what its run draws. */
interface LogicRun {
  readonly logic: HexBlob;
  readonly draw: bigint;
}

/**
 * The run of the logic the account operates under: the logic its spent
 * control UTxO names, the referenced one for a grant spend, or the control
 * output's at creation. The proxy requires a withdrawal from that logic's
 * stake credential, which makes the ledger run it. The decoded body keeps
 * one withdrawal per reward account; a repeat in the bytes is refused.
 */
const readLogicRun = (
  account: CustodyAccountHashes,
  facts: TransactionFacts,
  logic: HexBlob | undefined,
): {
  readonly run?: LogicRun;
  readonly refusals: readonly CustodyRefusal[];
} => {
  if (logic === undefined) return { refusals: [] };
  const withdrawal = (facts.body.withdrawals ?? []).find(
    ({ stakeAddress }) => scriptHashOfRewardAccount(stakeAddress) === logic,
  );
  return withdrawal
    ? { run: { logic, draw: withdrawal.quantity }, refusals: [] }
    : {
        refusals: [
          {
            code: 'custody-unsupported-operation',
            reason: 'logic-withdrawal-missing',
            account,
            logic,
          },
        ],
      };
};

/**
 * A device whose key hash is not 28 bytes can never sign, and the contract
 * does not check key lengths, so an on-chain state may keep one. Lace never
 * adds one, but a device can still remove it in a rewrite that keeps it
 * meanwhile.
 */
const isCarriedOver = (
  violation: CustodyStateViolation,
  before: CustodyAccountState | undefined,
): boolean =>
  before !== undefined &&
  violation.code === 'invalid-device-key-hash' &&
  before.devices.includes(violation.device);

/** A control state a device rewrite or a creation writes; `before` is absent at creation. */
interface WrittenState {
  readonly account: CustodyAccountHashes;
  readonly before: CustodyAccountState | undefined;
  readonly after: CustodyAccountState;
}

/** The authoring checks a state written by a device or a creation must pass. */
const checkWrittenState = ({
  account,
  before,
  after,
}: WrittenState): CustodyRefusal[] =>
  findCustodyStateViolations(after)
    .filter(violation => !isCarriedOver(violation, before))
    .map(
      (violation): CustodyRefusal => ({
        code: 'custody-malformed-datum',
        reason: 'state-violation',
        account,
        violation,
      }),
    );

export const isSameAccount = (
  account: CustodyAccountHashes,
  record: CustodyAccountIdentity | undefined,
): record is CustodyAccountIdentity =>
  record !== undefined &&
  record.contractVersion.accountValidatorHash ===
    account.accountValidatorHash &&
  record.stakeScriptHash === account.stakeScriptHash;

/**
 * Lace creates only the creator-only state: the current logic of the
 * account's contract version, the creator as the single device, generation
 * zero and no grant issued, revoked or outstanding. The logic also accepts
 * any generation at creation.
 */
const isCreatorOnly = (
  state: CustodyAccountState,
  creator: string,
  logic: string,
) =>
  state.logic === logic &&
  state.devices.length === 1 &&
  state.devices[0] === creator &&
  state.grantGeneration === 0n &&
  state.nextSlot === 0n &&
  state.revoked.length === 0 &&
  state.outstanding === 0n;

/**
 * At creation the stake validator needs the creator's signature, and Lace
 * creates only the creator-only state; otherwise a device listed in the
 * spent state must sign.
 */
const checkSigner = (
  { account, before, after }: WrittenState,
  facts: TransactionFacts,
  scope: InspectionScope,
): CustodyRefusal[] => {
  const { deviceKeyHash } = scope;
  const refusals: CustodyRefusal[] = [];
  const notSigning = (keyHash: string): CustodyRefusal[] =>
    facts.requiredSigners.has(keyHash)
      ? []
      : [
          {
            code: 'custody-device-not-listed',
            reason: 'not-required-signer',
            account,
            keyHash,
          },
        ];
  if (!before) {
    if (!isSameAccount(account, scope.record)) {
      return scope.record
        ? []
        : [
            {
              code: 'custody-context-mismatch',
              reason: 'creation-without-record',
              account,
            },
          ];
    }
    const creator = scope.record.creatorKeyHash;
    if (deviceKeyHash !== undefined && deviceKeyHash !== creator) {
      refusals.push({
        code: 'custody-device-not-listed',
        reason: 'not-creator',
        account,
        keyHash: deviceKeyHash,
      });
    }
    refusals.push(...notSigning(creator));
    if (
      !isCreatorOnly(
        after,
        creator,
        scope.record.contractVersion.currentLogicHash,
      )
    ) {
      refusals.push({
        code: 'custody-context-mismatch',
        reason: 'initial-state',
        account,
      });
    }
    return refusals;
  }
  if (deviceKeyHash === undefined) {
    return before.devices.some(device => facts.requiredSigners.has(device))
      ? []
      : [
          {
            code: 'custody-device-not-listed',
            reason: 'no-device-signer',
            account,
          },
        ];
  }
  if (!before.devices.includes(deviceKeyHash as HexBlob)) {
    refusals.push({
      code: 'custody-device-not-listed',
      reason: 'not-listed',
      account,
      keyHash: deviceKeyHash,
    });
  }
  return [...refusals, ...notSigning(deviceKeyHash)];
};

type AccountUtxoKind = ReturnType<typeof accountUtxoKindOf>;

interface SpentAccountInput extends InputView {
  readonly kind: AccountUtxoKind;
  /** Absent when the input has no spend redeemer that decodes. */
  readonly redeemer: CustodyAccountRedeemer | undefined;
}

/** The redeemers the contract lets spend each kind of account UTxO. */
const REDEEMERS_OF: Record<
  AccountUtxoKind,
  readonly CustodyAccountRedeemer['kind'][]
> = {
  control: ['device'],
  grant: ['spendWithGrant', 'sweepGrant'],
  reserve: ['fund'],
  fund: ['fund'],
};

/**
 * The account inputs by kind, each with its spend redeemer, which must fit
 * the UTxO it spends. A plain deposit rides on any account token spent
 * beside it; a reserve needs the control UTxO, so only a device spends it.
 */
const readAccountInputs = (
  account: CustodyAccountHashes,
  facts: TransactionFacts,
) => {
  const refusals: CustodyRefusal[] = [];
  const spent = facts.inputs.flatMap(
    (view, redeemerIndex): SpentAccountInput[] => {
      if (!isAtAccount(view.output, account)) return [];
      const kind = accountUtxoKindOf(view.output, account);
      const data = redeemerData(
        facts,
        Cardano.RedeemerPurpose.spend,
        redeemerIndex,
      );
      // Plutus data may be the integer zero, so absence is tested explicitly.
      const decoded =
        data === undefined ? undefined : decodeCustodyAccountRedeemer(data);
      if (!decoded?.ok) {
        refusals.push({
          code: 'custody-unsupported-operation',
          reason: decoded ? 'unknown-redeemer' : 'missing-redeemer',
          purpose: 'spend',
          index: redeemerIndex,
        });
        return [{ ...view, kind, redeemer: undefined }];
      }
      if (!REDEEMERS_OF[kind].includes(decoded.value.kind)) {
        refusals.push({
          code: 'custody-context-mismatch',
          reason: 'redeemer-mismatch',
          input: view.input,
          redeemer: decoded.value.kind,
        });
      }
      return [{ ...view, kind, redeemer: decoded.value }];
    },
  );
  const ofKind = (kind: AccountUtxoKind) =>
    spent.filter(input => input.kind === kind);
  const controls = ofKind('control');
  const grants = ofKind('grant');
  const reserves = ofKind('reserve');
  const funds = ofKind('fund');
  if (controls.length === 0) {
    refusals.push(
      ...reserves.map(
        ({ input }): CustodyRefusal => ({
          code: 'custody-unsupported-operation',
          reason: 'reserve-without-control',
          input,
        }),
      ),
    );
  }
  if (funds.length > 0 && controls.length + grants.length === 0) {
    refusals.push({
      code: 'custody-unsupported-operation',
      reason: 'fund-without-account-token',
      account,
    });
  }
  return {
    controls,
    spends: grants.filter(
      ({ redeemer }) => redeemer?.kind === 'spendWithGrant',
    ),
    sweeps: grants.filter(({ redeemer }) => redeemer?.kind === 'sweepGrant'),
    reserves,
    funds,
    isSpent: spent.length > 0,
    refusals,
  };
};

type AccountInputs = ReturnType<typeof readAccountInputs>;

/** A grant token minted or burned under the account's own policy. */
interface GrantMint {
  readonly slot: bigint;
  readonly assetId: Cardano.AssetId;
}

const bySlot = (a: GrantMint, b: GrantMint) =>
  a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : 0;

/**
 * What a mint under one account validator policy does, by the shape of its
 * names: one state NFT name creates an account; grant names of one account,
 * each at +1 or each at -1, issue or burn its grants. One mint redeemer runs
 * per policy, so `mixed` issues and burns at once, which no redeemer allows,
 * and any other shape is `invalid`.
 */
type CustodyMintShape =
  | {
      readonly kind: 'burn' | 'issue' | 'mixed';
      readonly stakeScriptHash: Hash28ByteBase16;
    }
  | { readonly kind: 'creation'; readonly stakeScriptHash: Hash28ByteBase16 }
  | { readonly kind: 'invalid' };

export const mintShapeOf = (
  entries: readonly (readonly [Cardano.AssetId, bigint])[],
): CustodyMintShape => {
  const names = entries.map(([assetId, quantity]) => ({
    name: parseCustodyAccountTokenName(assetNameOf(assetId)),
    quantity,
  }));
  const [first] = names;
  if (names.length === 1 && first.name?.kind === 'state-nft') {
    return { kind: 'creation', stakeScriptHash: first.name.stakeScriptHash };
  }
  const stakeScriptHash = first?.name?.stakeScriptHash;
  const isGrantMint =
    stakeScriptHash !== undefined &&
    names.every(
      ({ name, quantity }) =>
        name?.kind === 'grant' &&
        name.stakeScriptHash === stakeScriptHash &&
        (quantity === 1n || quantity === -1n),
    );
  if (!isGrantMint) return { kind: 'invalid' };
  const issues = names.filter(({ quantity }) => quantity === 1n).length;
  return {
    kind: issues === names.length ? 'issue' : issues === 0 ? 'burn' : 'mixed',
    stakeScriptHash,
  };
};

/**
 * The account's mint: its state NFT at creation, grant tokens issued at +1
 * or burned at -1, under the one mint redeemer of the policy. A device
 * spend of the control UTxO counts only the account's own grant tokens, so
 * any other name under the policy beside it is refused. A mint of no valid
 * shape is the transaction checks' to refuse.
 */
const readMint = (
  account: CustodyAccountHashes,
  facts: TransactionFacts,
  hasControlInput: boolean,
) => {
  const refusals: CustodyRefusal[] = [];
  const policy = account.accountValidatorHash;
  const nftAssetId = stateNftAssetIdOf(account);
  const entries = [...facts.mint].filter(
    ([assetId]) => policyIdOf(assetId) === policy,
  );
  const shape = mintShapeOf(entries);
  const isOwnGrantMint =
    shape.kind !== 'invalid' &&
    shape.kind !== 'creation' &&
    shape.stakeScriptHash === account.stakeScriptHash;
  const issued: GrantMint[] = [];
  const burned: GrantMint[] = [];
  for (const [assetId, quantity] of entries) {
    const name = parseCustodyAccountTokenName(assetNameOf(assetId));
    if (isOwnGrantMint && name?.kind === 'grant') {
      (quantity === 1n ? issued : burned).push({ slot: name.slot, assetId });
    } else if (
      shape.kind !== 'invalid' &&
      shape.kind !== 'mixed' &&
      (hasControlInput || (assetId === nftAssetId && quantity !== 1n))
    ) {
      refusals.push({
        code: 'custody-unsupported-operation',
        reason: 'unsupported-mint',
        assetId,
        quantity,
      });
    }
  }
  issued.sort(bySlot);
  burned.sort(bySlot);
  const isCreation = facts.mint.has(nftAssetId);
  if (isCreation || isOwnGrantMint) {
    const index = facts.mintPolicies.indexOf(policy);
    const data = redeemerData(facts, Cardano.RedeemerPurpose.mint, index);
    const decoded =
      data === undefined ? undefined : decodeCustodyMintRedeemer(data);
    const expected: Partial<
      Record<CustodyMintShape['kind'], CustodyMintRedeemer['kind']>
    > = {
      creation: 'createAccount',
      issue: 'issueGrants',
      burn: 'burnGrants',
    };
    if (!decoded?.ok) {
      refusals.push({
        code: 'custody-unsupported-operation',
        reason: decoded ? 'unknown-redeemer' : 'missing-redeemer',
        purpose: 'mint',
        index,
      });
    } else if (
      expected[shape.kind] !== undefined &&
      decoded.value.kind !== expected[shape.kind]
    ) {
      refusals.push({
        code: 'custody-unsupported-operation',
        reason: 'mint-redeemer-mismatch',
        account,
        redeemer: decoded.value.kind,
      });
    }
  }
  if (isOwnGrantMint && !hasControlInput) {
    refusals.push({
      code: 'custody-unsupported-operation',
      reason: 'grant-mint-without-control',
      account,
    });
  }
  for (const count of [issued.length, burned.length]) {
    if (count > CUSTODY_MAX_GRANT_BATCH) {
      refusals.push({
        code: 'custody-unsupported-operation',
        reason: 'grant-batch-limit',
        account,
        count,
        limit: CUSTODY_MAX_GRANT_BATCH,
      });
    }
  }
  return { isCreation, issued, burned, refusals };
};

type AccountMint = ReturnType<typeof readMint>;

/** The control input's checks: one control UTxO whose resolution holds a state. */
const readControlInput = (
  account: CustodyAccountHashes,
  inputs: AccountInputs,
) => {
  const refusals: CustodyRefusal[] = [];
  const [control] = inputs.controls;
  if (inputs.controls.length > 1) {
    refusals.push({
      code: 'custody-context-mismatch',
      reason: 'multiple-control-inputs',
      account,
    });
  }
  const before = control && decodedInlineState(control.output);
  if (control) {
    if (!before) {
      refusals.push({
        code: 'custody-malformed-datum',
        reason: 'control-input-datum',
        input: control.input,
      });
    }
    if (!holdsOnlyLovelaceAndStateNft(control.output.value, account)) {
      refusals.push({
        code: 'custody-malformed-datum',
        reason: 'control-input-value',
        input: control.input,
      });
    }
  }
  return { control, before, refusals };
};

/**
 * The account's control UTxO among the reference inputs. Only a grant spend
 * reads the control UTxO without spending it: Lace spends it for every
 * owner operation, delegation and withdrawal included.
 */
const readReferencedControls = (
  account: CustodyAccountHashes,
  facts: TransactionFacts,
  isGrantSpend: boolean,
) => {
  const references = facts.referenceInputs.filter(({ output }) =>
    isControlOutput(output, account),
  );
  return {
    references,
    refusals: isGrantSpend
      ? []
      : references.map(
          ({ input }): CustodyRefusal => ({
            code: 'custody-unsupported-operation',
            reason: 'reference-control',
            input,
          }),
        ),
  };
};

/**
 * Registration belongs to creation and creation needs it; delegation and
 * withdrawal need the control UTxO spent, since Lace never references it
 * for them.
 */
const checkStakeOperations = (
  account: CustodyAccountHashes,
  { certificates, withdrawal }: AccountEffects,
  {
    isCreation,
    hasControlInput,
  }: { isCreation: boolean; hasControlInput: boolean },
): CustodyRefusal[] => {
  const refusals: CustodyRefusal[] = [];
  const isRegistered = certificates.some(({ kind }) => kind === 'registration');
  if (isRegistered && !isCreation) {
    refusals.push({
      code: 'custody-unsupported-operation',
      reason: 'registration-without-creation',
      account,
    });
  }
  if (isCreation && !isRegistered) {
    refusals.push({
      code: 'custody-unsupported-operation',
      reason: 'creation-without-registration',
      account,
    });
  }
  const isDelegatingOrWithdrawing =
    withdrawal !== undefined ||
    certificates.some(({ kind }) => kind === 'pool-delegation');
  if (isDelegatingOrWithdrawing && !hasControlInput) {
    refusals.push({
      code: 'custody-unsupported-operation',
      reason: 'stake-operation-without-control',
      account,
    });
  }
  return refusals;
};

/**
 * The control output's checks. With a control input or a creation there is
 * exactly one, holding only lovelace and the NFT and an account state, with
 * no reference script, which the proxy refuses there; without either there
 * is none.
 */
const readControlOutput = (
  account: CustodyAccountHashes,
  facts: TransactionFacts,
  hasStateSource: boolean,
) => {
  const refusals: CustodyRefusal[] = [];
  const controls = facts.outputs.flatMap((view, outputIndex) =>
    isControlOutput(view, account) ? [{ view, outputIndex }] : [],
  );
  if (!hasStateSource && controls.length > 0) {
    refusals.push({
      code: 'custody-context-mismatch',
      reason: 'control-output-without-control-input',
      account,
    });
  }
  if (hasStateSource && controls.length !== 1) {
    refusals.push({
      code: 'custody-malformed-datum',
      reason: 'control-output-count',
      account,
      count: controls.length,
    });
  }
  const control = controls.length === 1 ? controls[0] : undefined;
  const after = control && decodedInlineState(control.view);
  if (hasStateSource && control) {
    if (!holdsOnlyLovelaceAndStateNft(control.view.value, account)) {
      refusals.push({
        code: 'custody-malformed-datum',
        reason: 'control-output-value',
        outputIndex: control.outputIndex,
      });
    }
    if (!after) {
      refusals.push({
        code: 'custody-malformed-datum',
        reason: 'control-output-datum',
        outputIndex: control.outputIndex,
      });
    }
    if (control.view.hasReferenceScript) {
      refusals.push({
        code: 'custody-unsupported-operation',
        reason: 'control-output-reference-script',
        outputIndex: control.outputIndex,
      });
    }
  }
  return { count: controls.length, control, after, refusals };
};

/** What one issued grant breaks of `issues_grant`, or its output and grant. */
const readIssuedGrant = (
  account: CustodyAccountHashes,
  facts: TransactionFacts,
  { assetId }: GrantMint,
):
  | {
      readonly view: OutputView;
      readonly outputIndex: number;
      readonly grant: CustodyGrant;
    }
  | { readonly problem: CustodyIssuedGrantProblem } => {
  const holders = facts.outputs.flatMap((view, outputIndex) =>
    view.value.assets.get(assetId) === 1n ? [{ view, outputIndex }] : [],
  );
  if (holders.length !== 1) {
    return { problem: { code: 'output-count', count: holders.length } };
  }
  const [{ view, outputIndex }] = holders;
  if (!isAtAccount(view, account)) {
    return { problem: { code: 'address', outputIndex } };
  }
  if (view.value.assets.size !== 1) {
    return { problem: { code: 'value', outputIndex } };
  }
  if (view.hasReferenceScript) {
    return { problem: { code: 'reference-script', outputIndex } };
  }
  if (view.inlineDatum === undefined) {
    return { problem: { code: 'datum-not-inline', outputIndex } };
  }
  const decoded = decodeCustodyGrant(view.inlineDatum);
  return decoded.ok
    ? { view, outputIndex, grant: decoded.value }
    : { problem: { code: 'datum-malformed', outputIndex } };
};

/**
 * The grants a device rewrite issues: `issues_grant` for each minted token,
 * in slot order from the spent state's next slot, each under the generation
 * of the control output, plus the rules Lace applies to every grant it
 * authors and an expiry after `now`.
 */
const readIssuedGrants = (
  account: CustodyAccountHashes,
  facts: TransactionFacts,
  {
    issued,
    before,
    after,
    now,
  }: {
    issued: readonly GrantMint[];
    before: CustodyAccountState | undefined;
    after: CustodyAccountState | undefined;
    now: number;
  },
) => {
  const refusals: CustodyRefusal[] = [];
  const reports: CustodyIssuedGrantReport[] = [];
  const refuse = (slot: bigint, problem: CustodyIssuedGrantProblem) =>
    refusals.push({
      code: 'custody-malformed-datum',
      reason: 'grant-output-invalid',
      account,
      slot,
      problem,
    });
  for (const [index, mint] of issued.entries()) {
    const { slot } = mint;
    if (before) {
      const expected = before.nextSlot + BigInt(index);
      if (slot !== expected) refuse(slot, { code: 'not-next-slot', expected });
    }
    const read = readIssuedGrant(account, facts, mint);
    if ('problem' in read) {
      refuse(slot, read.problem);
      continue;
    }
    const { view, outputIndex, grant } = read;
    if (grant.slot !== slot) {
      refuse(slot, {
        code: 'slot-mismatch',
        outputIndex,
        datumSlot: grant.slot,
      });
    }
    if (after && grant.generation !== after.grantGeneration) {
      refuse(slot, {
        code: 'generation-mismatch',
        outputIndex,
        generation: grant.generation,
        expected: after.grantGeneration,
      });
    }
    refusals.push(
      ...findCustodyGrantViolations(grant).map(
        (violation): CustodyRefusal => ({
          code: 'custody-malformed-datum',
          reason: 'grant-violation',
          account,
          slot,
          violation,
        }),
      ),
    );
    if (isCustodyGrantExpired(grant, now)) {
      refusals.push({
        code: 'custody-malformed-datum',
        reason: 'expired-grant',
        account,
        slot,
        expiresAt: grant.scope.expiresAt,
      });
    }
    reports.push({
      outputIndex,
      assetId: mint.assetId,
      grant,
      lovelace: view.value.lovelace,
    });
  }
  return { reports, refusals };
};

/**
 * `is_dead` against the spent state: issued under an older generation, its
 * slot revoked, or the validity interval starting strictly after its expiry.
 */
const deathOf = (
  grant: CustodyGrant,
  state: CustodyAccountState,
  lowerBoundMs: number | undefined,
): CustodyGrantDeath | undefined => {
  if (grant.generation < state.grantGeneration) return 'superseded';
  if (state.revoked.includes(grant.slot)) return 'revoked';
  // A converter that yields no exact instant cannot prove the bound is late enough.
  return lowerBoundMs !== undefined &&
    Number.isSafeInteger(lowerBoundMs) &&
    BigInt(lowerBoundMs) > grant.scope.expiresAt
    ? 'expired'
    : undefined;
};

/**
 * The grants a device rewrite sweeps: each grant UTxO spent with
 * `SweepGrant` carries its grant inline beside only its token, is dead
 * against the spent state, and has its token burned; every burned token is
 * a swept grant's.
 */
const readSweptGrants = (
  account: CustodyAccountHashes,
  facts: TransactionFacts,
  {
    sweeps,
    burned,
    before,
    hasControlInput,
  }: {
    sweeps: readonly SpentAccountInput[];
    burned: readonly GrantMint[];
    before: CustodyAccountState | undefined;
    hasControlInput: boolean;
  },
) => {
  const refusals: CustodyRefusal[] = [];
  const reports: CustodySweptGrantReport[] = [];
  if (sweeps.length > 0 && !hasControlInput) {
    refusals.push({
      code: 'custody-unsupported-operation',
      reason: 'sweep-without-control',
      account,
    });
  }
  for (const { input, output } of sweeps) {
    const grant = decodedInlineGrant(output);
    if (!grant) {
      refusals.push({
        code: 'custody-malformed-datum',
        reason: 'grant-input-datum',
        input,
      });
      continue;
    }
    const assetId = grantAssetIdOf(account, grant.slot);
    if (
      !assetId ||
      !holdsOnlyLovelaceAndGrantToken(output.value, account, grant.slot)
    ) {
      refusals.push({
        code: 'custody-malformed-datum',
        reason: 'grant-input-value',
        input,
      });
      continue;
    }
    if (facts.mint.get(assetId) !== -1n) {
      refusals.push({
        code: 'custody-unsupported-operation',
        reason: 'sweep-burn-mismatch',
        account,
        slot: grant.slot,
      });
    }
    if (!before) continue;
    const death = deathOf(grant, before, facts.lowerBoundMs);
    if (!death) {
      refusals.push({
        code: 'custody-unsupported-operation',
        reason: 'sweep-not-dead',
        account,
        input,
        slot: grant.slot,
      });
      continue;
    }
    reports.push({
      input,
      assetId,
      grant,
      lovelace: output.value.lovelace,
      death,
    });
  }
  const sweptSlots = sweeps.flatMap(({ output }) => {
    const grant = decodedInlineGrant(output);
    return grant ? [grant.slot] : [];
  });
  for (const { slot } of burned) {
    if (!sweptSlots.includes(slot)) {
      refusals.push({
        code: 'custody-unsupported-operation',
        reason: 'sweep-burn-mismatch',
        account,
        slot,
      });
    }
  }
  return { reports, refusals };
};

/**
 * Every control state the transaction spends, references or writes for the
 * account names a logic of its contract version's catalogue: the logic is
 * the account's rule set, and any registered script may be named there, so
 * an unknown one runs rules Lace has not reviewed. Each unknown logic is
 * refused once.
 */
const checkKnownLogics = (
  account: CustodyAccountHashes,
  version: CustodyContractVersion,
  states: readonly (CustodyAccountState | undefined)[],
): CustodyRefusal[] => {
  const unknown = new Set<HexBlob>();
  for (const state of states) {
    if (state && !findCustodyLogic(version, state.logic).ok) {
      unknown.add(state.logic);
    }
  }
  return [...unknown].map(
    (logic): CustodyRefusal => ({
      code: 'custody-unsupported-version',
      reason: 'unknown-logic',
      account,
      logic,
    }),
  );
};

/**
 * The counter rules of `recreates_control_output`, and the rules Lace adds:
 * the logic stays, since Lace does not sign an upgrade; a slot leaves the
 * revoked list only with its grant token burned in the same rewrite, or
 * with a generation step that supersedes every grant; a slot joins it only
 * once, and only after it was issued.
 */
const checkStateChange = (
  account: CustodyAccountHashes,
  change: CustodyStateChange,
  { issued, burned }: Pick<AccountMint, 'burned' | 'issued'>,
): CustodyRefusal[] => {
  const { before, after } = change;
  const refusals: CustodyRefusal[] = [];
  if (change.logic) {
    refusals.push({
      code: 'custody-unsupported-operation',
      reason: 'logic-changed',
      account,
      before: change.logic.before,
      after: change.logic.after,
    });
  }
  if (after.grantGeneration < before.grantGeneration) {
    refusals.push({
      code: 'custody-malformed-datum',
      reason: 'generation-decreased',
      account,
      before: before.grantGeneration,
      after: after.grantGeneration,
    });
  }
  const minted = BigInt(issued.length);
  const counters = [
    ['nextSlot', before.nextSlot + minted, after.nextSlot],
    [
      'outstanding',
      before.outstanding + minted - BigInt(burned.length),
      after.outstanding,
    ],
  ] as const;
  for (const [counter, expected, actual] of counters) {
    if (actual !== expected) {
      refusals.push({
        code: 'custody-malformed-datum',
        reason: 'counter-mismatch',
        account,
        counter,
        expected,
        actual,
      });
    }
  }
  if (after.grantGeneration === before.grantGeneration) {
    for (const slot of change.revokedRemoved) {
      if (!burned.some(mint => mint.slot === slot)) {
        refusals.push({
          code: 'custody-unsupported-operation',
          reason: 'revoked-slot-restored',
          account,
          slot,
        });
      }
    }
  }
  const invalid = change.revokedAdded.filter(
    (slot, index) =>
      slot < 0n ||
      slot >= before.nextSlot ||
      change.revokedAdded.indexOf(slot) !== index,
  );
  for (const slot of new Set(after.revoked)) {
    const previousCount = before.revoked.filter(value => value === slot).length;
    const count = after.revoked.filter(value => value === slot).length;
    if (count > Math.max(1, previousCount)) invalid.push(slot);
  }
  for (const slot of new Set(invalid)) {
    refusals.push({
      code: 'custody-unsupported-operation',
      reason: 'revoked-slot-invalid',
      account,
      slot,
    });
  }
  return refusals;
};

/**
 * Grant spends are refused unless the caller allows them. An allowed one is
 * refused for every rule of the logic's grant spend rule it breaks, so an
 * accepted grant spend is one the contract accepts, and for any input
 * outside the account address: an agent spends from the account alone.
 */
const checkGrantSpends = (
  {
    account,
    spends,
  }: {
    account: CustodyAccountHashes;
    spends: readonly SpentAccountInput[];
  },
  facts: TransactionFacts,
  scope: InspectionScope,
): CustodyRefusal[] => [
  ...spends.flatMap(({ input, output }): CustodyRefusal[] =>
    scope.options.allowGrantSpend
      ? grantSpendViolationsOf({
          grantInput: output,
          inputs: facts.inputs.map(view => view.output),
          referenceInputs: facts.referenceInputs.map(view => view.output),
          outputs: facts.outputs,
          mint: facts.mint,
          requiredSigners: facts.requiredSigners,
          upperBoundMs: facts.upperBoundMs,
          account,
        }).map(violation => ({
          code: 'custody-unsupported-operation',
          reason: 'grant-spend-violation',
          account,
          input,
          violation,
        }))
      : [
          {
            code: 'custody-unsupported-operation',
            reason: 'grant-spend',
            account,
            input,
          },
        ],
  ),
  ...(scope.options.allowGrantSpend && spends.length > 0
    ? facts.inputs
        .filter(({ output }) => !isAtAccount(output, account))
        .map(
          ({ input }): CustodyRefusal => ({
            code: 'custody-unsupported-operation',
            reason: 'grant-spend-foreign-input',
            account,
            input,
          }),
        )
    : []),
];

/** The grant a single grant spend uses and the output that recreates it. */
const grantSpendReportOf = (
  account: CustodyAccountHashes,
  spends: readonly SpentAccountInput[],
  facts: TransactionFacts,
): CustodyGrantSpendReport | undefined => {
  if (spends.length !== 1) return undefined;
  const [{ input, output }] = spends;
  const grant = decodedInlineGrant(output);
  const assetId = grant && grantAssetIdOf(account, grant.slot);
  const outputIndex = facts.outputs.findIndex(
    view => assetId !== undefined && view.value.assets.get(assetId) === 1n,
  );
  const after =
    outputIndex === -1
      ? undefined
      : decodedInlineGrant(facts.outputs[outputIndex]);
  return grant && after ? { input, grant, outputIndex, after } : undefined;
};

/** What names an account's operations, apart from how the fee splits. */
interface OperationFacts {
  readonly account: CustodyAccountHashes;
  readonly isCreation: boolean;
  readonly isGrantSpend: boolean;
  readonly grantSpend: CustodyGrantSpendReport | undefined;
  readonly stateChange: CustodyStateChange | undefined;
  readonly issued: readonly CustodyIssuedGrantReport[];
  readonly swept: readonly CustodySweptGrantReport[];
  readonly netOutflow: CustodyValueDelta;
  readonly stake: AccountEffects;
  readonly logicRun: LogicRun | undefined;
}

/**
 * The operations a device rewrite performs, from its state change and the
 * grants it issues and sweeps. One revoked slot beside one issued grant is a
 * replacement; a generation step of one that empties the revoked list
 * under the same logic revokes every grant, where an upgrade has the same
 * counters.
 */
const stateOperationsOf = (
  change: CustodyStateChange,
  issuedSlots: readonly bigint[],
  sweptSlots: readonly bigint[],
): CustodyOperation[] => {
  const { before, after, revokedAdded } = change;
  const isRevokeAll =
    !change.logic &&
    after.grantGeneration === before.grantGeneration + 1n &&
    after.revoked.length === 0;
  const isReplace =
    !change.grantGeneration &&
    revokedAdded.length === 1 &&
    issuedSlots.length === 1;
  return [
    ...(isReplace
      ? [
          {
            kind: 'replace-grant',
            slot: revokedAdded[0],
            issuedSlot: issuedSlots[0],
          } as const,
        ]
      : issuedSlots.map(
          (slot): CustodyOperation => ({ kind: 'issue-grant', slot }),
        )),
    ...(isRevokeAll
      ? [{ kind: 'revoke-all-grants' } as const]
      : [
          ...(isReplace
            ? []
            : revokedAdded.map(
                (slot): CustodyOperation => ({ kind: 'revoke-grant', slot }),
              )),
          ...(change.grantGeneration
            ? [{ kind: 'change-grant-generation' } as const]
            : []),
        ]),
    ...(sweptSlots.length > 0
      ? [{ kind: 'sweep-grants', slots: sweptSlots } as const]
      : []),
    ...change.devicesAdded.map(
      (device): CustodyOperation => ({ kind: 'add-device', device }),
    ),
    ...change.devicesRemoved.map(
      (device): CustodyOperation => ({ kind: 'remove-device', device }),
    ),
    ...(change.isReordered ? [{ kind: 'reorder-state' } as const] : []),
  ];
};

/**
 * Lovelace leaving the account's address, its reward account and its logic
 * run's draw; negative is a net inflow. Lovelace is fungible, so what the
 * logic run draws is credited to the account: any of it that leaves counts
 * as the account's.
 */
const lovelaceGivenUp = ({
  netOutflow,
  stake,
  logicRun,
}: OperationFacts): bigint =>
  netOutflow.lovelace + (stake.withdrawal ?? 0n) + (logicRun?.draw ?? 0n);

/**
 * Whether an owner operation pays value out of the account: any asset that
 * leaves it, or lovelace given up beyond its share of the fee. An account
 * that pays only its own fee spends nothing. Account tokens are minted and
 * burned, never paid out: placement keeps them at their accounts.
 */
const isOwnerSpend = (facts: OperationFacts, feeShare: bigint): boolean =>
  [...facts.netOutflow.assets].some(
    ([assetId, quantity]) =>
      quantity > 0n &&
      policyIdOf(assetId) !== facts.account.accountValidatorHash,
  ) || lovelaceGivenUp(facts) > feeShare;

const operationsOf = (
  facts: OperationFacts,
  feeShare: bigint,
): CustodyOperation[] => {
  const { isCreation, grantSpend, stateChange, stake } = facts;
  return [
    ...(isCreation ? [{ kind: 'create' } as const] : []),
    ...(grantSpend
      ? [{ kind: 'grant-spend', slot: grantSpend.grant.slot } as const]
      : []),
    ...(stateChange
      ? stateOperationsOf(
          stateChange,
          facts.issued.map(({ grant }) => grant.slot),
          facts.swept.map(({ grant }) => grant.slot),
        )
      : []),
    ...(!facts.isGrantSpend && isOwnerSpend(facts, feeShare)
      ? [{ kind: 'owner-spend' } as const]
      : []),
    ...stake.certificates.flatMap(certificate =>
      certificate.kind === 'pool-delegation'
        ? [{ kind: 'delegate', poolId: certificate.poolId } as const]
        : [],
    ),
    ...(stake.withdrawal === undefined
      ? []
      : [{ kind: 'withdraw-rewards', quantity: stake.withdrawal } as const]),
  ];
};

interface AccountOutcome {
  /** Without operations: an owner spend depends on every operated account. */
  readonly report: Omit<CustodyAccountInspection, 'operations'>;
  readonly operationFacts: OperationFacts;
  readonly refusals: readonly CustodyRefusal[];
  readonly isOperated: boolean;
  /** The logics the control states the transaction spends, references and writes name. */
  readonly logics: readonly HexBlob[];
}

/** Each operated account's part of the accounts' fee share, in order. */
const feeSharesOfAccounts = (
  operated: readonly AccountOutcome[],
  { accountShare }: CustodyFeeShares,
): bigint[] =>
  accountFeeSharesOf(
    operated.map(({ operationFacts }) => lovelaceGivenUp(operationFacts)),
    accountShare,
  );

/** The reports of the operated accounts, each with its operations named. */
export const withOperations = (
  operated: readonly AccountOutcome[],
  feeShares: CustodyFeeShares,
): CustodyAccountInspection[] => {
  const shares = feeSharesOfAccounts(operated, feeShares);
  return operated.map(({ report, operationFacts }, index) => ({
    ...report,
    operations: operationsOf(operationFacts, shares[index]),
  }));
};

/**
 * A logic run that draws lovelace must leave it at the account. Lovelace
 * is fungible, so the draw is credited to the account, and it stays there
 * when the account gives up no more lovelace than its part of the fee. A
 * fee payer that takes change back could have paid the whole fee, so the
 * accounts' part is then nothing: otherwise the payer's change could hold
 * the draw. A grant spend pays out of the account by definition, so it may
 * draw nothing.
 */
export const checkLogicDraws = (
  operated: readonly AccountOutcome[],
  feeShares: CustodyFeeShares,
  isChangeToPayers: boolean,
): CustodyRefusal[] => {
  const shares = isChangeToPayers
    ? operated.map(() => 0n)
    : feeSharesOfAccounts(operated, feeShares);
  return operated.flatMap(({ operationFacts }, index): CustodyRefusal[] => {
    const { account, logicRun, isGrantSpend } = operationFacts;
    if (!logicRun || logicRun.draw === 0n) return [];
    return isGrantSpend || lovelaceGivenUp(operationFacts) > shares[index]
      ? [
          {
            code: 'custody-unsupported-operation',
            reason: 'logic-draw-leaves-account',
            account,
            logic: logicRun.logic,
            quantity: logicRun.draw,
          },
        ]
      : [];
  });
};

const isOwnReserve = (view: OutputView): boolean =>
  view.inlineDatum !== undefined &&
  !view.hasReferenceScript &&
  isCustodyReserveDatum(view.inlineDatum);

export const inspectAccount = (
  candidate: AccountCandidate,
  facts: TransactionFacts,
  scope: InspectionScope,
): AccountOutcome => {
  const account = hashesOf(candidate);
  const { networkId } = scope.options.chainId;
  const inputs = readAccountInputs(account, facts);
  const { control, before, ...controlInput } = readControlInput(
    account,
    inputs,
  );
  const hasControlInput = control !== undefined;
  const isGrantSpend = inputs.spends.length > 0;
  const mint = readMint(account, facts, hasControlInput);
  const stake = readStakeEffects(candidate, facts);
  const controlOutput = readControlOutput(
    account,
    facts,
    hasControlInput || mint.isCreation,
  );
  const { after } = controlOutput;
  const referenced = readReferencedControls(account, facts, isGrantSpend);
  const referencedStates = referenced.references.map(({ output }) =>
    decodedInlineState(output),
  );
  const states = [before, after, ...referencedStates];
  const logicRun = readLogicRun(
    account,
    facts,
    before?.logic ??
      (isGrantSpend ? referencedStates[0]?.logic : undefined) ??
      (mint.isCreation ? after?.logic : undefined),
  );
  const issued = readIssuedGrants(account, facts, {
    issued: mint.issued,
    before,
    after,
    now: scope.options.now,
  });
  const swept = readSweptGrants(account, facts, {
    sweeps: inputs.sweeps,
    burned: mint.burned,
    before,
    hasControlInput,
  });
  const refusals: CustodyRefusal[] = [
    ...inputs.refusals,
    ...controlInput.refusals,
    ...mint.refusals,
    ...referenced.refusals,
    ...checkKnownLogics(account, candidate.contractVersion, states),
    ...logicRun.refusals,
    ...stake.refusals,
    ...checkStakeOperations(account, stake, {
      isCreation: mint.isCreation,
      hasControlInput,
    }),
    ...controlOutput.refusals,
    ...issued.refusals,
    ...swept.refusals,
    ...checkGrantSpends({ account, spends: inputs.spends }, facts, scope),
  ];

  const spent = facts.inputs.map(({ output }) => output);
  const netOutflow = leavingValueAt(
    spent,
    facts.outputs,
    accountPlutusAddressKey(account),
  );
  let stateChange: CustodyStateChange | undefined;
  if (after && (before || mint.isCreation)) {
    const written = { account, before, after };
    refusals.push(
      ...checkWrittenState(written),
      ...checkSigner(written, facts, scope),
    );
    if (before) {
      stateChange = diffCustodyStates(before, after);
      refusals.push(...checkStateChange(account, stateChange, mint));
    }
  }
  const [reference] = referenced.references;
  const [referencedState] = referencedStates;
  const grantSpend = grantSpendReportOf(account, inputs.spends, facts);

  return {
    isOperated:
      inputs.isSpent ||
      mint.isCreation ||
      mint.issued.length + mint.burned.length > 0 ||
      stake.isStaked ||
      controlOutput.count > 0,
    refusals,
    logics: states.flatMap(state => (state ? [state.logic] : [])),
    report: {
      contractVersion: candidate.contractVersion,
      ...account,
      address: accountAddressOf(account, networkId),
      rewardAccount: accountRewardAccountOf(account, networkId),
      ...(control && before
        ? {
            controlInput: {
              input: control.input,
              state: before,
              lovelace: control.output.value.lovelace,
            },
          }
        : {}),
      ...(controlOutput.control && after
        ? {
            controlOutput: {
              outputIndex: controlOutput.control.outputIndex,
              state: after,
              lovelace: controlOutput.control.view.value.lovelace,
            },
          }
        : {}),
      ...(isGrantSpend && reference && referencedState
        ? {
            referencedControl: {
              input: reference.input,
              state: referencedState,
              lovelace: reference.output.value.lovelace,
            },
          }
        : {}),
      fundInputs: inputs.funds.map(({ input, output }) => ({
        input,
        value: output.txOut.value,
        hasReferenceScript: output.hasReferenceScript,
      })),
      reserveInputs: inputs.reserves.map(({ input, output }) => ({
        input,
        value: output.txOut.value,
        datum: output.datumKind === 'hash' ? 'hash' : 'inline',
        isOwnFormat: isOwnReserve(output),
        hasReferenceScript: output.hasReferenceScript,
      })),
      accountOutputs: facts.outputs.flatMap((view, outputIndex) =>
        isAtAccount(view, account)
          ? [
              {
                outputIndex,
                value: view.txOut.value,
                datum: view.datumKind,
                kind: accountUtxoKindOf(view, account),
              },
            ]
          : [],
      ),
      issuedGrants: issued.reports,
      sweptGrants: swept.reports,
      ...(grantSpend ? { grantSpend } : {}),
      netOutflow,
      certificates: stake.certificates,
      ...(stake.withdrawal === undefined
        ? {}
        : { withdrawal: stake.withdrawal }),
      ...(logicRun.run && logicRun.run.draw > 0n
        ? { logicDraw: logicRun.run.draw }
        : {}),
      ...(stateChange ? { stateChange } : {}),
    },
    operationFacts: {
      account,
      isCreation: mint.isCreation,
      isGrantSpend,
      grantSpend,
      stateChange,
      issued: issued.reports,
      swept: swept.reports,
      netOutflow,
      stake,
      logicRun: logicRun.run,
    },
  };
};
