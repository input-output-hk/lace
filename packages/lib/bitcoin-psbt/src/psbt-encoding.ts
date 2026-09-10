/**
 * The dApp-facing PSBT encoding is hex, matching the Unisat/OKX API; everything
 * inside the wallet works in base64. These convert at that boundary.
 *
 * Both re-encode bytes without parsing. Decoding stays the job of inspectPsbt,
 * which every request already passes through, so that a PSBT the wallet cannot
 * read fails there with review context rather than as an opaque encoding error.
 */

export const psbtHexToBase64 = (psbtHex: string): string =>
  Buffer.from(psbtHex, 'hex').toString('base64');

export const psbtBase64ToHex = (psbtBase64: string): string =>
  Buffer.from(psbtBase64, 'base64').toString('hex');
