import type {
  DataSigner,
  SignTransactionRequest,
  SignTransactionResult,
  SignerAuth,
  SignerContext,
  SignerFactory,
  TransactionSigner,
} from '@lace-contract/signer';
import type { HexBytes } from '@lace-lib/util';

/** Bitcoin signer context with auth. */
export interface BitcoinSignerContext extends SignerContext {
  auth: SignerAuth;
}

/** Transaction sign request. */
export interface BitcoinSignRequest extends SignTransactionRequest {}

/**
 * Decoded JSON form of BitcoinSignRequest.serializedTx: the hex-encoded PSBT
 * plus one signer entry per input, in input order, carrying the derivation
 * coordinates and pubkey of the key that owns it. Produced by the Bitcoin
 * blockchain module's transaction builder and decoded by every vault signer.
 */
export interface BitcoinUnsignedTxDto {
  context: string;
  network?: string;
  signers: Array<{
    publicKeyHex: string;
    addressType: string;
    account: number;
    chain: string;
    index: number;
    network: string;
  }>;
}

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
