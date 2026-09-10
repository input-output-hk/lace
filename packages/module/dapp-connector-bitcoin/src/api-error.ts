/**
 * Bitcoin wallet API error codes.
 */
export enum BitcoinAPIErrorCode {
  /** Inputs do not conform to the expected shape or are otherwise invalid */
  InvalidRequest = -1,
  /** An error occurred during execution of this API call */
  InternalError = -2,
  /** The request was refused due to lack of access or user rejection */
  Refused = -3,
}

/**
 * Error thrown by the Bitcoin wallet API when a dApp request fails.
 */
export class BitcoinAPIError extends Error {
  public readonly code: BitcoinAPIErrorCode;
  public readonly info: string;

  public constructor(code: BitcoinAPIErrorCode, info: string) {
    super(info);
    this.name = 'BitcoinAPIError';
    this.code = code;
    this.info = info;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BitcoinAPIError);
    }
  }
}
