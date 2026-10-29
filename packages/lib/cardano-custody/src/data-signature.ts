import { Cardano, Serialization } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';

import { bytesToHex, hexToBytes } from './hex';
import { fail, ok } from './result';

import type { CustodyResult } from './result';

// CIP-8 data signatures by custody device keys prove that a device listed in a
// custody account controls it. The COSE_Sign1 protected header binds the
// account address, the origin of the site the signature is for and what it
// is for, so a signature never verifies for another account, another site
// or another purpose: a site that relays its own sign-in challenge to the
// user gets a proof the issuing site refuses.

const COSE_ALG_LABEL = 1;
const COSE_ALG_EDDSA = -8;
const ADDRESS_HEADER = 'address';
const ORIGIN_HEADER = 'origin';
const PURPOSE_HEADER = 'purpose';
const HASHED_HEADER = 'hashed';
const SIG_STRUCTURE_CONTEXT = 'Signature1';
const COSE_SIGN1_FIELDS = 4;

const COSE_KEY_KTY = 1;
const COSE_KEY_ALG = 3;
const COSE_KEY_CRV = -1;
const COSE_KEY_X = -2;
const KTY_OKP = 1;
const CRV_ED25519 = 6;

const ED25519_PUBLIC_KEY_BYTES = 32;
const ED25519_SIGNATURE_BYTES = 64;

/**
 * What a custody data signature is for: signing in to the site, or linking
 * the custody account to the user's account at the site.
 */
export type CustodyDataPurpose = 'link-account' | 'sign-in';

const PURPOSES: ReadonlySet<unknown> = new Set<CustodyDataPurpose>([
  'link-account',
  'sign-in',
]);

/** Whether `value` names a custody data purpose. */
export const isCustodyDataPurpose = (
  value: unknown,
): value is CustodyDataPurpose => PURPOSES.has(value);

/**
 * Whether `value` is a serialized web origin, `scheme://host[:port]` exactly
 * as a browser reports `MessageEvent.origin`: lower-case host, no default
 * port, no path and no trailing slash. An opaque origin (`null`) is not one.
 * Origins are compared as strings, so only this one spelling is accepted.
 */
export const isCustodyDataOrigin = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    const { origin } = new URL(value);
    return origin !== 'null' && origin === value;
  } catch {
    return false;
  }
};

/** What a custody data signature covers. */
export interface CustodyDataSignaturePayload {
  /** The custody account address the protected header binds. */
  readonly address: Cardano.PaymentAddress;
  /** The origin of the site the signature is for, as `scheme://host[:port]`. */
  readonly origin: string;
  readonly purpose: CustodyDataPurpose;
  /** The signed bytes, as hex of whole bytes. */
  readonly payload: HexBlob;
}

/** A CIP-30 `DataSignature`: the COSE_Sign1 and the COSE_Key, in CBOR hex. */
export interface CustodyDataSignature {
  readonly signature: HexBlob;
  readonly key: HexBlob;
}

/**
 * `{ 1: EdDSA, "origin": origin, "address": address, "purpose": purpose }`,
 * the only header Lace writes, with its labels in deterministic CBOR order.
 *
 * @throws When `address` is not bech32, `origin` is not a serialized origin
 *   or `purpose` is unknown.
 */
const protectedHeadersOf = ({
  address,
  origin,
  purpose,
}: Omit<CustodyDataSignaturePayload, 'payload'>): Uint8Array => {
  if (!isCustodyDataOrigin(origin)) {
    throw new TypeError(`Not a serialized origin: '${String(origin)}'`);
  }
  if (!isCustodyDataPurpose(purpose)) {
    throw new TypeError(`Unknown custody data purpose: '${String(purpose)}'`);
  }
  const writer = new Serialization.CborWriter();
  writer.writeStartMap(4);
  writer.writeInt(COSE_ALG_LABEL);
  writer.writeInt(COSE_ALG_EDDSA);
  writer.writeTextString(ORIGIN_HEADER);
  writer.writeTextString(origin);
  writer.writeTextString(ADDRESS_HEADER);
  writer.writeByteString(
    hexToBytes(Cardano.Address.fromBech32(address).toBytes()),
  );
  writer.writeTextString(PURPOSE_HEADER);
  writer.writeTextString(purpose);
  return writer.encode();
};

/** The COSE Sig_structure: the bytes an Ed25519 key signs. */
const sigStructureOf = (
  protectedHeaders: Uint8Array,
  payload: Uint8Array,
): Uint8Array => {
  const writer = new Serialization.CborWriter();
  writer.writeStartArray(4);
  writer.writeTextString(SIG_STRUCTURE_CONTEXT);
  writer.writeByteString(protectedHeaders);
  writer.writeByteString(new Uint8Array(0));
  writer.writeByteString(payload);
  return writer.encode();
};

