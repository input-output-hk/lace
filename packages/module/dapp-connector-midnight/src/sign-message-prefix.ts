// Domain separation for the Midnight night-key data signature. The Midnight
// dApp Connector API spec makes this prefix a MUST:
//
//   > wallet receiving call to `signData` must prefix data with string
//   > `midnight_signed_message:<data_size>:`, where `<data_size>` is data size
//   > in bytes.
//   — midnight-dapp-connector-api SPECIFICATION.md
//
// Without it a `signData` signature is byte-for-byte a signature the SAME
// unshielded spend key produces over a transaction-witness preimage, so a dapp
// can harvest a "message" signature and replay it as a transaction input
// witness (LW-15403 — confirmed end-to-end). The prefix makes the two byte
// domains disjoint. Byte-exact and shared by every Midnight verifier: pin it to
// the spec — a change here silently invalidates every signature.

const SIGNED_MESSAGE_PREFIX = 'midnight_signed_message:';

/**
 * Domain-separate a Midnight `signData` payload per the connector spec: prepend
 * `midnight_signed_message:<byteLength>:` (UTF-8) to `data`, where
 * `<byteLength>` is the length of `data` in bytes measured BEFORE prefixing.
 * Returns the exact byte string the night key must sign (and that a verifier
 * reconstructs). Applied to the already-decoded payload, never to the hex/base64
 * transport form.
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
