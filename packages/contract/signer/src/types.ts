import type { AccessAuthSecret } from '@lace-contract/authentication-prompt';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
} from '@lace-contract/wallet-repo';
import type { HexBytes } from '@lace-sdk/util';
import type { Observable } from 'rxjs';

/** Authentication interface for signers that need user credentials. */
export interface SignerAuth {
  /** Triggers the authentication prompt. Returns whether the user confirmed. */
  authenticate: () => Observable<boolean>;
  /** Provides the auth secret to a callback. Clone is auto-zeroed when the callback Observable completes. */
  accessAuthSecret: AccessAuthSecret;
}

/** Thrown when the user cancels the authentication prompt during signing. */
export class AuthenticationCancelledError extends Error {
  public constructor() {
    super('Authentication cancelled by user');
    this.name = 'AuthenticationCancelledError';
  }
}

/** Base transaction sign request. */
export interface SignTransactionRequest {
  serializedTx: HexBytes;
}

/** Base transaction sign result. */
export interface SignTransactionResult {
  serializedTx: HexBytes;
}

/** Signs transactions. */
export interface TransactionSigner<
  TRequest extends SignTransactionRequest = SignTransactionRequest,
  TResult extends SignTransactionResult = SignTransactionResult,
> {
  sign(request: TRequest): Observable<TResult>;
}

/** Signs arbitrary data. */
export interface DataSigner<TRequest, TResult> {
  signData(request: TRequest): Observable<TResult>;
}

/** Creates signers for a given wallet/account. */
export interface SignerFactory {
  canSign(account: AnyAccount): boolean;
  createTransactionSigner(context: SignerContext): TransactionSigner;
  createDataSigner(context: SignerContext): DataSigner<unknown, unknown>;
}

/** Context for signer creation. */
export interface SignerContext {
  wallet: AnyWallet;
  accountId: AccountId;
}
