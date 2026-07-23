import {
  createReader,
  createWriter,
  forEachMapEntry,
  readArrayItems,
  readUint,
  writeUint,
} from '@lace-lib/ur-transport';

import { RequestId } from '../value-objects/request-id.vo';

import { checkXfp, readPath, writePath } from './cbor-helpers';

import type { DerivationPath } from '../value-objects/derivation-path.vo';
import type { Xfp } from '../value-objects/xfp.vo';
import type { CborReader } from '@lace-lib/ur-transport';

/** CIP-1852 purpose value (1852'). */
export const PURPOSE_CIP1852 = 1852;

/** Length in bytes of an account xpub (32 pubkey || 32 chaincode). */
export const XPUB_LENGTH = 64;

/** Default device label returned by the firmware. */
export const DEFAULT_DEVICE_LABEL = 'Cardano SeedSigner';

/**
 * Host request for one or more account extended public keys.
 *
 * UR type: cardano-account-req. CDDL:
 *   {1: request_id(tstr), ?2: origin(tstr), 3: [*account_idx uint], 4: key_purpose uint}
 */
export interface CardanoAccountRequest {
  requestId: RequestId;
  accountIndices: readonly number[];
  keyPurpose: number;
  origin?: string;
}

/** One exported account: index, 64-byte xpub, and derivation path. */
export interface AccountKey {
  accountIndex: number;
  xpub: Uint8Array;
  path: DerivationPath;
}

/**
 * Device reply carrying account xpub(s) and the master fingerprint.
 *
 * UR type: cardano-account. CDDL:
 *   {1: request_id(tstr), 2: master_fingerprint(bstr 4), 3: [*AccountKey], ?4: device_label(tstr)}
 */
export interface CardanoAccountResponse {
  requestId: RequestId;
  masterFingerprint: Xfp;
  keys: readonly AccountKey[];
  deviceLabel: string;
}

export const encodeCardanoAccountRequest = (
  request: CardanoAccountRequest,
): Uint8Array => {
  const writer = createWriter();
  const numberEntries = 3 + (request.origin !== undefined ? 1 : 0);
  writer.writeStartMap(numberEntries);
  writer.writeInt(1);
  writer.writeTextString(request.requestId);
  if (request.origin !== undefined) {
    writer.writeInt(2);
    writer.writeTextString(request.origin);
  }
  writer.writeInt(3);
  writer.writeStartArray(request.accountIndices.length);
  for (const index of request.accountIndices) {
    writeUint(writer, index);
  }
  writer.writeInt(4);
  writeUint(writer, request.keyPurpose);
  return writer.encode();
};

export const decodeCardanoAccountRequest = (
  data: Uint8Array,
): CardanoAccountRequest => {
  const reader = createReader(data);
  let requestId: string | undefined;
  let accountIndices: number[] | undefined;
  let keyPurpose = PURPOSE_CIP1852;
  let origin: string | undefined;

  forEachMapEntry(reader, key => {
    switch (key) {
      case 1:
        requestId = reader.readTextString();
        break;
      case 2:
        origin = reader.readTextString();
        break;
      case 3:
        accountIndices = readArrayItems(reader, readUint);
        break;
      case 4:
        keyPurpose = readUint(reader);
        break;
      default:
        reader.skipValue();
    }
  });

  if (requestId === undefined) {
    throw new Error('cardano-account-req missing request_id (key 1)');
  }
  if (!accountIndices || accountIndices.length === 0) {
    throw new Error(
      'cardano-account-req missing/empty account_indices (key 3)',
    );
  }

  return {
    requestId: RequestId(requestId),
    accountIndices,
    keyPurpose,
    origin,
  };
};

const readAccountKey = (reader: CborReader): AccountKey => {
  let accountIndex: number | undefined;
  let xpub: Uint8Array | undefined;
  let path: DerivationPath | undefined;
  forEachMapEntry(reader, key => {
    switch (key) {
      case 1:
        accountIndex = readUint(reader);
        break;
      case 2:
        xpub = reader.readByteString();
        break;
      case 3:
        path = readPath(reader);
        break;
      default:
        reader.skipValue();
    }
  });
  if (accountIndex === undefined || xpub === undefined || path === undefined) {
    throw new Error('cardano-account AccountKey missing a required field');
  }
  if (xpub.length !== XPUB_LENGTH) {
    throw new Error(
      `cardano-account xpub must be ${XPUB_LENGTH} bytes, got ${xpub.length}`,
    );
  }
  return { accountIndex, xpub, path };
};

export const encodeCardanoAccountResponse = (
  response: CardanoAccountResponse,
): Uint8Array => {
  const writer = createWriter();
  writer.writeStartMap(4);
  writer.writeInt(1);
  writer.writeTextString(response.requestId);
  writer.writeInt(2);
  writer.writeByteString(response.masterFingerprint);
  writer.writeInt(3);
  writer.writeStartArray(response.keys.length);
  for (const accountKey of response.keys) {
    writer.writeStartMap(3);
    writer.writeInt(1);
    writeUint(writer, accountKey.accountIndex);
    writer.writeInt(2);
    writer.writeByteString(accountKey.xpub);
    writer.writeInt(3);
    writePath(writer, accountKey.path);
  }
  writer.writeInt(4);
  writer.writeTextString(response.deviceLabel);
  return writer.encode();
};

export const decodeCardanoAccountResponse = (
  data: Uint8Array,
): CardanoAccountResponse => {
  const reader = createReader(data);
  let requestId = '';
  let masterFingerprint: Uint8Array | undefined;
  let keys: AccountKey[] = [];
  let deviceLabel = DEFAULT_DEVICE_LABEL;

  forEachMapEntry(reader, key => {
    switch (key) {
      case 1:
        requestId = reader.readTextString();
        break;
      case 2:
        masterFingerprint = reader.readByteString();
        break;
      case 3:
        keys = readArrayItems(reader, readAccountKey);
        break;
      case 4:
        deviceLabel = reader.readTextString();
        break;
      default:
        reader.skipValue();
    }
  });

  if (masterFingerprint === undefined) {
    throw new Error('cardano-account missing master_fingerprint (key 2)');
  }

  return {
    requestId: RequestId(requestId),
    masterFingerprint: checkXfp(masterFingerprint, { allowEmpty: false }),
    keys,
    deviceLabel,
  };
};
