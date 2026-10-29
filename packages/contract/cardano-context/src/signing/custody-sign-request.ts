import { Cardano, Serialization } from '@cardano-sdk/core';
import {
  compareRequestedGrantScope,
  CUSTODY_MAX_GRANT_BATCH,
  detectCustodyEffects,
  inspectCustodyTransaction,
  parseCustodyRequestedGrantScope,
} from '@lace-lib/cardano-custody';

import { SLOT_CONFIG_NETWORK } from '../common/time';

import {
  CardanoCustodyRequestRefusedError,
  parseCustodyDevice,
  parseCustodyGrantUtxos,
  parseCustodyUtxo,
  readCustodyGrantUtxos,
  readCustodyRecordIdentity,
} from './custody-request-context';
import {
  isRecord,
  MalformedRequestError,
  parseArray,
  parseChainId,
  parseString,
} from './request-parsing';

import type { CardanoCustodyRequestDevice } from './custody-request-context';
import type {
  CustodyAccountIdentity,
  CustodyAccountInspection,
  CustodyEffects,
  CustodyGrant,
  CustodyGrantUtxo,
  CustodyRefusal,
  CustodyRequestedGrantScope,
  CustodySlotToPosixMs,
  CustodyTransactionInspection,
} from '@lace-lib/cardano-custody';

export { CardanoCustodyRequestRefusedError } from './custody-request-context';
export type { CardanoCustodyRefusalCode } from './custody-request-context';

/** The protocol payload of `cardano-custody-public-key`, unread. */
export type CardanoCustodyPublicKeyPayload = { chainId: unknown };

/** The protocol payload of `sign-cardano-custody-tx`, unread. */
export type SignCardanoCustodyTxPayload = {
  serializedTx: unknown;
  chainId: unknown;
  device: unknown;
  resolvedInputs: unknown;
  accountRecord: unknown;
  requestedScopes?: unknown;
  grantUtxos?: unknown;
  metadataMeanings?: unknown;
};

/** Everything a checked custody sign request names, read from its bytes and context. */
export type CardanoCustodySignRequestCheck = {
  /** The transaction whose body hash the device signs. */
  transaction: Serialization.Transaction;
  txId: Cardano.TransactionId;
  chainId: Cardano.ChainId;
  /** The account the record names, re-derived from its creator key. */
  identity: CustodyAccountIdentity;
  device: CardanoCustodyRequestDevice;
  inspection: CustodyTransactionInspection;
  /** The record's account: the only custody account the transaction operates. */
  account: CustodyAccountInspection;
  /**
   * The grants the app declared the transaction issues, a replacement among
   * them; absent when it declared none, in which case no comparison was
   * made.
   */
  requestedScopes?: readonly CustodyRequestedGrantScope[];
  /**
   * The grant UTxOs of the account the app reported, in slot order, each
   * checked to be in the shape of a grant UTxO of the account; absent when it
   * reported none. The chain was not asked, so whether a grant still exists,
   * and what a revoked slot's grant was, rest on the app.
   */
  grantUtxos?: readonly CustodyGrantUtxo[];
  /**
   * What the app says the metadata under each label is, for labels the
   * transaction carries; absent when it says nothing. The chain was not
   * asked: consent shows each as reported by the app.
   */
  metadataMeanings?: ReadonlyMap<bigint, string>;
};

type CheckCardanoCustodySignRequestOptions = {
  /** POSIX milliseconds: a grant issued with an expiry at or before it is refused. */
  now: number;
};

/**
 * The chain a custody request names. Its network id must be the one its
 * magic implies, because custody identities keep only the magic, and the
 * signer must know the network's slot length, to read validity bounds and
 * grant expiries as time. Anything else is malformed.
 */
