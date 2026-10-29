// Ported from Biglup/cardano-account-custody-contract
// lib/cardano_account_custody_contract/account.ak and validators/account.ak at
// revision b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0). Modified for
// Lace: the conditions no single account owns, such as account token
// placement and the shape of a mint, are checked over a whole transaction,
// beside refusals for shapes Lace never builds.

import { Cardano } from '@cardano-sdk/core';

import { isCustodyReserveDatum } from '../codecs/reserve';
import { SUPPORTED_CUSTODY_CONTRACT_VERSIONS } from '../contract-version';

import {
  hashesOf,
  isSameAccount,
  mintShapeOf,
  versionOfPolicy,
} from './account-inspection';
import {
  holdsMisplacedAccountToken,
  holdsNoAccountToken,
  isKnownCustodyLogic,
} from './outputs';
import {
  paymentCredentialOf,
  redeemerData,
  scriptHashOfRewardAccount,
  stakeCredentialOf,
} from './transaction-facts';
import { policyIdOf } from './value';

import type { CustodyAccountIdentity } from '../identity';
import type { AccountCandidate } from './account-inspection';
import type { CustodyAccountHashes, OutputView } from './outputs';
import type {
  CustodyOutputLocation,
  CustodyRefusal,
  CustodyUnsupportedBodyField,
} from './refusals';
import type { TransactionFacts } from './transaction-facts';
import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';

const UNSUPPORTED_BODY_FIELDS: readonly CustodyUnsupportedBodyField[] = [
  'accountBalanceIntervals',
  'directDeposits',
  'guards',
  'proposalProcedures',
  'subTransactions',
  'update',
  'votingProcedures',
];

/**
 * A redeemer pointer named twice has no single reading, so the redeemer a
 * check reads might not be the one a script runs with.
 */
export const checkRedeemerPointers = (
  facts: TransactionFacts,
): CustodyRefusal[] => {
  const seen = new Set<string>();
  const refusals: CustodyRefusal[] = [];
  for (const { purpose, index } of facts.redeemers) {
    const pointer = `${purpose}:${index}`;
    if (seen.has(pointer)) {
      refusals.push({
        code: 'custody-unsupported-operation',
        reason: 'duplicate-redeemer',
        purpose,
        index,
      });
    }
    seen.add(pointer);
  }
  return refusals;
};

/**
 * Consistency checks that catch resolutions hiding a custody spend. The
 * ledger refuses a spend redeemer for an input no script locks, and an
 * account validator witness that no input or mint needs, so either means a
 * resolution misstates what the transaction spends.
 */
export const checkSpendWitnesses = (
  facts: TransactionFacts,
): CustodyRefusal[] => {
  const refusals: CustodyRefusal[] = [];
  for (const [index, { input, output }] of facts.inputs.entries()) {
    const isRedeemed =
      redeemerData(facts, Cardano.RedeemerPurpose.spend, index) !== undefined;
    if (
      isRedeemed &&
      paymentCredentialOf(output)?.type !== Cardano.CredentialType.ScriptHash
    ) {
      refusals.push({
        code: 'custody-context-mismatch',
        reason: 'redeemer-on-key-input',
        input,
      });
    }
  }
  for (const version of SUPPORTED_CUSTODY_CONTRACT_VERSIONS) {
    const { accountValidatorHash } = version;
    const isNeeded =
      facts.inputs.some(
        ({ output: { addressClass } }) =>
          addressClass.kind === 'account' &&
          addressClass.contractVersion === version,
      ) || facts.mintPolicies.includes(accountValidatorHash);
    if (facts.witnessScriptHashes.has(accountValidatorHash) && !isNeeded) {
      refusals.push({
        code: 'custody-context-mismatch',
        reason: 'unused-account-validator',
        accountValidatorHash,
      });
    }
  }
  return refusals;
};

/**
 * Consistency checks on the known logics a transaction attaches or runs: a
 * logic runs through a withdrawal from its stake credential, and only over
 * a control UTxO that names it, spent, referenced or written. The ledger
 * refuses a witness nothing needs, and a run with no such control UTxO
 * fails, so a logic attached without a run, or run with no control UTxO
 * naming it among `logics`, means a resolution hides that control UTxO or
 * the transaction cannot succeed.
 */
export const checkLogicUse = (
  facts: TransactionFacts,
  logics: readonly string[],
): CustodyRefusal[] => {
  const named = new Set(logics);
  const withdrawn = new Set(
    (facts.body.withdrawals ?? []).flatMap(({ stakeAddress }) => {
      const scriptHash = scriptHashOfRewardAccount(stakeAddress);
      return scriptHash === undefined ? [] : [scriptHash];
    }),
  );
  const used = new Set(
    [...withdrawn, ...facts.witnessScriptHashes].filter(isKnownCustodyLogic),
  );
  return [...used]
    .filter(logic => !withdrawn.has(logic) || !named.has(logic))
    .map(
      (logic): CustodyRefusal => ({
        code: 'custody-context-mismatch',
        reason: 'unused-logic',
        logic,
      }),
    );
};

