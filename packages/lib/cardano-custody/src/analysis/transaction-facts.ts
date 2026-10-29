import { Cardano, Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';

import { fail, ok } from '../result';

import { viewOfOutput } from './outputs';
import { policyIdOf } from './value';

import type { CustodyResult } from '../result';
import type { CustodyInspectionOptions } from './inspect';
import type { OutputView } from './outputs';
import type { CustodyInputSource, CustodyRefusal } from './refusals';

export interface InputView {
  readonly input: Cardano.TxIn;
  readonly output: OutputView;
}

export interface TransactionFacts {
  readonly body: Cardano.TxBody;
  /** Spent inputs in ledger order: a spend redeemer's index points into it. */
  readonly inputs: readonly InputView[];
  readonly referenceInputs: readonly InputView[];
  readonly collaterals: readonly InputView[];
  readonly outputs: readonly OutputView[];
  readonly collateralReturn: OutputView | undefined;
  readonly redeemers: readonly Cardano.Redeemer[];
  /** Lower-case key hashes. */
  readonly requiredSigners: ReadonlySet<string>;
  /** Minted policy ids in ledger order: a mint redeemer's index points into it. */
  readonly mintPolicies: readonly string[];
  /** Lower-case asset ids. */
  readonly mint: ReadonlyMap<Cardano.AssetId, bigint>;
  /** The start of the `invalidBefore` slot in POSIX milliseconds; undefined when open. */
  readonly lowerBoundMs: number | undefined;
  /** The start of the `invalidHereafter` slot in POSIX milliseconds; undefined when open. */
  readonly upperBoundMs: number | undefined;
  /** Hashes of the witness-set scripts. */
  readonly witnessScriptHashes: ReadonlySet<string>;
  /**
   * Every reward account the body's withdrawal map names, in the order of
   * its bytes and repeats included. The decoded body keeps one entry per
   * reward account, so only the bytes show a repeat.
   */
  readonly withdrawalAccounts: readonly Cardano.RewardAccount[];
}

const outpointKey = ({ txId, index }: Cardano.TxIn): string =>
  `${txId.toLowerCase()}#${index}`;

const toTxIn = ({ txId, index }: Cardano.TxIn): Cardano.TxIn => ({
  txId,
  index,
});

/** Byte order of lower-case hex, then index: how the ledger orders inputs. */
const compareOutpoints = (a: Cardano.TxIn, b: Cardano.TxIn): number => {
  const aId = a.txId.toLowerCase();
  const bId = b.txId.toLowerCase();
  if (aId !== bId) return aId < bId ? -1 : 1;
  return a.index - b.index;
};

interface ResolvedBody {
  readonly inputs: readonly InputView[];
  readonly referenceInputs: readonly InputView[];
  readonly collaterals: readonly InputView[];
}

/**
 * Pairs every input the body names with the caller's resolution. Every
 * input, reference input and collateral input must be resolved exactly once,
 * and no resolution may name an outpoint the body does not.
 */
export const resolveBody = (
  body: Cardano.TxBody,
  resolvedInputs: readonly Cardano.Utxo[],
): CustodyResult<ResolvedBody, CustodyRefusal[]> => {
  const refusals: CustodyRefusal[] = [];
  const resolutions = new Map<string, OutputView>();
  const sources: [Cardano.TxIn[], CustodyInputSource][] = [
    [body.inputs, 'inputs'],
    [body.referenceInputs ?? [], 'referenceInputs'],
    [body.collaterals ?? [], 'collaterals'],
  ];
  const named = new Set(sources.flatMap(([inputs]) => inputs.map(outpointKey)));
  for (const [input, txOut] of resolvedInputs) {
    const key = outpointKey(input);
    const view = viewOfOutput(txOut);
    if (!named.has(key)) {
      refusals.push({
        code: 'custody-context-mismatch',
        reason: 'resolution-not-in-body',
        input: toTxIn(input),
      });
    } else if (resolutions.has(key)) {
      refusals.push({
        code: 'custody-context-mismatch',
        reason: 'duplicate-resolution',
        input: toTxIn(input),
      });
    } else if (view.address === undefined) {
      refusals.push({
        code: 'custody-context-mismatch',
        reason: 'invalid-resolution',
        input: toTxIn(input),
      });
    }
    resolutions.set(key, view);
  }
  const resolve = (
    inputs: readonly Cardano.TxIn[],
    source: CustodyInputSource,
  ): InputView[] =>
    inputs.flatMap(input => {
      const output = resolutions.get(outpointKey(input));
      if (output) return [{ input: toTxIn(input), output }];
      refusals.push({
        code: 'custody-context-mismatch',
        reason: 'unresolved-input',
        input: toTxIn(input),
        source,
      });
      return [];
    });
  const [inputs, referenceInputs, collaterals] = sources.map(([list, source]) =>
    resolve(list, source),
  );
  return refusals.length > 0
    ? fail(refusals)
    : ok({
        inputs: inputs.sort((a, b) => compareOutpoints(a.input, b.input)),
        referenceInputs,
        collaterals,
      });
};

/** The key of the withdrawal map in a transaction body. */
const WITHDRAWALS_KEY = 5n;

/**
 * The reward accounts the withdrawal maps of a body name, read from its
 * bytes, repeats included: a repeated key, and a repeated map, are lost
 * once the body is decoded.
 */
const withdrawalAccountsOf = (bodyCbor: HexBlob): Cardano.RewardAccount[] => {
  const reader = new Serialization.CborReader(bodyCbor);
  const accounts: Cardano.RewardAccount[] = [];
  reader.readStartMap();
  while (reader.peekState() !== Serialization.CborReaderState.EndMap) {
    if (reader.readInt() !== WITHDRAWALS_KEY) {
      reader.skipValue();
      continue;
    }
    reader.readStartMap();
    while (reader.peekState() !== Serialization.CborReaderState.EndMap) {
      accounts.push(
        Cardano.Address.fromBytes(
          HexBlob.fromBytes(reader.readByteString()),
        ).toBech32() as Cardano.RewardAccount,
      );
      reader.skipValue();
    }
    reader.readEndMap();
  }
  return accounts;
};

export const readTransaction = (
  {
    body,
    bodyCbor,
    witness,
  }: { body: Cardano.TxBody; bodyCbor: HexBlob; witness: Cardano.Witness },
  resolved: ResolvedBody,
  options: CustodyInspectionOptions,
): TransactionFacts => {
  const mint = new Map(
    [...(body.mint ?? new Map<Cardano.AssetId, bigint>())].map(
      ([assetId, quantity]) => [
        assetId.toLowerCase() as Cardano.AssetId,
        quantity,
      ],
    ),
  );
  const { invalidBefore, invalidHereafter } = body.validityInterval ?? {};
  return {
    body,
    ...resolved,
    outputs: body.outputs.map(viewOfOutput),
    collateralReturn: body.collateralReturn
      ? viewOfOutput(body.collateralReturn)
      : undefined,
    redeemers: witness.redeemers ?? [],
    requiredSigners: new Set(
      (body.requiredExtraSignatures ?? []).map(signer => signer.toLowerCase()),
    ),
    mintPolicies: [...new Set([...mint.keys()].map(policyIdOf))].sort(),
    mint,
    lowerBoundMs:
      invalidBefore === undefined
        ? undefined
        : options.slotToPosixMs(invalidBefore),
    upperBoundMs:
      invalidHereafter === undefined
        ? undefined
        : options.slotToPosixMs(invalidHereafter),
    witnessScriptHashes: new Set(
      (witness.scripts ?? []).map(script =>
        Serialization.Script.fromCore(script).hash(),
      ),
    ),
    withdrawalAccounts: withdrawalAccountsOf(bodyCbor),
  };
};

export const redeemerData = (
  facts: TransactionFacts,
  purpose: Cardano.RedeemerPurpose,
  index: number,
): Cardano.PlutusData | undefined =>
  facts.redeemers.find(
    redeemer => redeemer.purpose === purpose && redeemer.index === index,
  )?.data;

export const paymentCredentialOf = (
  view: OutputView,
): Cardano.Credential | undefined =>
  (
    view.address?.asBase() ??
    view.address?.asEnterprise() ??
    view.address?.asPointer()
  )?.getPaymentCredential();

export const stakeCredentialOf = (
  certificate: Cardano.Certificate,
): Cardano.Credential | undefined =>
  'stakeCredential' in certificate ? certificate.stakeCredential : undefined;

export const scriptHashOfRewardAccount = (
  rewardAccount: Cardano.RewardAccount,
): string | undefined => {
  const credential = Cardano.Address.fromString(rewardAccount)
    ?.asReward()
    ?.getPaymentCredential();
  return credential?.type === Cardano.CredentialType.ScriptHash
    ? credential.hash
    : undefined;
};