/**
 * The bytes a custody device key signs for `payload`: the CIP-8
 * Sig_structure whose protected header names the algorithm and binds the
 * account address, the site origin and the purpose. The payload is signed as
 * is, never hashed.
 *
 * @throws When `address` is not bech32, `origin` is not a serialized origin,
 *   `purpose` is unknown or `payload` is not hex of whole bytes.
 */
export const custodyDataSigStructure = ({
  payload,
  ...bound
}: CustodyDataSignaturePayload): HexBlob =>
  bytesToHex(sigStructureOf(protectedHeadersOf(bound), hexToBytes(payload)));

/**
 * The COSE_Sign1 and COSE_Key of a signature a device key made over
 * {@link custodyDataSigStructure} for the same address, origin, purpose and
 * payload. The COSE_Key carries no key id, because the protected header
 * carries none.
 *
 * @throws When `address` is not bech32, `origin` is not a serialized origin,
 *   `purpose` is unknown, or a hex field is not hex of whole bytes.
 */
export const encodeCustodyDataSignature = ({
  payload,
  publicKey,
  signature,
  ...bound
}: CustodyDataSignaturePayload & {
  readonly publicKey: Crypto.Ed25519PublicKeyHex;
  readonly signature: Crypto.Ed25519SignatureHex;
}): CustodyDataSignature => {
  const sign1 = new Serialization.CborWriter();
  sign1.writeStartArray(COSE_SIGN1_FIELDS);
  sign1.writeByteString(protectedHeadersOf(bound));
  sign1.writeStartMap(1);
  sign1.writeTextString(HASHED_HEADER);
  sign1.writeBoolean(false);
  sign1.writeByteString(hexToBytes(payload));
  sign1.writeByteString(hexToBytes(signature));

  const key = new Serialization.CborWriter();
  key.writeStartMap(4);
  key.writeInt(COSE_KEY_KTY);
  key.writeInt(KTY_OKP);
  key.writeInt(COSE_KEY_ALG);
  key.writeInt(COSE_ALG_EDDSA);
  key.writeInt(COSE_KEY_CRV);
  key.writeInt(CRV_ED25519);
  key.writeInt(COSE_KEY_X);
  key.writeByteString(hexToBytes(publicKey));

  return {
    signature: HexBlob(sign1.encodeAsHex()),
    key: HexBlob(key.encodeAsHex()),
  };
};

/**
 * Why a custody data signature does not prove control, in the order the
 * checks run:
 *
 * - `invalid-address`, `invalid-payload`, `invalid-origin`,
 *   `invalid-purpose`: the verifier's own expected address is not a Cardano
 *   address, its payload is not hex of at least one byte, its origin is not
 *   a serialized origin, or its purpose is unknown;
 * - `malformed-signature`: the COSE_Sign1 is not one untagged four-field array
 *   with a protected header map naming EdDSA, an address, an origin and a
 *   purpose, an attached payload and a 64-byte signature, or a header label
 *   repeats;
 * - `malformed-key`: the COSE_Key is not an Ed25519 OKP key with a 32-byte
 *   public key, or a label repeats;
 * - `address-mismatch`: the protected header binds another address;
 * - `origin-mismatch`: it binds another site, such as one that relayed the
 *   verifier's challenge to the user;
 * - `purpose-mismatch`: it binds another purpose, such as a sign-in
 *   presented to link an account;
 * - `payload-mismatch`: the signed payload is not the expected one;
 * - `invalid-signature`: the signature does not verify over the Sig_structure;
 * - `device-not-listed`: the key is not one of the listed devices.
 */
export type CustodyDataSignatureError =
  | {
      readonly code:
        | 'address-mismatch'
        | 'invalid-address'
        | 'invalid-origin'
        | 'invalid-payload'
        | 'invalid-purpose'
        | 'invalid-signature'
        | 'malformed-key'
        | 'malformed-signature'
        | 'origin-mismatch'
        | 'payload-mismatch'
        | 'purpose-mismatch';
    }
  | {
      readonly code: 'device-not-listed';
      readonly keyHash: Crypto.Ed25519KeyHashHex;
    };

interface VerifyCustodyDataSignatureParams {
  /** The COSE_Sign1, CBOR hex. */
  readonly signature: string;
  /** The COSE_Key, CBOR hex. */
  readonly key: string;
  /**
   * The payload the verifier expects to be signed, as hex: a challenge it
   * issued for this one proof, so a signature cannot be replayed.
   */
  readonly payload: string;
  /** The custody account address the signature must bind, bech32. */
  readonly address: string;
  /**
   * The verifier's own origin, as `scheme://host[:port]`: the signature must
   * be for this site, not for one that relayed its challenge.
   */
  readonly origin: string;
  /** What the verifier accepts the signature for. */
  readonly purpose: CustodyDataPurpose;
  /** The device key hashes the account's control datum lists, hex. */
  readonly devices: readonly string[];
}

