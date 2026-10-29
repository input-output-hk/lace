import { Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import {
  classifyCustodyAccountUtxos,
  CUSTODY_MAX_GRANTS,
  deriveCustodyDeviceKey,
  parseCustodyAccountRecord,
} from '@lace-lib/cardano-custody';

import {
  isRecord,
  MalformedRequestError,
  parseArray,
  parseExtendedAccountPublicKey,
} from './request-parsing';

import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex, Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type {
  CustodyAccountIdentity,
  CustodyGrantUtxo,
  CustodyRefusalCode,
} from '@lace-lib/cardano-custody';

/**
 * Why the signer refuses a request that involves a Cardano custody account.
 * Every code is answered before consent is asked, so a refused request never
 * costs the user a ceremony.
 */
export type CardanoCustodyRefusalCode =
  | CustodyRefusalCode
  | 'custody-request-required'
  | 'custody-scope-mismatch'
  | 'network-mismatch';

/**
 * The signer refuses a request because of what it does to a Cardano custody
 * account, or because its custody context does not match its bytes. `code`
 * is what the dApp receives; `reason` names the rule, and `detail` carries
 * what the rule found.
 */
export class CardanoCustodyRequestRefusedError extends Error {
  public constructor(
    readonly code: CardanoCustodyRefusalCode,
    readonly reason: string,
    readonly detail?: unknown,
  ) {
    super(`The signer refused the custody request: ${code} (${reason}).`);
    this.name = 'CardanoCustodyRequestRefusedError';
  }
}

/** The device a custody request names, and the key it derives to. */
export type CardanoCustodyRequestDevice = {
  /** The CIP-1854 account extended public key m/1854'/1815'/a', lower case. */
  extendedAccountPublicKey: Bip32PublicKeyHex;
  index: number;
  /** Hash of the key at m/1854'/1815'/a'/0/index: the only key that may sign. */
  keyHash: Ed25519KeyHashHex;
};

const HEX = /^(?:[\da-f]{2})+$/i;

/** Last index of a soft BIP32 derivation; device keys are never hardened. */
const MAX_SOFT_INDEX = 0x7f_ff_ff_ff;

/**
 * A CIP-30 `TransactionUnspentOutput` in CBOR hex: one CBOR item and nothing
 * after it, so an unspent output has exactly one reading.
 *
 * @throws `MalformedRequestError` Naming `field`, for anything else.
 */
export const parseCustodyUtxo = (
  value: unknown,
  field: string,
): Cardano.Utxo => {
  if (typeof value !== 'string' || !HEX.test(value)) {
    throw new MalformedRequestError(field);
  }
  try {
    const cbor = HexBlob(value.toLowerCase());
    const reader = new Serialization.CborReader(cbor);
    reader.skipValue();
    if (reader.peekState() !== Serialization.CborReaderState.Finished) {
      throw new Error('Trailing bytes after the unspent output.');
    }
    const [input, output] =
      Serialization.TransactionUnspentOutput.fromCbor(cbor).toCore();
    return [{ ...input, address: output.address }, output];
  } catch {
    throw new MalformedRequestError(field);
  }
};

/**
 * The device a request names: a CIP-1854 account extended public key and a
 * soft index, with the hash of the key they derive.
 *
 * @throws `MalformedRequestError` When either cannot be read or derived.
 */
export const parseCustodyDevice = async (
  value: unknown,
): Promise<CardanoCustodyRequestDevice> => {
  if (!isRecord(value)) throw new MalformedRequestError('device');
  const extendedAccountPublicKey = parseExtendedAccountPublicKey(
    value.extendedAccountPublicKey,
    'device.extendedAccountPublicKey',
  ).toLowerCase() as Bip32PublicKeyHex;
  const { index } = value;
  if (
    typeof index !== 'number' ||
    !Number.isSafeInteger(index) ||
    index < 0 ||
    index > MAX_SOFT_INDEX
  ) {
    throw new MalformedRequestError('device.index');
  }
  const derived = await deriveCustodyDeviceKey(extendedAccountPublicKey, index);
  if (!derived.ok) {
    throw new MalformedRequestError('device.extendedAccountPublicKey');
  }
  return { extendedAccountPublicKey, index, keyHash: derived.value.keyHash };
};

/**
 * The account a public account record names on `chainId`, re-derived from
 * its creator key.
 *
 * @throws `CardanoCustodyRequestRefusedError` With
 *   `custody-unsupported-version` for an unknown contract version, and
 *   `custody-context-mismatch` for a record that does not re-derive or is for
 *   another network.
 */
export const readCustodyRecordIdentity = (
  record: unknown,
  chainId: Cardano.ChainId,
): CustodyAccountIdentity => {
  const parsed = parseCustodyAccountRecord(record, chainId.networkMagic);
  if (parsed.ok) return parsed.value.identity;
  throw parsed.error.code === 'unsupported-contract-version'
    ? new CardanoCustodyRequestRefusedError(
        'custody-unsupported-version',
        'unsupported-contract-version',
        parsed.error,
      )
    : new CardanoCustodyRequestRefusedError(
        'custody-context-mismatch',
        'invalid-record',
        parsed.error,
      );
};

/**
 * The grant UTxOs an app reports beside a custody transaction, each a
 * CIP-30 `TransactionUnspentOutput` in CBOR hex; undefined when it reports
 * none. An account has at most `CUSTODY_MAX_GRANTS` grant UTxOs at a time.
 *
 * @throws `MalformedRequestError` Naming `grantUtxos`, for anything else.
 */
export const parseCustodyGrantUtxos = (
  value: unknown,
): Cardano.Utxo[] | undefined => {
  if (value === undefined) return undefined;
  const items = parseArray<unknown>(value, 'grantUtxos');
  if (items.length > CUSTODY_MAX_GRANTS) {
    throw new MalformedRequestError('grantUtxos');
  }
  return items.map(item => parseCustodyUtxo(item, 'grantUtxos'));
};

const outpointKey = ({ txId, index }: Cardano.TxIn) => `${txId}#${index}`;

const outputCborOf = (output: Cardano.TxOut) =>
  Serialization.TransactionOutput.fromCore(output).toCbor();

/** The grant a reported UTxO carries, refused unless it is a grant UTxO of the account. */
const readGrantUtxo = (
  utxo: Cardano.Utxo,
  identity: CustodyAccountIdentity,
): CustodyGrantUtxo => {
  const [{ txId, index }, output] = utxo;
  const input = { txId, index };
  if (output.address !== identity.address) {
    throw new CardanoCustodyRequestRefusedError(
      'custody-context-mismatch',
      'grant-utxo-address',
      { input, address: output.address },
    );
  }
  const {
    grants: [grant],
    anomalies: [anomaly],
  } = classifyCustodyAccountUtxos(
    {
      accountValidatorHash: identity.contractVersion.accountValidatorHash,
      stakeScriptHash: identity.stakeScriptHash,
      address: identity.address,
    },
    [utxo],
  );
  if (grant) return grant;
  if (!anomaly || anomaly.code === 'unexpected-account-tokens') {
    throw new CardanoCustodyRequestRefusedError(
      'custody-context-mismatch',
      'grant-utxo-not-grant',
      { input },
    );
  }
  throw new CardanoCustodyRequestRefusedError(
    'custody-malformed-datum',
    'grant-utxo-malformed',
    { input, anomaly },
  );
};

/**
 * The grants of the reported grant UTxOs, in slot order. Each must sit at
 * the account address and hold exactly one grant token of the account, in
 * quantity one beside lovelace only, with an inline grant whose slot the
 * token's name carries: the shape the contract keeps every grant UTxO in.
 * No outpoint and no slot may be reported twice, and a UTxO the request
 * also resolves must be reported with the same output. The chain was not
 * asked, so consent labels what these grants say as reported by the app.
 *
 * @throws `CardanoCustodyRequestRefusedError` With `custody-context-mismatch`
 *   for a UTxO at another address (`grant-utxo-address`), one that holds no
 *   grant token of the account (`grant-utxo-not-grant`), one reported twice
 *   or a slot reported twice (`duplicate-grant-utxo`), and one its
 *   resolution contradicts (`grant-utxo-resolution`); with
 *   `custody-malformed-datum` for a grant token in a shape the contract
 *   rules out (`grant-utxo-malformed`).
 */
export const readCustodyGrantUtxos = (
  utxos: readonly Cardano.Utxo[],
  identity: CustodyAccountIdentity,
  resolvedInputs: readonly Cardano.Utxo[],
): CustodyGrantUtxo[] => {
  const resolutions = new Map(
    resolvedInputs.map(([input, output]) => [outpointKey(input), output]),
  );
  const grantUtxos: CustodyGrantUtxo[] = [];
  for (const utxo of utxos) {
    const grantUtxo = readGrantUtxo(utxo, identity);
    const { slot } = grantUtxo.grant;
    const [{ txId, index }, output] = utxo;
    const key = outpointKey({ txId, index });
    if (
      grantUtxos.some(
        reported =>
          outpointKey(reported.utxo[0]) === key || reported.grant.slot === slot,
      )
    ) {
      throw new CardanoCustodyRequestRefusedError(
        'custody-context-mismatch',
        'duplicate-grant-utxo',
        { input: { txId, index }, slot },
      );
    }
    const resolution = resolutions.get(key);
    if (resolution && outputCborOf(resolution) !== outputCborOf(output)) {
      throw new CardanoCustodyRequestRefusedError(
        'custody-context-mismatch',
        'grant-utxo-resolution',
        { input: { txId, index } },
      );
    }
    grantUtxos.push(grantUtxo);
  }
  // No two share a slot, so the order is total.
  return grantUtxos.sort((a, b) => (a.grant.slot < b.grant.slot ? -1 : 1));
};