export const parseCardanoCustodyChainId = (value: unknown): Cardano.ChainId => {
  const chainId = parseChainId(value);
  const impliedNetworkId =
    (chainId.networkMagic as Cardano.NetworkMagics) ===
    Cardano.NetworkMagics.Mainnet
      ? Cardano.NetworkId.Mainnet
      : Cardano.NetworkId.Testnet;
  if (
    chainId.networkId !== impliedNetworkId ||
    SLOT_CONFIG_NETWORK[chainId.networkMagic as Cardano.NetworkMagics] ===
      undefined
  ) {
    throw new MalformedRequestError('chainId');
  }
  return chainId;
};

/** POSIX milliseconds at which a slot starts, from the network's slot configuration. */
const slotToPosixMsOn = (
  networkMagic: Cardano.NetworkMagic,
): CustodySlotToPosixMs => {
  const config = SLOT_CONFIG_NETWORK[networkMagic as Cardano.NetworkMagics];
  if (!config) throw new MalformedRequestError('chainId');
  return slot => config.zeroTime + (slot - config.zeroSlot) * config.slotLength;
};

/**
 * Decodes the transaction and every body and witness field the checks read,
 * so a decoding failure is reported as malformed rather than surfacing from
 * inside a check.
 */
const parseTransaction = (value: unknown): Serialization.Transaction => {
  const text = parseString(value, 'serializedTx');
  try {
    const transaction = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(text),
    );
    transaction.toCore();
    return transaction;
  } catch {
    throw new MalformedRequestError('serializedTx');
  }
};

/**
 * The grants the app declares, in the requested scope shape. Each must be a
 * JSON object, no slot may be declared twice, and no transaction issues more
 * than a batch.
 */
const parseRequestedScopes = (
  value: unknown,
): CustodyRequestedGrantScope[] | undefined => {
  if (value === undefined) return undefined;
  const items = parseArray<unknown>(value, 'requestedScopes');
  if (items.length > CUSTODY_MAX_GRANT_BATCH) {
    throw new MalformedRequestError('requestedScopes');
  }
  const scopes = items.map(item => {
    const parsed = isRecord(item)
      ? parseCustodyRequestedGrantScope(item)
      : undefined;
    if (!parsed?.ok) throw new MalformedRequestError('requestedScopes');
    return parsed.value;
  });
  if (new Set(scopes.map(({ slot }) => slot)).size !== scopes.length) {
    throw new MalformedRequestError('requestedScopes');
  }
  return scopes;
};

const METADATA_LABEL = /^(?:0|[1-9]\d*)$/;
// 2^64 - 1 as a literal: `**` on BigInt breaks transpilers that lower it to Math.pow.
const MAX_METADATA_LABEL = 18_446_744_073_709_551_615n;
/** The longest meaning consent shows for one label. */
const MAX_METADATA_MEANING_LENGTH = 200;

/**
 * The meanings the app reports, by metadata label: a JSON object whose keys
 * are decimal 64-bit unsigned labels and whose values are non-empty text
 * of at most 200 characters. Undefined when it reports none.
 */
const parseMetadataMeanings = (
  value: unknown,
): ReadonlyMap<bigint, string> | undefined => {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new MalformedRequestError('metadataMeanings');
  const meanings = new Map<bigint, string>();
  for (const [key, meaning] of Object.entries(value)) {
    if (
      !METADATA_LABEL.test(key) ||
      BigInt(key) > MAX_METADATA_LABEL ||
      typeof meaning !== 'string' ||
      meaning.length === 0 ||
      meaning.length > MAX_METADATA_MEANING_LENGTH
    ) {
      throw new MalformedRequestError('metadataMeanings');
    }
    meanings.set(BigInt(key), meaning);
  }
  return meanings.size === 0 ? undefined : meanings;
};

/** Every label the app gives a meaning must be one the transaction carries. */
const checkMetadataMeanings = (
  meanings: ReadonlyMap<bigint, string> | undefined,
  metadata: Cardano.TxMetadata | undefined,
): void => {
  for (const label of meanings?.keys() ?? []) {
    if (!metadata?.has(label)) {
      throw new CardanoCustodyRequestRefusedError(
        'custody-context-mismatch',
        'metadata-label-not-carried',
        { label },
      );
    }
  }
};

