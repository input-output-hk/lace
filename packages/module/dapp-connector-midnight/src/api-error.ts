import type {
  APIError as MidnightAPIError,
  ErrorCode,
} from '@midnight-ntwrk/dapp-connector-api';

export class APIError extends Error implements MidnightAPIError {
  public readonly reason: string;
  public readonly type = 'DAppConnectorAPIError';

  public constructor(public code: ErrorCode, message: string) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.reason = message;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }
}
