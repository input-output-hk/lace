import type { SignDataOptions } from '@midnight-ntwrk/dapp-connector-api';

/** Decode the connector transport form, preserving Buffer's permissive hex/base64 handling. */
export const decodeMidnightSignData = (
  data: string,
  encoding: SignDataOptions['encoding'],
): Uint8Array => {
  switch (encoding) {
    case 'hex':
      return new Uint8Array(Buffer.from(data, 'hex'));
    case 'base64':
      return new Uint8Array(Buffer.from(data, 'base64'));
    case 'text':
      return new TextEncoder().encode(data);
    default:
      throw new Error(`Unsupported encoding: ${String(encoding)}`);
  }
};

// The connector specification requires this prefix on every `signData`
// payload. It separates message signatures from transaction witnesses made with
// the same unshielded key, so a dApp cannot replay a message signature as a
// transaction input witness. The bytes are shared by every Midnight verifier:
// changing them invalidates every signature.
const SIGNED_MESSAGE_PREFIX = 'midnight_signed_message:';

/**
 * Prefixes decoded payload bytes with UTF-8 `midnight_signed_message:<byteLength>:`.
 * The length excludes the prefix; sign and verify these bytes, not the transport encoding.
 */
export const applyMidnightSignedMessagePrefix = (
  data: Uint8Array,
): Uint8Array => {
  const header = new TextEncoder().encode(
    `${SIGNED_MESSAGE_PREFIX}${data.length}:`,
  );
  const prefixed = new Uint8Array(header.length + data.length);
  prefixed.set(header, 0);
  prefixed.set(data, header.length);
  return prefixed;
};