type NetworkEvidence = Cardano.NetworkId | 'unreadable';

const evidenceOfAddress = (address: string): NetworkEvidence =>
  Cardano.Address.fromString(address)?.getNetworkId() ?? 'unreadable';

/**
 * Every network id the body states. Outpoints and bare credentials carry no
 * network; every address and reward account does, and the body may state
 * its network outright. A sub-transaction is walked too, since the witness
 * over the parent covers it.
 */
const networkEvidenceOf = (
  body: Cardano.SubTransactionBody | Cardano.TxBody,
): NetworkEvidence[] => [
  ...(body.networkId === undefined ? [] : [body.networkId]),
  ...body.outputs.map(({ address }) => evidenceOfAddress(address)),
  ...('collateralReturn' in body && body.collateralReturn
    ? [evidenceOfAddress(body.collateralReturn.address)]
    : []),
  ...[...(body.withdrawals ?? []), ...(body.directDeposits ?? [])].map(
    ({ stakeAddress }) => evidenceOfAddress(stakeAddress),
  ),
  ...(body.proposalProcedures ?? []).flatMap(
    ({ rewardAccount, governanceAction }) => [
      evidenceOfAddress(rewardAccount),
      ...(governanceAction.__typename ===
      Cardano.GovernanceActionType.treasury_withdrawals_action
        ? [...governanceAction.withdrawals].map(withdrawal =>
            evidenceOfAddress(withdrawal.rewardAccount),
          )
        : []),
    ],
  ),
  ...(body.certificates ?? []).flatMap(certificate =>
    certificate.__typename === Cardano.CertificateType.PoolRegistration
      ? [evidenceOfAddress(certificate.poolParameters.rewardAccount)]
      : [],
  ),
  ...('subTransactions' in body
    ? (body.subTransactions ?? []).flatMap(sub => networkEvidenceOf(sub.body))
    : []),
];

/**
 * The body must name the request's network wherever it names one, and must
 * name it somewhere: a custody transaction always pays its control output,
 * so a body with no network-bearing element is not one the signer reads.
 */
const checkBodyNetwork = (
  body: Cardano.TxBody,
  networkId: Cardano.NetworkId,
): void => {
  const evidence = networkEvidenceOf(body);
  if (evidence.includes('unreadable')) {
    throw new MalformedRequestError('serializedTx');
  }
  if (evidence.length === 0) {
    throw new CardanoCustodyRequestRefusedError(
      'network-mismatch',
      'no-network-evidence',
    );
  }
  if (evidence.some(stated => stated !== networkId)) {
    throw new CardanoCustodyRequestRefusedError(
      'network-mismatch',
      'body-network',
    );
  }
};

const refusalOf = (refusal: CustodyRefusal) =>
  new CardanoCustodyRequestRefusedError(refusal.code, refusal.reason, refusal);

/** The grants the transaction issues, read from the datums of their grant outputs. */
const writtenGrantsOf = (account: CustodyAccountInspection): CustodyGrant[] =>
  account.issuedGrants.map(({ grant }) => grant);

/**
 * The declared grants must be exactly the grants the transaction issues,
 * field by field. A replacement issues its grant in a new slot, which is the
 * slot to declare; the revoked slot writes no grant. It is a consistency
 * check between two things the same caller supplies, not authentication: it
 * catches an app that encodes a scope other than the one it meant to ask for.
 */
