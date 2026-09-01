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
 * CIP-30 Paginate Error: a paginate request whose page is out of range.
 * The spec's shape is `{ maxSize }` — the total number of items available —
 * with no numeric code; dApps read `maxSize` to re-issue a valid request.
 * @see https://cips.cardano.org/cip/CIP-30#extended-api
 */
export class PaginateError extends Error {
  public readonly maxSize: number;

  public constructor(maxSize: number) {
    super(`Paginate request out of range; maxSize: ${maxSize}`);
    this.name = 'PaginateError';
    this.maxSize = maxSize;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PaginateError);
    }
  }
}

/**
 * CIP-30 Transaction Send Error codes
 * @see https://cips.cardano.org/cip/CIP-30#txsenderror
 */
export enum TxSendErrorCode {
  /** Wallet refuses to send the transaction (e.g. spending limits) */
  Refused = 1,
  /** Transaction was not accepted by the network/node */
  Failure = 2,
}

/**
 * Transaction Send Error class for CIP-30 submitTx failures.
 */
export class TxSendError extends Error {
  public readonly code: TxSendErrorCode;
  public readonly info: string;

  public constructor(code: TxSendErrorCode, info: string) {
    super(info);
    this.name = 'TxSendError';
    this.code = code;
    this.info = info;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TxSendError);
    }
  }
}

/**
 * CIP-30 Data Sign Error codes
 * @see https://cips.cardano.org/cip/CIP-30#datasignerror
 */
export enum DataSignErrorCode {
  /**
   * Wallet could not sign the data (e.g., does not have the secret key
   * associated with the address or DRep ID).
   */
  ProofGeneration = 1,
  /** Address was not a P2PK address and thus had no SK associated with it */
  AddressNotPK = 2,
  /** User declined to sign the data */
  UserDeclined = 3,
}

/**
 * Data Sign Error class for CIP-30 signData failures.
 *
 * dApps branch on `code` (GovTool-class tools detect a decline via
 * `err.code === 3` and treat other codes as "this wallet cannot sign");
 * signData failures must carry these codes rather than APIError's.
 */
export class DataSignError extends Error {
  public readonly code: DataSignErrorCode;
  public readonly info: string;

  public constructor(code: DataSignErrorCode, info: string) {
    super(info);
    this.name = 'DataSignError';
    this.code = code;
    this.info = info;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DataSignError);
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
