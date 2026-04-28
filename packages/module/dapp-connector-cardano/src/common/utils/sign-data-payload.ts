/**
 * Decode hex as UTF-8 when it is printable ASCII-ish text; otherwise null.
 */
export const tryDecodeHexAsText = (hexString: string): string | null => {
  try {
    const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;

    if (hex.length % 2 !== 0) return null;

    const bytes: number[] = [];
    for (let index = 0; index < hex.length; index += 2) {
      bytes.push(parseInt(hex.slice(index, index + 2), 16));
    }

    const decoder = new TextDecoder('utf-8', { fatal: true });
    const decoded = decoder.decode(new Uint8Array(bytes));

    if (/^[\u0020-\u007E\n\t\r]*$/.test(decoded)) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
};

/** Pretty-print JSON object/array payloads; otherwise return decoded text or raw payload. */
export const formatSignDataPayload = (payload: string): string => {
  const decoded = tryDecodeHexAsText(payload);
  if (!decoded) return payload;

  try {
    const parsed: unknown = JSON.parse(decoded);
    if (typeof parsed === 'object' && parsed !== null) {
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // not JSON — show decoded plain text
  }
  return decoded;
};
