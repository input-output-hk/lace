/** Stable error code for a generic Keystone wire-format violation. */
export const PROTOCOL_VIOLATION_CODE = 'KEYSTONE_PROTOCOL_VIOLATION';

/** Stable error code for a scanned UR whose type is not the expected one. */
export const UNEXPECTED_UR_TYPE_CODE = 'KEYSTONE_UNEXPECTED_UR_TYPE';

/** Stable error code for a response missing a required field. */
export const MISSING_PROTOCOL_FIELD_CODE = 'KEYSTONE_MISSING_PROTOCOL_FIELD';

/** Stable error code for a key fingerprint that contradicts the response. */
export const FINGERPRINT_MISMATCH_CODE = 'KEYSTONE_FINGERPRINT_MISMATCH';

/** Stable error code for an exported key outside the CIP-1852 account shape. */
export const INVALID_ACCOUNT_PATH_CODE = 'KEYSTONE_INVALID_ACCOUNT_PATH';

/**
 * Base class for Keystone protocol violations. The stable {@link code} and
 * {@link name} let callers branch without matching prose.
 */
export class KeystoneProtocolError extends Error {
  public readonly code: string;

  public constructor(message: string, code: string = PROTOCOL_VIOLATION_CODE) {
    super(message);
    this.code = code;
    this.name = code;
  }
}

/**
 * Thrown when a scanned UR carries a different type than the flow expects,
 * for example a bitcoin payload while waiting for a Cardano signature.
 */
export class UnexpectedUrTypeError extends KeystoneProtocolError {
  public readonly expectedUrType: string;
  public readonly receivedUrType: string;

  public constructor(expectedUrType: string, receivedUrType: string) {
    super(
      `expected UR type ${expectedUrType}, received ${receivedUrType}`,
      UNEXPECTED_UR_TYPE_CODE,
    );
    this.expectedUrType = expectedUrType;
    this.receivedUrType = receivedUrType;
  }
}

/** Thrown when a device response omits a field the protocol requires. */
export class MissingProtocolFieldError extends KeystoneProtocolError {
  public constructor(field: string) {
    super(
      `response is missing required field: ${field}`,
      MISSING_PROTOCOL_FIELD_CODE,
    );
  }
}

/**
 * Thrown when an exported key's source fingerprint does not match the master
 * fingerprint of the response, which would mean the key belongs to a
 * different seed.
 */
export class FingerprintMismatchError extends KeystoneProtocolError {
  public constructor(expectedHex: string, receivedHex: string) {
    super(
      `master fingerprint mismatch: expected ${expectedHex}, received ${receivedHex}`,
      FINGERPRINT_MISMATCH_CODE,
    );
  }
}

/**
 * Thrown when an exported key path is not a hardened CIP-1852 account path
 * of the form m/1852'/1815'/account'.
 */
export class InvalidAccountPathError extends KeystoneProtocolError {
  public constructor(path: string) {
    super(
      `account key path must be m/1852'/1815'/account': ${path}`,
      INVALID_ACCOUNT_PATH_CODE,
    );
  }
}