/**
 * A reward account the body's withdrawal map names more than once. The
 * decoded body keeps one of its withdrawals, so what inspection reads might
 * not be what the bytes say.
 */
export const checkWithdrawalAccounts = (
  facts: TransactionFacts,
): CustodyRefusal[] => {
  const seen = new Set<string>();
  const repeated = new Set<Cardano.RewardAccount>();
  for (const rewardAccount of facts.withdrawalAccounts) {
    if (seen.has(rewardAccount)) repeated.add(rewardAccount);
    seen.add(rewardAccount);
  }
  return [...repeated].map(
    (rewardAccount): CustodyRefusal => ({
      code: 'custody-unsupported-operation',
      reason: 'duplicate-withdrawal',
      rewardAccount,
    }),
  );
};

const isSameOutpoint = (a: Cardano.TxIn, b: Cardano.TxIn): boolean =>
  a.txId.toLowerCase() === b.txId.toLowerCase() && a.index === b.index;

/**
 * Reference inputs that carry a reference script must be the contract's
 * parked scripts on the inspected network: the output reference a supported
 * version pins, resolved with exactly the script it pins there. Any other
 * reference script is code Lace has not pinned.
 */
export const checkReferenceScripts = (
  facts: TransactionFacts,
  networkMagic: Cardano.NetworkMagic,
): CustodyRefusal[] => {
  const parked = SUPPORTED_CUSTODY_CONTRACT_VERSIONS.flatMap(
    version => version.referenceScripts[networkMagic] ?? [],
  );
  return facts.referenceInputs.flatMap(
    ({ input, output }): CustodyRefusal[] => {
      const pinned = parked.find(({ txIn }) => isSameOutpoint(txIn, input));
      if (pinned) {
        return output.referenceScriptHash === pinned.scriptHash
          ? []
          : [
              {
                code: 'custody-context-mismatch',
                reason: 'reference-script-mismatch',
                input,
              },
            ];
      }
      return output.hasReferenceScript
        ? [
            {
              code: 'custody-unsupported-operation',
              reason: 'foreign-reference-script',
              input,
            },
          ]
        : [];
    },
  );
};

/**
 * Certificates and withdrawals on credentials of no custody account the
 * transaction names. A withdrawal may also run a known logic, which
 * `checkLogicUse` ties to the control UTxOs naming it.
 */
export const checkForeignStakeEffects = (
  facts: TransactionFacts,
  candidates: readonly AccountCandidate[],
  networkId: Cardano.NetworkId,
): CustodyRefusal[] => {
  const refusals: CustodyRefusal[] = [];
  const stakeScriptHashes = new Set<string>(
    candidates.map(({ stakeScriptHash }) => stakeScriptHash),
  );
  for (const [certificateIndex, certificate] of (
    facts.body.certificates ?? []
  ).entries()) {
    const credential = stakeCredentialOf(certificate);
    if (
      credential?.type !== Cardano.CredentialType.ScriptHash ||
      !stakeScriptHashes.has(credential.hash)
    ) {
      refusals.push({
        code: 'custody-unsupported-operation',
        reason: 'foreign-certificate',
        certificateIndex,
        certificateType: certificate.__typename,
      });
    }
  }
  for (const { stakeAddress } of facts.body.withdrawals ?? []) {
    const scriptHash = scriptHashOfRewardAccount(stakeAddress);
    if (
      scriptHash === undefined ||
      !(stakeScriptHashes.has(scriptHash) || isKnownCustodyLogic(scriptHash))
    ) {
      refusals.push({
        code: 'custody-unsupported-operation',
        reason: 'foreign-withdrawal',
        rewardAccount: stakeAddress,
      });
    } else if (
      Cardano.Address.fromString(stakeAddress)?.getNetworkId() !== networkId
    ) {
      refusals.push({
        code: 'custody-context-mismatch',
        reason: 'network-mismatch',
        address: stakeAddress,
      });
    }
  }
  return refusals;
};

/**
 * Mints of other policies, and custody mints of a shape no mint redeemer
 * accepts: one state NFT name, or grant names of one account that all issue
 * or all burn.
 */
export const checkMint = (facts: TransactionFacts): CustodyRefusal[] => {
  const byPolicy = new Map<string, [Cardano.AssetId, bigint][]>();
  for (const entry of facts.mint) {
    const policyId = policyIdOf(entry[0]);
    byPolicy.set(policyId, [...(byPolicy.get(policyId) ?? []), entry]);
  }
  return [...byPolicy].flatMap(([policyId, entries]): CustodyRefusal[] => {
    const refuseEach = (reason: 'foreign-mint' | 'unsupported-mint') =>
      entries.map(
        ([assetId, quantity]): CustodyRefusal => ({
          code: 'custody-unsupported-operation',
          reason,
          assetId,
          quantity,
        }),
      );
    if (!versionOfPolicy(policyId)) return refuseEach('foreign-mint');
    const shape = mintShapeOf(entries);
    if (shape.kind === 'invalid') return refuseEach('unsupported-mint');
    return shape.kind === 'mixed'
      ? [
          {
            code: 'custody-unsupported-operation',
            reason: 'issue-sweep-mixed',
            account: {
              accountValidatorHash: policyId as Hash28ByteBase16,
              stakeScriptHash: shape.stakeScriptHash,
            },
          },
        ]
      : [];
  });
};

