// Ported from Biglup/cardano-account-custody-contract offchain/src/data.ts at
// revision b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0). Modified for
// Lace: built on @cardano-sdk/core Plutus data, and decoding reports a typed
// result naming where the value broke the expected shape.

import { Cardano } from '@cardano-sdk/core';

import { bytesToHex, hexToBytes } from '../hex';
import { fail, ok } from '../result';

import type { CustodyResult } from '../result';
import type { HexBlob } from '@cardano-sdk/util';

/** Plutus data that does not have the shape the contract's types declare. */
export interface CustodyDecodeError {
  readonly code: 'malformed-data';
  /** Where decoding stopped, e.g. `scope.recipients[0]`. */
  readonly path: string;
  readonly expected: string;
}

/** Raised inside the decoders only; `decodeResult` turns it into a result. */
class MalformedData extends Error {
  public constructor(readonly path: string, readonly expected: string) {
    super(`Expected ${expected} at ${path || 'the root'}`);
  }
}

/** Runs a throwing decoder and reports a shape mismatch as a typed failure. */
export const decodeResult = <T>(
  decode: () => T,
): CustodyResult<T, CustodyDecodeError> => {
  try {
    return ok(decode());
  } catch (error) {
    if (error instanceof MalformedData) {
      return fail({
        code: 'malformed-data',
        path: error.path,
        expected: error.expected,
      });
    }
    throw error;
  }
};

export const fieldPath = (path: string, field: string): string =>
  `${path}.${field}`;

export const itemPath = (path: string, index: number): string =>
  `${path}[${index}]`;

/**
 * A fresh constructor value. Encoders always build new data, never reuse
 * decoded data: the `cbor` cache on decoded values wins over any edit.
 */
export const constr = (
  index: number,
  fields: Cardano.PlutusData[] = [],
): Cardano.ConstrPlutusData => ({
  constructor: BigInt(index),
  fields: { items: fields },
});

export const list = (items: Cardano.PlutusData[]): Cardano.PlutusList => ({
  items,
});

export const bytes = (hex: string): Uint8Array => hexToBytes(hex);

/** The constructor index of a value that must be a constructor. */
export const expectConstrIndex = (
  data: Cardano.PlutusData,
  path: string,
  what: string,
): bigint => {
  if (!Cardano.util.isConstrPlutusData(data)) {
    throw new MalformedData(path, `${what} as a constructor`);
  }
  return data.constructor;
};

/** The fields of a constructor with exactly the given index and arity. */
export const expectConstr = (
  data: Cardano.PlutusData,
  { index, arity }: { index: number; arity: number },
  { path, what }: { path: string; what: string },
): Cardano.PlutusData[] => {
  if (
    !Cardano.util.isConstrPlutusData(data) ||
    data.constructor !== BigInt(index) ||
    data.fields.items.length !== arity
  ) {
    throw new MalformedData(
      path,
      `${what} as constructor ${index} with ${arity} fields`,
    );
  }
  return data.fields.items;
};

/**
 * The fields of a constructor with the given index and at least `minArity`
 * fields, for a reader that relies only on a stable leading prefix.
 */
export const expectConstrPrefix = (
  data: Cardano.PlutusData,
  { index, minArity }: { index: number; minArity: number },
  { path, what }: { path: string; what: string },
): Cardano.PlutusData[] => {
  if (
    !Cardano.util.isConstrPlutusData(data) ||
    data.constructor !== BigInt(index) ||
    data.fields.items.length < minArity
  ) {
    throw new MalformedData(
      path,
      `${what} as constructor ${index} with at least ${minArity} fields`,
    );
  }
  return data.fields.items;
};

export const expectBytes = (
  data: Cardano.PlutusData,
  path: string,
  what: string,
): HexBlob => {
  if (!Cardano.util.isPlutusBoundedBytes(data)) {
    throw new MalformedData(path, `${what} as bytes`);
  }
  return bytesToHex(data);
};

export const expectInt = (
  data: Cardano.PlutusData,
  path: string,
  what: string,
): bigint => {
  if (!Cardano.util.isPlutusBigInt(data)) {
    throw new MalformedData(path, `${what} as an integer`);
  }
  return data;
};

export const expectList = (
  data: Cardano.PlutusData,
  path: string,
  what: string,
): Cardano.PlutusData[] => {
  if (!Cardano.util.isPlutusList(data)) {
    throw new MalformedData(path, `${what} as a list`);
  }
  return data.items;
};

/** Refuses a constructor index no alternative of a union claims. */
export const unknownAlternative = (
  path: string,
  what: string,
  index: bigint,
): never => {
  throw new MalformedData(path, `${what}, not constructor ${index}`);
};
