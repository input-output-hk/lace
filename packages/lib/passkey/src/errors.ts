/** The user dismissed a WebAuthn ceremony. */
export class PasskeyCeremonyCancelledError extends Error {
  public readonly code = 'ceremony-cancelled' as const;
  public constructor() {
    super('The passkey ceremony was cancelled.');
    this.name = 'PasskeyCeremonyCancelledError';
  }
}

/** The authenticator did not supply both PRF outputs. */
export class PasskeyPrfUnsupportedError extends Error {
  public readonly code = 'prf-unsupported' as const;
  public constructor() {
    super('The platform authenticator does not support the PRF extension.');
    this.name = 'PasskeyPrfUnsupportedError';
  }
}

/** The selected credential differs from the imported wallet credential. */
export class PasskeyCredentialMismatchError extends Error {
  public readonly code = 'credential-mismatch' as const;
  public constructor() {
    super('The selected passkey does not match the wallet credential.');
    this.name = 'PasskeyCredentialMismatchError';
  }
}

/**
 * The browser refused to open the signer popup (`popup-blocked`); it must be
 * opened inside a user gesture.
 */
export class SignerPopupBlockedError extends Error {
  public readonly code = 'popup-blocked' as const;
  public constructor() {
    super('The browser blocked the signer popup.');
    this.name = 'SignerPopupBlockedError';
  }
}

/**
 * The signer answered a request with a failure; `code` is the code it
 * reported, such as `ceremony-cancelled` when the user rejects the request
 * or `malformed-request` when the signer cannot describe it for consent,
 * and `details` the values it declared alongside, when any. Both come from
 * the signer page, so a reader validates `details` before acting on it.
 */
export class RemoteSignerError extends Error {
  public readonly code: string;
  public readonly details: Record<string, unknown> | undefined;
  public constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'RemoteSignerError';
  }
}

/**
 * The signer popup closed, as when the user closes the window, while requests
 * were still pending (`ceremony-cancelled`).
 */
export class SignerClosedError extends Error {
  public readonly code = 'ceremony-cancelled' as const;
  public constructor() {
    super('The signer popup was closed.');
    this.name = 'SignerClosedError';
  }
}

/** The signer is already opening, running or closing a Passport flow. */
export class SignerBusyError extends Error {
  public readonly code = 'signer-busy' as const;
  public constructor() {
    super('A signer flow is already open.');
    this.name = 'SignerBusyError';
  }
}
