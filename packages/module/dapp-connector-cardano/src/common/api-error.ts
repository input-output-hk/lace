/**
 * CIP-30 API Error codes
 * @see https://cips.cardano.org/cip/CIP-30#apierror
 */
export enum APIErrorCode {
  /** Inputs do not conform to specification or are otherwise invalid */
  InvalidRequest = -1,
  /** An error occurred during execution of this API call */
  InternalError = -2,
  /** The request was refused due to lack of access */
  Refused = -3,
  /** The account has changed */
  AccountChange = -4,
}

/**
 * Base API Error class for CIP-30
 */
export class APIError extends Error {
  public readonly code: APIErrorCode;
  public readonly info: string;

  public constructor(code: APIErrorCode, info: string) {
    super(info);
    this.name = 'APIError';
    this.code = code;
    this.info = info;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }
}

/**
 * CIP-30 Transaction Sign Error codes
 * @see https://cips.cardano.org/cip/CIP-30#txsignerror
 */
export enum TxSignErrorCode {
  /**
   * Wallet could not sign the data (e.g., does not have the secret key
   * associated with some of the inputs or certificates).
   */
  ProofGeneration = 1,
  /** User declined to sign the transaction */
  UserDeclined = 2,
}

/**
 * Transaction Sign Error class for CIP-30
 */
export class TxSignError extends Error {
  public readonly code: TxSignErrorCode;
  public readonly info: string;

  public constructor(code: TxSignErrorCode, info: string) {
    super(info);
    this.name = 'TxSignError';
    this.code = code;
    this.info = info;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TxSignError);
    }
  }
}
