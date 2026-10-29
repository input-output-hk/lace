import { Cardano } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { expect } from 'vitest';

import { inspectCustodyTransaction } from '../src';

import { buildTransaction, inspectionOptions } from './custody-transactions';
import { AGENT_KEY, lovelaceScope } from './fixtures';

import type {
  CustodyGrant,
  CustodyRecipient,
  CustodyRefusal,
  CustodyResult,
  CustodyTransactionInspection,
} from '../src';
import type { TransactionShape } from './custody-transactions';
import type { CustodyInspectionOptions } from '../src/analysis/inspect';

export type Inspection = CustodyResult<
  CustodyTransactionInspection,
  { readonly refusals: readonly CustodyRefusal[] }
>;

export const inspectBuilt = (
  { transaction, resolvedInputs }: ReturnType<typeof buildTransaction>,
  overrides: Partial<CustodyInspectionOptions> = {},
): Inspection =>
  inspectCustodyTransaction(
    transaction,
    resolvedInputs,
    inspectionOptions(overrides),
  );

export const inspect = (
  shape: TransactionShape,
  overrides: Partial<CustodyInspectionOptions> = {},
): Inspection => inspectBuilt(buildTransaction(shape), overrides);

const json = (value: unknown) =>
  JSON.stringify(value, (_, item: unknown) =>
    typeof item === 'bigint' ? item.toString() : item,
  );

export const accepted = (result: Inspection): CustodyTransactionInspection => {
  if (!result.ok) {
    throw new Error(`Unexpected refusals: ${json(result.error.refusals)}`);
  }
  return result.value;
};

export const refusalsOf = (result: Inspection): readonly CustodyRefusal[] =>
  result.ok ? [] : result.error.refusals;

/** Every refusal as `code/reason`, in check order. */
export const reasonsOf = (result: Inspection) =>
  refusalsOf(result).map(({ code, reason }) => `${code}/${reason}`);

export const onlyAccount = (inspection: CustodyTransactionInspection) => {
  expect(inspection.accounts).toHaveLength(1);
  return inspection.accounts[0];
};

export const transition = <T>(result: CustodyResult<T, unknown>): T => {
  if (!result.ok) throw new Error(`Unexpected failure: ${json(result.error)}`);
  return result.value;
};

export const keyOf = (byte: number) =>
  HexBlob(byte.toString(16).padStart(2, '0').repeat(28));

export const recipientOf = (byte: number): CustodyRecipient => ({
  paymentCredential: {
    type: Cardano.CredentialType.KeyHash,
    hash: keyOf(byte),
  },
});

/** A lovelace grant of the agent key issued under generation zero, changed as given. */
export const grantOf = (changes: Partial<CustodyGrant>): CustodyGrant => ({
  slot: 0n,
  grantee: AGENT_KEY,
  generation: 0n,
  scope: lovelaceScope(),
  ...changes,
});

/** A native script with no conditions: the smallest reference script. */
export const REFERENCE_SCRIPT: Cardano.Script = {
  __type: Cardano.ScriptType.Native,
  kind: Cardano.NativeScriptKind.RequireAllOf,
  scripts: [],
};
