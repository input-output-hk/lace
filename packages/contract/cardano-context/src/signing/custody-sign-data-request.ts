import { HexBlob } from '@cardano-sdk/util';
import {
  decodeCustodyStateDevices,
  decodeCustodyStateLogic,
  findCustodyLogic,
  isCustodyDataOrigin,
  isCustodyDataPurpose,
} from '@lace-lib/cardano-custody';

import {
  CardanoCustodyRequestRefusedError,
  parseCustodyDevice,
  parseCustodyUtxo,
  readCustodyRecordIdentity,
} from './custody-request-context';
import { parseCardanoCustodyChainId } from './custody-sign-request';
import { isRecord, MalformedRequestError } from './request-parsing';

import type { CardanoCustodyRequestDevice } from './custody-request-context';
import type { Cardano } from '@cardano-sdk/core';
import type {
  CustodyAccountIdentity,
  CustodyDataPurpose,
} from '@lace-lib/cardano-custody';

/**
 * What a custody data signature is for, as consent names it and the
 * signature binds it: signing in to the requesting site, or linking the
 * account to the user's account there.
 */
export type CardanoCustodyDataPurpose = CustodyDataPurpose;

/** The protocol payload of `sign-cardano-custody-data`, unread. */
export type SignCardanoCustodyDataPayload = {
  chainId: unknown;
  device: unknown;
  accountRecord: unknown;
  controlUtxo: unknown;
  payload: unknown;
  purpose: unknown;
};

/** Everything a checked custody data request names. */
export type CardanoCustodySignDataRequestCheck = {
  chainId: Cardano.ChainId;
  /** The account the record names, re-derived from its creator key. */
  identity: CustodyAccountIdentity;
  device: CardanoCustodyRequestDevice;
  /**
   * The device key hashes the control UTxO the app reported lists, the
   * device among them. Nothing checked them against the chain.
   */
  devices: readonly HexBlob[];
  /** The bytes to sign, lower-case hex. */
  payload: HexBlob;
  purpose: CardanoCustodyDataPurpose;
  /** The origin of the site the signature is for, which it binds. */
  origin: string;
};

/** Where a custody data request comes from, as its signer learnt it. */
type CardanoCustodySignDataContext = {
  /**
   * The serialized origin of the site the signature is for: the dApp origin
   * the hosted signer's protocol server reports, or the app's own origin in
   * local mode. Never a value from the request payload.
   */
  origin: string | undefined;
};

const PAYLOAD_HEX = /^(?:[\da-f]{2})+$/i;

const parsePayload = (value: unknown): HexBlob => {
  if (typeof value !== 'string' || !PAYLOAD_HEX.test(value)) {
    throw new MalformedRequestError('payload');
  }
  return HexBlob(value.toLowerCase());
};

const parsePurpose = (value: unknown): CardanoCustodyDataPurpose => {
  if (!isCustodyDataPurpose(value)) throw new MalformedRequestError('purpose');
  return value;
};

const parseOrigin = (value: unknown): string => {
  if (!isCustodyDataOrigin(value)) throw new MalformedRequestError('origin');
  return value;
};

/**
 * The devices the control UTxO lists, refused unless the UTxO sits at the
 * account address, holds exactly one state NFT and carries an inline datum
 * that names a logic of the account's contract version in its first field
 * and lists key hashes in its second. Only those two fields are read: the
 * contract keeps them in place under every logic, as the account proxy and
 * the stake script read them. A logic outside the catalogue may have
 * admitted any device, so its list proves nothing and is refused.
 */
const readControlDevices = (
  [, output]: Cardano.Utxo,
  identity: CustodyAccountIdentity,
): HexBlob[] => {
  if (output.address !== identity.address) {
    throw new CardanoCustodyRequestRefusedError(
      'custody-context-mismatch',
      'control-utxo-address',
      { address: output.address },
    );
  }
  if (output.value.assets?.get(identity.stateNftAssetId) !== 1n) {
    throw new CardanoCustodyRequestRefusedError(
      'custody-malformed-datum',
      'control-utxo-state-nft',
    );
  }
  if (output.datum === undefined) {
    throw new CardanoCustodyRequestRefusedError(
      'custody-malformed-datum',
      'control-utxo-datum',
    );
  }
  const logic = decodeCustodyStateLogic(output.datum);
  if (!logic.ok) {
    throw new CardanoCustodyRequestRefusedError(
      'custody-malformed-datum',
      'control-utxo-datum',
      logic.error,
    );
  }
  const known = findCustodyLogic(identity.contractVersion, logic.value);
  if (!known.ok) {
    throw new CardanoCustodyRequestRefusedError(
      'custody-unsupported-version',
      'unknown-logic',
      known.error,
    );
  }
  const decoded = decodeCustodyStateDevices(output.datum);
  if (!decoded.ok) {
    throw new CardanoCustodyRequestRefusedError(
      'custody-malformed-datum',
      'control-utxo-datum',
      decoded.error,
    );
  }
  return decoded.value;
};