/** A signature that proves control: the listed device whose key made it. */
interface CustodyDataSignatureVerification {
  readonly keyHash: Crypto.Ed25519KeyHashHex;
}

/** The input could not be read; the reader turns it into an error code. */
class Unreadable extends Error {}

const HEX = /^(?:[\da-f]{2})*$/i;

const bytesOfHex = (value: string): Uint8Array => {
  if (!HEX.test(value)) throw new Unreadable();
  return hexToBytes(value);
};

const bytesEqual = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((byte, index) => byte === b[index]);

const expectState = (
  reader: Serialization.CborReader,
  state: Serialization.CborReaderState,
): void => {
  if (reader.peekState() !== state) throw new Unreadable();
};

const readDefiniteByteString = (
  reader: Serialization.CborReader,
): Uint8Array => {
  expectState(reader, Serialization.CborReaderState.ByteString);
  return reader.readByteString();
};

const readDefiniteMapSize = (reader: Serialization.CborReader): number => {
  expectState(reader, Serialization.CborReaderState.StartMap);
  const size = reader.readStartMap();
  if (size === null) throw new Unreadable();
  return size;
};

const isIntegerState = (state: Serialization.CborReaderState): boolean =>
  state === Serialization.CborReaderState.UnsignedInteger ||
  state === Serialization.CborReaderState.NegativeInteger;

const readInteger = (reader: Serialization.CborReader): bigint => {
  if (!isIntegerState(reader.peekState())) throw new Unreadable();
  return reader.readInt();
};

/**
 * Reads a definite map whose labels are integers or text, refusing a label
 * that repeats: two readers taking different copies of one header would see
 * different signatures.
 */
const readLabelledMap = (
  reader: Serialization.CborReader,
  readValue: (label: bigint | string) => void,
): void => {
  const size = readDefiniteMapSize(reader);
  const seen = new Set<string>();
  for (let index = 0; index < size; index++) {
    const state = reader.peekState();
    let label: bigint | string;
    if (state === Serialization.CborReaderState.TextString) {
      label = reader.readTextString();
    } else if (isIntegerState(state)) {
      label = reader.readInt();
    } else {
      throw new Unreadable();
    }
    const key = `${typeof label}:${label}`;
    if (seen.has(key)) throw new Unreadable();
    seen.add(key);
    readValue(label);
  }
  reader.readEndMap();
};

const expectFinished = (reader: Serialization.CborReader): void => {
  expectState(reader, Serialization.CborReaderState.Finished);
};

const readDefiniteTextString = (reader: Serialization.CborReader): string => {
  expectState(reader, Serialization.CborReaderState.TextString);
  return reader.readTextString();
};

/** What the protected header binds. */
interface CoseBinding {
  readonly addressBytes: Uint8Array;
  readonly origin: string;
  readonly purpose: string;
}

interface CoseSign1 extends CoseBinding {
  readonly protectedHeaders: Uint8Array;
  readonly payload: Uint8Array;
  readonly signature: Uint8Array;
}

const readProtectedBinding = (protectedHeaders: Uint8Array): CoseBinding => {
  const reader = new Serialization.CborReader(
    HexBlob.fromBytes(protectedHeaders),
  );
  let algorithm: bigint | undefined;
  let addressBytes: Uint8Array | undefined;
  let origin: string | undefined;
  let purpose: string | undefined;
  readLabelledMap(reader, label => {
    if (label === BigInt(COSE_ALG_LABEL)) {
      algorithm = readInteger(reader);
    } else if (label === ADDRESS_HEADER) {
      addressBytes = readDefiniteByteString(reader);
    } else if (label === ORIGIN_HEADER) {
      origin = readDefiniteTextString(reader);
    } else if (label === PURPOSE_HEADER) {
      purpose = readDefiniteTextString(reader);
    } else {
      reader.skipValue();
    }
  });
  expectFinished(reader);
  if (
    algorithm !== BigInt(COSE_ALG_EDDSA) ||
    addressBytes === undefined ||
    origin === undefined ||
    purpose === undefined
  ) {
    throw new Unreadable();
  }
  return { addressBytes, origin, purpose };
};

const readCoseSign1 = (hex: string): CoseSign1 => {
  const reader = new Serialization.CborReader(
    HexBlob.fromBytes(bytesOfHex(hex)),
  );
  expectState(reader, Serialization.CborReaderState.StartArray);
  if (reader.readStartArray() !== COSE_SIGN1_FIELDS) throw new Unreadable();
  const protectedHeaders = readDefiniteByteString(reader);
  expectState(reader, Serialization.CborReaderState.StartMap);
  reader.skipValue();
  const payload = readDefiniteByteString(reader);
  const signature = readDefiniteByteString(reader);
  reader.readEndArray();
  expectFinished(reader);
  if (signature.length !== ED25519_SIGNATURE_BYTES) throw new Unreadable();
  return {
    protectedHeaders,
    ...readProtectedBinding(protectedHeaders),
    payload,
    signature,
  };
};

