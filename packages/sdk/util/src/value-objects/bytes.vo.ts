import { Buffer } from 'buffer';

import { Tagged } from 'type-fest';

/**
 * Hexadecimal-encoded bytes string
 *
 * Example:
 * let serialized: HexBytes = HexBytes('abc123');
 * let byteArray: ByteArray = ByteArray.fromHex(serialized);
 */
export type HexBytes = Tagged<string, 'Bytes'>;
// TODO: validation
export const HexBytes = (value: string) => value.toString() as HexBytes;
HexBytes.fromUTF8 = (utf8string: string) =>
  HexBytes(Buffer.from(utf8string, 'utf8').toString('hex'));
HexBytes.fromByteArray = (byteArray: Uint8Array) =>
  HexBytes(Buffer.from(byteArray).toString('hex'));
HexBytes.fromArray = (byteArray: number[]) =>
  HexBytes(Buffer.from(byteArray).toString('hex'));
HexBytes.toByteArray = (bytes: HexBytes) =>
  ByteArray(Uint8Array.from(Buffer.from(bytes, 'hex')));
HexBytes.toUTF8 = (bytes: HexBytes) =>
  Buffer.from(bytes, 'hex').toString('utf8');

/**
 * Tagged UInt8Array
 *
 * Example:
 * let serialized: HexBytes = HexBytes('abc123');
 * let byteArray: ByteArray = ByteArray.fromHex(serialized);
 */
export type ByteArray = Tagged<Uint8Array, 'Bytes'>;
export const ByteArray = (value: Uint8Array) => value as ByteArray;
ByteArray.fromUTF8 = (utf8string: string) =>
  ByteArray(Uint8Array.from(Buffer.from(utf8string, 'utf8')));
ByteArray.fromHex = (hexBytes: HexBytes) =>
  ByteArray(Uint8Array.from(Buffer.from(hexBytes, 'hex')));
ByteArray.toUTF8 = (byteArray: ByteArray) =>
  Buffer.from(byteArray).toString('utf8');
ByteArray.clone = (byteArray: ByteArray) =>
  ByteArray(Uint8Array.from(byteArray));
