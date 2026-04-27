import type { MidnightSpecificSendFlowType } from '../types';
import type {
  DataSigner,
  SignTransactionRequest,
  SignTransactionResult,
  SignerAuth,
  SignerContext,
  SignerFactory,
  TransactionSigner,
} from '@lace-contract/signer';
import type { HexBytes } from '@lace-sdk/util';

/** Midnight signer context including user authentication for signing. */
export interface MidnightSignerContext extends SignerContext {
  auth: SignerAuth;
}

/** Transaction sign request with Midnight-specific flow type. */
export interface MidnightSignRequest extends SignTransactionRequest {
  flowType?: MidnightSpecificSendFlowType;
}

export interface MidnightSignResult extends SignTransactionResult {}

export type MidnightTransactionSigner = TransactionSigner<
  MidnightSignRequest,
  MidnightSignResult
>;

/** Data sign request containing the raw bytes to sign. */
export interface MidnightSignDataRequest {
  data: Uint8Array;
}

/** Data sign result containing the signature and verifying key. */
export interface MidnightSignDataResult {
  signature: HexBytes;
  verifyingKey: HexBytes;
}

export type MidnightDataSigner = DataSigner<
  MidnightSignDataRequest,
  MidnightSignDataResult
>;

/** Creates Midnight-specific transaction signers. */
export interface MidnightSignerFactory extends SignerFactory {
  createTransactionSigner(
    context: MidnightSignerContext,
  ): MidnightTransactionSigner;
  createDataSigner(context: SignerContext): MidnightDataSigner;
}