const checkRequestedScopes = (
  requested: readonly CustodyRequestedGrantScope[] | undefined,
  account: CustodyAccountInspection,
  chainId: Cardano.ChainId,
): void => {
  if (requested === undefined) return;
  const written = writtenGrantsOf(account);
  for (const scope of requested) {
    const grant = written.find(({ slot }) => slot === scope.slot);
    if (!grant) {
      throw new CardanoCustodyRequestRefusedError(
        'custody-scope-mismatch',
        'grant-not-written',
        { slot: scope.slot },
      );
    }
    const fields = compareRequestedGrantScope(scope, grant, chainId);
    if (fields.length > 0) {
      throw new CardanoCustodyRequestRefusedError(
        'custody-scope-mismatch',
        'field-mismatch',
        { slot: scope.slot, fields },
      );
    }
  }
  const undeclared = written.find(
    grant => !requested.some(({ slot }) => slot === grant.slot),
  );
  if (undeclared) {
    throw new CardanoCustodyRequestRefusedError(
      'custody-scope-mismatch',
      'undeclared-grant',
      { slot: undeclared.slot },
    );
  }
};

/**
 * The transaction may reference nothing but the UTxOs that park its
 * account's contract scripts on the request's network. Inspection also
 * admits a reference input that carries no script, which a grant spend
 * needs for the control UTxO; this check signs no grant spend, so it reads
 * nothing else.
 */
const checkReferenceInputs = (
  transaction: Serialization.Transaction,
  { contractVersion }: CustodyAccountIdentity,
  { networkMagic }: Cardano.ChainId,
): void => {
  const parked = contractVersion.referenceScripts[networkMagic] ?? [];
  for (const { txId, index } of transaction.body().toCore().referenceInputs ??
    []) {
    const isParked = parked.some(
      ({ txIn }) =>
        txIn.txId.toLowerCase() === txId.toLowerCase() && txIn.index === index,
    );
    if (!isParked) {
      throw new CardanoCustodyRequestRefusedError(
        'custody-unsupported-operation',
        'foreign-reference-input',
        { input: { txId, index } },
      );
    }
  }
};

/**
 * Checks a `sign-cardano-custody-tx` request and reads everything consent
 * shows from it, refusing on the first failure in this order: a malformed
 * payload, transaction, resolution, requested scope, grant UTxO, metadata
 * meaning or device key (`malformed-request`); a body that names another
 * network than `chainId` (`network-mismatch`); an account record that does
 * not re-derive or names an unknown contract version; a reported grant UTxO
 * that is not in the shape of a grant UTxO of the account, or that the
 * request reports twice or resolves otherwise (`custody-context-mismatch`
 * or `custody-malformed-datum`); then every rule of
 * `inspectCustodyTransaction`, with the device key derived from the request's
 * account public key at the requested index as the signing device; a
 * reference input other than a UTxO that parks the account's contract
 * scripts on the network (`custody-unsupported-operation`,
 * `foreign-reference-input`); then the requested scopes
 * (`custody-scope-mismatch`); and last a reported metadata meaning for a
 * label the transaction does not carry (`custody-context-mismatch`,
 * `metadata-label-not-carried`). Grant spends are always refused: the
 * passkey is never a grantee.
 *
 * The hosted signer runs it to describe the request and again on the exact
 * bytes before its ceremony, so a path that skips the description never
 * obtains a witness. The context is the caller's and is not checked against
 * the chain.
 *
 * @throws `MalformedRequestError` When a field cannot be read.
 * @throws `CardanoCustodyRequestRefusedError` When a rule refuses the request.
 */
