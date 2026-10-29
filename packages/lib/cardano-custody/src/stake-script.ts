// Ported from Biglup/cardano-account-custody-contract offchain/src/stake-script.ts
// at revision b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0). Modified
// for Lace: a dependency-free flat splice replaces the UPLC library, and the
// result is a byte template with the owner substituted at a fixed offset.

import { Serialization } from '@cardano-sdk/core';

import { bytesToHex, HASH_28_BYTE_LENGTH, hexToBytes } from './hex';

import type { CustodyContractVersion } from './contract-version';
import type { HexBlob } from '@cardano-sdk/util';

/** Flat-encoded program version 1.1.0: three one-byte naturals. */
const PROGRAM_VERSION = [1, 1, 0];
const PROGRAM_VERSION_BITS = PROGRAM_VERSION.length * 8;
const APPLY_TERM_TAG = 0b0011;
const CONSTANT_TERM_TAG = 0b0100;
const DATA_TYPE_TAG = 0b1000;
const TERM_TAG_BITS = 4;

/** Writes the flat encoding: bits fill each byte from the most significant end. */
class FlatWriter {
  private readonly bytes: number[] = [];
  private pending = 0;
  private pendingBits = 0;

  public get byteLength(): number {
    return this.bytes.length;
  }

  public writeBits(value: number, count: number): void {
    for (let shift = count - 1; shift >= 0; shift--) {
      this.writeBit((value >> shift) & 1);
    }
  }

  public writeBit(bit: number): void {
    this.pending = (this.pending << 1) | bit;
    this.pendingBits++;
    if (this.pendingBits === 8) {
      this.bytes.push(this.pending);
      this.pending = 0;
      this.pendingBits = 0;
    }
  }

  /** Zero or more 0 bits and a closing 1 bit, ending on a byte boundary. */
  public writeFiller(): void {
    while (this.pendingBits !== 7) {
      this.writeBit(0);
    }
    this.writeBit(1);
  }

  /** Callers write whole bytes only after a filler or other whole bytes. */
  public writeAlignedBytes(bytes: Iterable<number>): void {
    this.bytes.push(...bytes);
  }

  public toBytes(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

const bitAt = (bytes: Uint8Array, position: number): number =>
  (bytes[position >> 3] >> (7 - (position & 7))) & 1;

/**
 * Applies one Plutus Data byte-string parameter: a constant term of type
 * `[data]` whose value is the CBOR of the data, as a flat byte string.
 * Returns the offset, in the flat output, of the parameter's raw bytes.
 */
const writeDataBytesConstant = (
  writer: FlatWriter,
  parameter: Uint8Array,
): number => {
  writer.writeBits(CONSTANT_TERM_TAG, TERM_TAG_BITS);
  writer.writeBit(1);
  writer.writeBits(DATA_TYPE_TAG, TERM_TAG_BITS);
  writer.writeBit(0);
  const cbor = hexToBytes(
    Serialization.PlutusData.newBytes(parameter).toCbor(),
  );
  writer.writeFiller();
  // A flat chunk holds up to 255 bytes; a 28-byte parameter's CBOR is 30.
  writer.writeAlignedBytes([cbor.length]);
  const parameterOffset = writer.byteLength + cbor.length - parameter.length;
  writer.writeAlignedBytes(cbor);
  writer.writeAlignedBytes([0]);
  return parameterOffset;
};

/** The flat program a blueprint's compiled code wraps in one CBOR byte string. */
const unwrapCompiledCode = (compiledCode: HexBlob): Uint8Array =>
  new Serialization.CborReader(compiledCode).readByteString();

const assertUnappliedProgramShape = (
  program: Uint8Array,
  bodyBitLength: number,
): void => {
  if (PROGRAM_VERSION.some((byte, index) => program[index] !== byte)) {
    throw new Error('The stake validator is not a version 1.1.0 program');
  }
  const bodyEnd = PROGRAM_VERSION_BITS + bodyBitLength;
  const fillerBits = program.length * 8 - bodyEnd;
  const isFillerWellFormed =
    fillerBits >= 1 &&
    fillerBits <= 8 &&
    Array.from({ length: fillerBits }, (_, index) =>
      bitAt(program, bodyEnd + index),
    ).every((bit, index) => bit === (index === fillerBits - 1 ? 1 : 0));
  if (!isFillerWellFormed) {
    throw new Error(
      `The stake validator body is not ${bodyBitLength} bits followed by a filler`,
    );
  }
};

/** Applied compiled code for an all-zero owner, plus where the owner bytes sit. */
interface StakeScriptTemplate {
  readonly compiledCode: Uint8Array;
  readonly ownerOffset: number;
}

/**
 * Builds what `aiken blueprint apply` produces for the owner, then the
 * account validator hash: the unapplied body under two Apply terms, followed
 * by one Data byte-string constant per parameter. The two Apply tags take
 * exactly one byte, so the body bits keep their position within each byte
 * and the owner always lands at the same offset.
 */
const buildStakeScriptTemplate = (
  version: CustodyContractVersion,
): StakeScriptTemplate => {
  const { compiledCode, bodyBitLength } = version.unappliedStakeValidator;
  const program = unwrapCompiledCode(compiledCode);
  assertUnappliedProgramShape(program, bodyBitLength);

  const writer = new FlatWriter();
  writer.writeAlignedBytes(PROGRAM_VERSION);
  writer.writeBits(APPLY_TERM_TAG, TERM_TAG_BITS);
  writer.writeBits(APPLY_TERM_TAG, TERM_TAG_BITS);
  for (let index = 0; index < bodyBitLength; index++) {
    writer.writeBit(bitAt(program, PROGRAM_VERSION_BITS + index));
  }
  const ownerFlatOffset = writeDataBytesConstant(
    writer,
    new Uint8Array(HASH_28_BYTE_LENGTH),
  );
  writeDataBytesConstant(writer, hexToBytes(version.accountValidatorHash));
  writer.writeFiller();

  const flat = writer.toBytes();
  const wrapped = new Serialization.CborWriter().writeByteString(flat).encode();
  return {
    compiledCode: wrapped,
    ownerOffset: wrapped.length - flat.length + ownerFlatOffset,
  };
};

const templates = new Map<string, StakeScriptTemplate>();

const templateFor = (version: CustodyContractVersion): StakeScriptTemplate => {
  let template = templates.get(version.accountValidatorHash);
  if (!template) {
    template = buildStakeScriptTemplate(version);
    templates.set(version.accountValidatorHash, template);
  }
  return template;
};

/**
 * The compiled code of an account's stake script: the version's stake
 * validator applied to the owner (creator) key hash and then to the
 * version's account validator hash. Byte for byte what the Aiken CLI emits.
 *
 * @param ownerKeyHash - lower-case hex of exactly 28 bytes, checked by the caller
 */
export const applyStakeValidatorToOwner = (
  version: CustodyContractVersion,
  ownerKeyHash: string,
): HexBlob => {
  const { compiledCode, ownerOffset } = templateFor(version);
  const applied = compiledCode.slice();
  applied.set(hexToBytes(ownerKeyHash), ownerOffset);
  return bytesToHex(applied);
};
