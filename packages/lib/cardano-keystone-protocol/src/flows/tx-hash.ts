import { Buffer } from 'buffer';

import {
  CardanoSignTxHashRequest,
  CryptoKeypath,
  PathComponent,
} from '@keystonehq/bc-ur-registry-cardano';

import { MissingProtocolFieldError } from '../errors';
import { KeystoneUrType } from '../ur-types';
import { HARDENED_OFFSET } from '../value-objects/derivation-path.vo';

import { assertUrType, toCborBytes } from './registry-helpers';
import { TRANSACTION_HASH_LENGTH } from './tx';

import type { BuiltRequest } from './account';
import type { DerivationPath } from '../value-objects/derivation-path.vo';
import type { RequestId } from '../value-objects/request-id.vo';
import type { Xfp } from '../value-objects/xfp.vo';
import type { UrResult } from '@lace-lib/ur-transport';

/**
 * Byte length of unsigned transaction CBOR at or above which Keystone
 * firmware cannot parse a Cardano transaction; such transactions must be
 * signed by hash instead. Mirrors the firmware's published ADA size limit:
 * the official keystone-sdk fetches the same value from its remote config,
 * and this constant is that config's offline default.
 */
export const ADA_TX_SIZE_LIMIT = 2048;

/**
 * One owned signer path of a hash signing request, identified by its full
 * derivation path and the master fingerprint of the seed it belongs to.
 */
export interface TxHashSignerPath {
  path: DerivationPath;
  xfp: Xfp;
}

/** Inputs for {@link buildTxHashSignRequest}, all resolved by the caller. */
export interface BuildTxHashSignRequestParams {
  requestId: RequestId;
  txHash: Uint8Array;
  paths: readonly TxHashSignerPath[];
  addressList: readonly string[];
  origin?: string;
}

/** Parsed hash signing response: the raw CBOR transaction witness set. */
export interface ParsedTxHashSignResponse {
  witnessSet: Uint8Array;
}

/**
 * Converts a signer path to a crypto-keypath stamped with its master
 * fingerprint. Built from the Cardano registry's re-exported classes (not the
 * base registry package) so the keypath shares the DataItem implementation
 * the request serialiser recognises; the two packages bundle separate copies.
 */
const toSignerKeypath = ({ path, xfp }: TxHashSignerPath): CryptoKeypath =>
  new CryptoKeypath(
    path.map(
      component =>
        new PathComponent({
          index:
            component >= HARDENED_OFFSET
              ? component - HARDENED_OFFSET
              : component,
          hardened: component >= HARDENED_OFFSET,
        }),
    ),
    Buffer.from(xfp),
  );

/**
 * Assembles a cardano-sign-tx-hash-request asking the device to blind-sign a
 * transaction it cannot parse. The txHash is the blake2b-256 hash of the
 * transaction body (the standard Cardano transaction id); the device shows
 * only this hash, so the caller must surface it for the user to cross-check.
 * The paths list every owned signer (spend inputs, collateral, stake, DRep,
 * required signers) and the addressList carries the owned input addresses.
 */
export const buildTxHashSignRequest = ({
  requestId,
  txHash,
  paths,
  addressList,
  origin,
}: BuildTxHashSignRequestParams): BuiltRequest => {
  if (txHash.length !== TRANSACTION_HASH_LENGTH) {
    throw new Error(
      `transaction hash must be ${TRANSACTION_HASH_LENGTH} bytes, got ${txHash.length}`,
    );
  }
  if (paths.length === 0) {
    throw new Error('at least one signer path is required');
  }
  const request = CardanoSignTxHashRequest.constructCardanoSignTxHashRequest(
    Buffer.from(txHash).toString('hex'),
    paths.map(toSignerKeypath),
    [...addressList],
    requestId,
    origin,
  );
  return {
    urType: KeystoneUrType.TxHashSignRequest,
    cbor: toCborBytes(request),
  };
};

/**
 * Parses the reply to a hash signing request. The device answers with the
 * cardano-signature UR type, but unlike a full tx signing reply the CBOR body
 * is the raw transaction witness set itself, not a registry item, and carries
 * no request id echo; the one-pending-exchange-at-a-time serialization of the
 * QR exchange is the correlation guarantee.
 */
export const parseTxHashSignResponse = (
  response: UrResult,
): ParsedTxHashSignResponse => {
  assertUrType(KeystoneUrType.TxSignResponse, response);
  if (response.cbor.length === 0) {
    throw new MissingProtocolFieldError('witness set');
  }
  return { witnessSet: Uint8Array.from(response.cbor) };
};