export const checkCardanoCustodySignRequest = async (
  payload: unknown,
  { now }: CheckCardanoCustodySignRequestOptions,
): Promise<CardanoCustodySignRequestCheck> => {
  if (!isRecord(payload)) throw new MalformedRequestError('payload');
  const transaction = parseTransaction(payload.serializedTx);
  const chainId = parseCardanoCustodyChainId(payload.chainId);
  const resolvedInputs = parseArray<unknown>(
    payload.resolvedInputs,
    'resolvedInputs',
  ).map(value => parseCustodyUtxo(value, 'resolvedInputs'));
  if (payload.accountRecord === undefined) {
    throw new MalformedRequestError('accountRecord');
  }
  const requestedScopes = parseRequestedScopes(payload.requestedScopes);
  const reportedGrantUtxos = parseCustodyGrantUtxos(payload.grantUtxos);
  const metadataMeanings = parseMetadataMeanings(payload.metadataMeanings);
  const device = await parseCustodyDevice(payload.device);

  checkBodyNetwork(transaction.body().toCore(), chainId.networkId);
  const identity = readCustodyRecordIdentity(payload.accountRecord, chainId);
  const grantUtxos =
    reportedGrantUtxos &&
    readCustodyGrantUtxos(reportedGrantUtxos, identity, resolvedInputs);
  const inspected = inspectCustodyTransaction(transaction, resolvedInputs, {
    chainId,
    now,
    slotToPosixMs: slotToPosixMsOn(chainId.networkMagic),
    accountRecord: payload.accountRecord,
    deviceKeyHash: device.keyHash,
  });
  if (!inspected.ok) throw refusalOf(inspected.error.refusals[0]);
  const account = inspected.value.accounts.find(
    candidate =>
      candidate.accountValidatorHash ===
        identity.contractVersion.accountValidatorHash &&
      candidate.stakeScriptHash === identity.stakeScriptHash,
  );
  if (!account) {
    // Inspection with a record refuses a transaction that leaves the
    // record's account untouched, so this guards a broken invariant.
    throw new CardanoCustodyRequestRefusedError(
      'custody-context-mismatch',
      'account-not-operated',
    );
  }
  checkReferenceInputs(transaction, identity, chainId);
  checkRequestedScopes(requestedScopes, account, chainId);
  checkMetadataMeanings(metadataMeanings, inspected.value.metadata);

  return {
    transaction,
    txId: transaction.getId(),
    chainId,
    identity,
    device,
    inspection: inspected.value,
    account,
    ...(requestedScopes === undefined ? {} : { requestedScopes }),
    ...(grantUtxos === undefined ? {} : { grantUtxos }),
    ...(metadataMeanings === undefined ? {} : { metadataMeanings }),
  };
};

/**
 * Checks a transaction sent through the ordinary `sign-cardano-tx` kind for
 * custody effects, from its bytes alone. Anything that operates a custody
 * account is refused with `custody-request-required`: the ordinary consent
 * shows no datum and no spent input, so a state rewrite would read as a
 * plain payment. A datum-free payment to the account validator that no
 * redeemer can ever spend is refused with `custody-locked-output`, the code
 * the custody kind gives it too, because no kind signs it. Returns the
 * effects found, so a deposit can be named as one.
 *
 * @throws `MalformedRequestError` When the transaction cannot be decoded.
 * @throws `CardanoCustodyRequestRefusedError` When it touches a custody account.
 */
export const checkOrdinaryCardanoTransaction = (
  serializedTx: string,
): CustodyEffects => {
  let effects: CustodyEffects;
  try {
    effects = detectCustodyEffects(
      Serialization.Transaction.fromCbor(Serialization.TxCBOR(serializedTx)),
    );
  } catch {
    throw new MalformedRequestError('serializedTx');
  }
  // Operating an account is reported first: the dApp must choose the custody
  // kind before that kind can report the locked output as well.
  const operating = effects.reasons.find(
    ({ kind }) => kind !== 'deposit' && kind !== 'unspendable-output',
  );
  if (operating) {
    throw new CardanoCustodyRequestRefusedError(
      'custody-request-required',
      operating.kind,
      effects.reasons,
    );
  }
  const locked = effects.reasons.find(
    ({ kind }) => kind === 'unspendable-output',
  );
  if (locked) {
    throw new CardanoCustodyRequestRefusedError(
      'custody-locked-output',
      locked.kind,
      effects.reasons,
    );
  }
  return effects;
};