/**
 * What an output at a custody account that holds no account token must be:
 * a plain deposit, or a reserve in the format Lace writes, `d87980` with no
 * reference script. A datum hash locks value behind a preimage no account
 * builder holds; another datum or a reference script raises the fee and
 * minimum of every later spend.
 */
const findAccountOutputRefusal = (
  view: OutputView,
  location: CustodyOutputLocation,
): CustodyRefusal | undefined => {
  if (view.datumKind === 'hash') {
    return { code: 'custody-locked-output', reason: 'datum-hash', location };
  }
  if (view.inlineDatum !== undefined) {
    return view.hasReferenceScript || !isCustodyReserveDatum(view.inlineDatum)
      ? {
          code: 'custody-unsupported-operation',
          reason: 'foreign-reserve',
          location,
        }
      : undefined;
  }
  return view.hasReferenceScript
    ? {
        code: 'custody-unsupported-operation',
        reason: 'deposit-reference-script',
        location,
      }
    : undefined;
};

/**
 * Rules over every output and resolution: custody addresses on the named
 * network, account tokens at their own account addresses, no value locked
 * where no redeemer can reach it, and account outputs without an account
 * token in a shape Lace writes. Outputs holding an account token are the
 * control and grant outputs, which their account's checks read.
 */
export const checkOutputs = (
  facts: TransactionFacts,
  networkId: Cardano.NetworkId,
): CustodyRefusal[] => {
  const refusals: CustodyRefusal[] = [];
  const custodyViews = [
    ...[...facts.inputs, ...facts.referenceInputs, ...facts.collaterals].map(
      ({ output }) => output,
    ),
    ...facts.outputs,
    ...(facts.collateralReturn ? [facts.collateralReturn] : []),
  ].filter(({ addressClass }) => addressClass.kind !== 'other');
  for (const view of custodyViews) {
    if (view.address?.getNetworkId() !== networkId) {
      refusals.push({
        code: 'custody-context-mismatch',
        reason: 'network-mismatch',
        address: view.txOut.address,
      });
    }
  }
  const accountValidatorHashes = SUPPORTED_CUSTODY_CONTRACT_VERSIONS.map(
    version => version.accountValidatorHash,
  );
  for (const { input, output } of facts.inputs) {
    if (holdsMisplacedAccountToken(output, accountValidatorHashes)) {
      refusals.push({
        code: 'custody-unsupported-operation',
        reason: 'account-token-misplaced',
        location: { kind: 'input', input },
      });
    }
  }
  const locatedOutputs: {
    view: OutputView;
    location: CustodyOutputLocation;
  }[] = [
    ...facts.outputs.map((view, index) => ({
      view,
      location: { kind: 'output' as const, index },
    })),
    ...(facts.collateralReturn
      ? [
          {
            view: facts.collateralReturn,
            location: { kind: 'collateral-return' as const },
          },
        ]
      : []),
  ];
  for (const { view, location } of locatedOutputs) {
    if (
      location.kind === 'output' &&
      holdsMisplacedAccountToken(view, accountValidatorHashes)
    ) {
      refusals.push({
        code: 'custody-unsupported-operation',
        reason: 'account-token-misplaced',
        location,
      });
    }
    const { addressClass } = view;
    if (addressClass.kind === 'unspendable') {
      refusals.push({
        code: 'custody-locked-output',
        reason: 'unspendable-address',
        location,
      });
    } else if (
      addressClass.kind === 'account' &&
      holdsNoAccountToken(
        view.value,
        addressClass.contractVersion.accountValidatorHash,
      )
    ) {
      const refusal = findAccountOutputRefusal(view, location);
      if (refusal) refusals.push(refusal);
    }
  }
  return refusals;
};

export const checkBodyFields = (facts: TransactionFacts): CustodyRefusal[] => {
  const body = facts.body as Partial<
    Record<CustodyUnsupportedBodyField, unknown>
  >;
  return UNSUPPORTED_BODY_FIELDS.filter(field => body[field] !== undefined).map(
    (field): CustodyRefusal => ({
      code: 'custody-unsupported-operation',
      reason: 'unsupported-body-field',
      field,
    }),
  );
};

/** With a record, the transaction operates that account and no other. */
export const checkRecordAccount = (
  operated: readonly CustodyAccountHashes[],
  record: CustodyAccountIdentity | undefined,
): CustodyRefusal[] => {
  if (!record) return [];
  const refusals = operated
    .filter(account => !isSameAccount(account, record))
    .map(
      (account): CustodyRefusal => ({
        code: 'custody-context-mismatch',
        reason: 'foreign-account',
        account: hashesOf(account),
      }),
    );
  if (!operated.some(account => isSameAccount(account, record))) {
    refusals.push({
      code: 'custody-context-mismatch',
      reason: 'account-not-operated',
      account: {
        accountValidatorHash: record.contractVersion.accountValidatorHash,
        stakeScriptHash: record.stakeScriptHash,
      },
    });
  }
  return refusals;
};
