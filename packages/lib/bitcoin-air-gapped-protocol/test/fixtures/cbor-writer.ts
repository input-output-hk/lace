import { Serialization } from '@cardano-sdk/core';

/**
 * Fluent CBOR writer for tests, backed by @cardano-sdk/core Serialization. It
 * mirrors the definite-length header style the BC-UR messages use: start
 * map/array headers are written with an explicit length and no matching end
 * marker (the SDK's writeEndMap/writeEndArray emit indefinite-length break
 * bytes, which are not used here).
 */
export class CborWriter {
  private readonly writer = new Serialization.CborWriter();

  /** Writes an unsigned integer. */
  public writeUint(value: number): this {
    if (value < 0 || !Number.isSafeInteger(value)) {
      throw new Error(`invalid CBOR uint: ${value}`);
    }
    this.writer.writeInt(value);
    return this;
  }

  /** Writes a definite-length byte string. */
  public writeBytes(value: Uint8Array): this {
    this.writer.writeByteString(value);
    return this;
  }

  /** Writes a definite-length UTF-8 text string. */
  public writeText(value: string): this {
    this.writer.writeTextString(value);
    return this;
  }

  /** Writes a definite-length array header for the given element count. */
  public writeArrayHeader(length: number): this {
    this.writer.writeStartArray(length);
    return this;
  }

  /** Writes a definite-length map header for the given entry count. */
  public writeMapHeader(length: number): this {
    this.writer.writeStartMap(length);
    return this;
  }

  /** Writes a tag header; the caller writes the tagged content next. */
  public writeTag(tag: number): this {
    this.writer.writeTag(tag);
    return this;
  }

  /** Writes a boolean simple value. */
  public writeBool(value: boolean): this {
    this.writer.writeBoolean(value);
    return this;
  }

  /** Returns the accumulated CBOR bytes. */
  public toBytes(): Uint8Array {
    return this.writer.encode();
  }
}