type ReadCardanoCustodyControlUtxoProps = {
  /** The public account record, unread. */
  accountRecord: unknown;
  chainId: Cardano.ChainId;
  /** The UTxO that should be the account's control UTxO. */
  controlUtxo: Cardano.Utxo;
};

/**
 * The account a public record names on `chainId`, re-derived from its
 * creator key, and the device key hashes its control UTxO lists, read from
 * the second field of the control datum once the first names a logic of
 * the account's contract version.
 *
 * @throws `CardanoCustodyRequestRefusedError` With
 *   `custody-unsupported-version` for an unknown contract version
 *   (`unsupported-contract-version`) or a control datum that names a logic
 *   outside the version's catalogue (`unknown-logic`);
 *   `custody-context-mismatch` for a record that does not re-derive on
 *   `chainId` or a control UTxO at another address; and
 *   `custody-malformed-datum` for a control UTxO without exactly one state
 *   NFT, or without an inline datum that names a logic hash first and lists
 *   key hashes second.
 */
export const readCardanoCustodyControlUtxo = ({
  accountRecord,
  chainId,
  controlUtxo,
}: ReadCardanoCustodyControlUtxoProps): {
  identity: CustodyAccountIdentity;
  devices: HexBlob[];
} => {
  const identity = readCustodyRecordIdentity(accountRecord, chainId);
  return { identity, devices: readControlDevices(controlUtxo, identity) };
};

/**
 * Checks a `sign-cardano-custody-data` request, refusing on the first
 * failure in this order: a payload field it cannot read, including a
 * `payload` that is not hex of at least one byte and an unknown `purpose`,
 * or an `origin` that is not a serialized origin (`malformed-request`); an
 * account record that names an unknown contract version or does not
 * re-derive on `chainId`; a control UTxO that is not at the account address
 * (`custody-context-mismatch`), does not hold exactly one state NFT and an
 * inline datum that names a logic hash first and lists key hashes second
 * (`custody-malformed-datum`), or names a logic outside the version's
 * catalogue (`custody-unsupported-version`, `unknown-logic`); and a device
 * key it does not list (`custody-device-not-listed`).
 *
 * The hosted signer runs it to describe the request and again before its
 * ceremony; the local SDK signer runs it before its ceremony. The control
 * UTxO is the caller's and is not checked against the chain: a site that
 * verifies the signature reads the device list from the chain itself.
 *
 * @throws `MalformedRequestError` When a field cannot be read.
 * @throws `CardanoCustodyRequestRefusedError` When a rule refuses the request.
 */
export const checkCardanoCustodySignDataRequest = async (
  payload: unknown,
  { origin }: CardanoCustodySignDataContext,
): Promise<CardanoCustodySignDataRequestCheck> => {
  if (!isRecord(payload)) throw new MalformedRequestError('payload');
  const chainId = parseCardanoCustodyChainId(payload.chainId);
  const data = parsePayload(payload.payload);
  const purpose = parsePurpose(payload.purpose);
  const site = parseOrigin(origin);
  const controlUtxo = parseCustodyUtxo(payload.controlUtxo, 'controlUtxo');
  if (payload.accountRecord === undefined) {
    throw new MalformedRequestError('accountRecord');
  }
  const device = await parseCustodyDevice(payload.device);

  const { identity, devices } = readCardanoCustodyControlUtxo({
    accountRecord: payload.accountRecord,
    chainId,
    controlUtxo,
  });
  if (!devices.some(listed => listed.toLowerCase() === device.keyHash)) {
    throw new CardanoCustodyRequestRefusedError(
      'custody-device-not-listed',
      'not-listed',
      { keyHash: device.keyHash },
    );
  }
  return {
    chainId,
    identity,
    device,
    devices,
    payload: data,
    purpose,
    origin: site,
  };
};
