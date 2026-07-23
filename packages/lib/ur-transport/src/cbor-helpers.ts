import { Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';

export type CborWriter = Serialization.CborWriter;
export type CborReader = Serialization.CborReader;

/** Creates a fresh CBOR writer. */
export const createWriter = (): CborWriter => new Serialization.CborWriter();

/** Creates a CBOR reader over the given bytes. */
export const createReader = (data: Uint8Array): CborReader =>
  new Serialization.CborReader(HexBlob.fromBytes(data));

/** True when the reader is positioned on a CBOR tag. */
export const peekIsTag = (reader: CborReader): boolean =>
  reader.peekState() === Serialization.CborReaderState.Tag;

/** True when the reader is positioned on a CBOR map. */
export const peekIsMap = (reader: CborReader): boolean =>
  reader.peekState() === Serialization.CborReaderState.StartMap;

/** True when the reader is positioned on a CBOR byte string. */
export const peekIsByteString = (reader: CborReader): boolean =>
  reader.peekState() === Serialization.CborReaderState.ByteString;

/**
 * Reads a CBOR tag number. The SDK types the return as its CborTag enum, but the
 * runtime value is the raw tag number; the plain number is returned for
 * comparison against the BC-UR registry tag numbers.
 */
export const readTag = (reader: CborReader): number => Number(reader.readTag());

/** Reads a definite-length map header, throwing on indefinite length. */
export const readMapLength = (reader: CborReader): number => {
  const length = reader.readStartMap();
  if (length === null) {
    throw new Error('expected definite-length map');
  }
  return length;
};

/** Reads a definite-length array header, throwing on indefinite length. */
export const readArrayLength = (reader: CborReader): number => {
  const length = reader.readStartArray();
  if (length === null) {
    throw new Error('expected definite-length array');
  }
  return length;
};

/**
 * Iterates over the entries of a definite-length map, invoking onKey for each
 * integer key, then closes the map. onKey must consume exactly one value.
 */
export const forEachMapEntry = (
  reader: CborReader,
  onKey: (key: number) => void,
): void => {
  const numberEntries = readMapLength(reader);
  for (let index = 0; index < numberEntries; index++) {
    onKey(readUint(reader));
  }
  reader.readEndMap();
};

/**
 * Reads a definite-length array, invoking readItem for each element, then closes
 * the array. Returns the collected items.
 */
export const readArrayItems = <T>(
  reader: CborReader,
  readItem: (reader: CborReader) => T,
): T[] => {
  const count = readArrayLength(reader);
  const items: T[] = [];
  for (let index = 0; index < count; index++) {
    items.push(readItem(reader));
  }
  reader.readEndArray();
  return items;
};

/** Reads an unsigned integer as a JS number, rejecting out-of-range values. */
export const readUint = (reader: CborReader): number => {
  const value = reader.readUInt();
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`uint out of safe integer range: ${value}`);
  }
  return Number(value);
};

/** Writes a CBOR uint, rejecting negatives, non-integers, and unsafe values. */
export const writeUint = (writer: CborWriter, value: number): void => {
  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > Number.MAX_SAFE_INTEGER
  ) {
    throw new Error(`expected a CBOR uint, got: ${value}`);
  }
  writer.writeInt(value);
};
