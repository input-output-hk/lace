export enum AuthenticatorErrorCode {
  NoWalletAvailable = 'NoWalletAvailable',
}

export class AuthenticatorError extends Error {
  public readonly code: AuthenticatorErrorCode;

  public constructor(code: AuthenticatorErrorCode, message: string) {
    super(message);
    this.name = 'AuthenticatorError';
    this.code = code;
  }
}
