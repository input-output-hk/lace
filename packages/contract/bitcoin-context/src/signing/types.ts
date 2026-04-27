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

/** Bitcoin signer context with auth. */
export interface BitcoinSignerContext extends SignerContext {
  auth: SignerAuth;
}

/** Transaction sign request. */
export interface BitcoinSignRequest extends SignTransactionRequest {}

export interface BitcoinSignResult extends SignTransactionResult {}

export type BitcoinTransactionSigner = TransactionSigner<
  BitcoinSignRequest,
  BitcoinSignResult
>;

/** BIP-322 data signing request. */
export interface BitcoinSignDataRequest {
  address: string;
  message: string;
}

/** BIP-322 data signing result. */
export interface BitcoinSignDataResult {
  signature: HexBytes;
}

export type BitcoinDataSigner = DataSigner<
  BitcoinSignDataRequest,
  BitcoinSignDataResult
>;

/** Creates Bitcoin-specific transaction and data signers. */
export interface BitcoinSignerFactory extends SignerFactory {
  createTransactionSigner(
    context: BitcoinSignerContext,
  ): BitcoinTransactionSigner;
  createDataSigner(context: BitcoinSignerContext): BitcoinDataSigner;
}