const readCoseKeyPublicKey = (hex: string): Uint8Array => {
  const reader = new Serialization.CborReader(
    HexBlob.fromBytes(bytesOfHex(hex)),
  );
  const fields = new Map<bigint, bigint>();
  let publicKey: Uint8Array | undefined;
  readLabelledMap(reader, label => {
    if (label === BigInt(COSE_KEY_X)) {
      publicKey = readDefiniteByteString(reader);
    } else if (
      label === BigInt(COSE_KEY_KTY) ||
      label === BigInt(COSE_KEY_ALG) ||
      label === BigInt(COSE_KEY_CRV)
    ) {
      fields.set(label, readInteger(reader));
    } else {
      reader.skipValue();
    }
  });
  expectFinished(reader);
  const algorithm = fields.get(BigInt(COSE_KEY_ALG));
  if (
    fields.get(BigInt(COSE_KEY_KTY)) !== BigInt(KTY_OKP) ||
    fields.get(BigInt(COSE_KEY_CRV)) !== BigInt(CRV_ED25519) ||
    (algorithm !== undefined && algorithm !== BigInt(COSE_ALG_EDDSA)) ||
    publicKey?.length !== ED25519_PUBLIC_KEY_BYTES
  ) {
    throw new Unreadable();
  }
  return publicKey;
};

const readOrFail = <T>(read: () => T): T | undefined => {
  try {
    return read();
  } catch {
    return undefined;
  }
};

const signatureVerifies = (
  publicKey: Crypto.Ed25519PublicKey,
  { protectedHeaders, payload, signature }: CoseSign1,
): boolean => {
  try {
    return publicKey.verify(
      Crypto.Ed25519Signature.fromBytes(signature),
      HexBlob.fromBytes(sigStructureOf(protectedHeaders, payload)),
    );
  } catch {
    return false;
  }
};

/**
 * Checks that a CIP-8 data signature proves control of a custody account: the
 * Ed25519 signature verifies over the Sig_structure rebuilt from the
 * signature's own protected header and payload, the header binds `address`,
 * `origin` and `purpose`, the payload is `payload`, and the key's BLAKE2b-224
 * hash is one of `devices`. It never throws: every input it cannot read is an
 * error result.
 *
 * Only a listed device has owner authority, so `devices` must come from the
 * account's current control datum as the verifier reads it from the chain.
 * The challenge, the origin and the purpose are the verifier's own, never
 * the client's.
 */
export const verifyCustodyDataSignature = async ({
  signature,
  key,
  payload,
  address,
  origin,
  purpose,
  devices,
}: VerifyCustodyDataSignatureParams): Promise<
  CustodyResult<CustodyDataSignatureVerification, CustodyDataSignatureError>
> => {
  const expectedAddress = readOrFail(() => {
    const parsed = Cardano.Address.fromString(address);
    if (!parsed) throw new Unreadable();
    return hexToBytes(parsed.toBytes());
  });
  if (!expectedAddress) return fail({ code: 'invalid-address' });
  const expectedPayload = readOrFail(() => bytesOfHex(payload));
  if (!expectedPayload?.length) return fail({ code: 'invalid-payload' });
  if (!isCustodyDataOrigin(origin)) return fail({ code: 'invalid-origin' });
  if (!isCustodyDataPurpose(purpose)) return fail({ code: 'invalid-purpose' });
  const sign1 = readOrFail(() => readCoseSign1(signature));
  if (!sign1) return fail({ code: 'malformed-signature' });
  const publicKeyBytes = readOrFail(() => readCoseKeyPublicKey(key));
  if (!publicKeyBytes) return fail({ code: 'malformed-key' });

  if (!bytesEqual(sign1.addressBytes, expectedAddress)) {
    return fail({ code: 'address-mismatch' });
  }
  if (sign1.origin !== origin) return fail({ code: 'origin-mismatch' });
  if (sign1.purpose !== purpose) return fail({ code: 'purpose-mismatch' });
  if (!bytesEqual(sign1.payload, expectedPayload)) {
    return fail({ code: 'payload-mismatch' });
  }
  await Crypto.ready();
  const publicKey = Crypto.Ed25519PublicKey.fromBytes(publicKeyBytes);
  if (!signatureVerifies(publicKey, sign1)) {
    return fail({ code: 'invalid-signature' });
  }
  const keyHash = publicKey.hash().hex();
  if (!devices.some(device => device.toLowerCase() === keyHash)) {
    return fail({ code: 'device-not-listed', keyHash });
  }
  return ok({ keyHash });
};
