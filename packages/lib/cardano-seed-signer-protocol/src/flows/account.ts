import {
  PURPOSE_CIP1852,
  decodeCardanoAccountResponse,
  encodeCardanoAccountRequest,
} from '../messages/cardano-account';
import { CardanoUrType } from '../ur-types';
import {
  COIN_TYPE_ADA,
  DerivationPath,
  HARDENED_OFFSET,
} from '../value-objects/derivation-path.vo';

import type { AccountKey } from '../messages/cardano-account';
import type { RequestId } from '../value-objects/request-id.vo';
import type { Xfp } from '../value-objects/xfp.vo';

/** A request message ready to be encoded as an animated UR. */
export interface BuiltRequest {
  urType: string;
  cbor: Uint8Array;
}

/** Options for {@link buildAccountRequest}. */
export interface BuildAccountRequestOptions {
  requestId: RequestId;
  origin?: string;
  /** CIP-1852 purpose value. Defaults to {@link PURPOSE_CIP1852}. */
  keyPurpose?: number;
}

/** Parsed account export: master fingerprint, account keys, and device label. */
export interface ParsedAccountResponse {
  masterFingerprint: Xfp;
  keys: readonly AccountKey[];
  deviceLabel: string;
  requestId: RequestId;
}

/**
 * Builds an account export request asking the device for the account xpub(s) at
 * the given indices. Mirrors the companion request_account flow.
 */
export const buildAccountRequest = (
  accountIndices: readonly number[],
  {
    requestId,
    origin,
    keyPurpose = PURPOSE_CIP1852,
  }: BuildAccountRequestOptions,
): BuiltRequest => ({
  urType: CardanoUrType.AccountRequest,
  cbor: encodeCardanoAccountRequest({
    requestId,
    accountIndices,
    keyPurpose,
    origin,
  }),
});

/** Parses an account export response CBOR into its constituent fields. */
export const parseAccountResponse = (
  cbor: Uint8Array,
): ParsedAccountResponse => {
  const response = decodeCardanoAccountResponse(cbor);
  return {
    masterFingerprint: response.masterFingerprint,
    keys: response.keys,
    deviceLabel: response.deviceLabel,
    requestId: response.requestId,
  };
};

/**
 * Builds the CIP-1852 account path m/1852'/1815'/account' for the given account
 * index. Pure helper; mirrors the companion wallet account derivation. Throws
 * when the index is not an integer in [0, 2^31).
 */
export const accountDerivationPath = (accountIndex: number): DerivationPath => {
  if (
    !Number.isInteger(accountIndex) ||
    accountIndex < 0 ||
    accountIndex >= HARDENED_OFFSET
  ) {
    throw new Error(`account index out of range: ${accountIndex}`);
  }
  return DerivationPath([
    PURPOSE_CIP1852 + HARDENED_OFFSET,
    COIN_TYPE_ADA + HARDENED_OFFSET,
    accountIndex + HARDENED_OFFSET,
  ]);
};
