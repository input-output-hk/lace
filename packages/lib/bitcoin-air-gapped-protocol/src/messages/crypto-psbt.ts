import {
  createReader,
  createWriter,
  peekIsByteString,
  peekIsTag,
  readTag,
} from '@lace-lib/ur-transport';

/** IANA and legacy CBOR tag numbers for BC-UR crypto-psbt. */
export const PSBT_TAGS = [40_310, 310];

/**
 * Encodes raw PSBT bytes as a BC-UR crypto-psbt CBOR body: a bare byte string.
 * A ur:crypto-psbt payload is an untagged byte string -- the UR type name
 * conveys the type, so no top-level CBOR tag is written (the stock SeedSigner
 * rejects a tagged payload with "No PSBT loaded").
 */
export const encodeCryptoPsbt = (psbtBytes: Uint8Array): Uint8Array => {
  const writer = createWriter();
  writer.writeByteString(psbtBytes);
  return writer.encode();
};

/**
 * Decodes a BC-UR crypto-psbt CBOR body back to raw PSBT bytes. Accepts the
 * bare byte string a real device emits, and tolerates a legacy tag-wrapped
 * byte string.
 *
 * @throws if the CBOR is neither a byte string nor a crypto-psbt tag wrapping one.
 */
export const decodeCryptoPsbt = (cbor: Uint8Array): Uint8Array => {
  const reader = createReader(cbor);
  if (peekIsByteString(reader)) {
    return reader.readByteString();
  }
  if (peekIsTag(reader)) {
    const tag = readTag(reader);
    if (PSBT_TAGS.includes(tag) && peekIsByteString(reader)) {
      return reader.readByteString();
    }
  }
  throw new Error('expected a crypto-psbt byte string');
};
