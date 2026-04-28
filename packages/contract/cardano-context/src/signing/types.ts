import type { Cardano, Serialization } from '@cardano-sdk/core';
import type {
  Bip32PublicKeyHex,
  Ed25519PublicKeyHex,
} from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { HexBlob } from '@cardano-sdk/util';
import type { AuthSecret } from '@lace-contract/authentication-prompt';
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

/** Interface for Cardano key operations. */
export interface CardanoKeyAgent {
  /** Signs a transaction body and returns VKey witnesses. */
  signTransaction(
    txBody: Serialization.TransactionBody,
    context: {
      knownAddresses: GroupedAddress[];
      utxo: Cardano.Utxo[];
    },
  ): Promise<Map<Ed25519PublicKeyHex, string>>;

  /** Signs raw bytes with a derived key. */
  signBlob(
    derivationPath: { role: number; index: number },
    blob: HexBlob,
  ): Promise<{ signature: string; publicKey: string }>;
}

/** Creates a CardanoKeyAgent from wallet credentials. */
export type CreateCardanoKeyAgent = (params: {
  accountIndex: number;
  chainId: Cardano.ChainId;
  encryptedRootPrivateKey: HexBytes;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  authSecret: AuthSecret;
}) => Promise<CardanoKeyAgent>;

/** Cardano signer context with knownAddresses. */
export interface CardanoSignerContext extends SignerContext {
  knownAddresses: GroupedAddress[];
  auth: SignerAuth;
}

/** Extends CardanoSignerContext with UTXOs for input resolution. */
export interface CardanoTransactionSignerContext extends CardanoSignerContext {
  utxo: Cardano.Utxo[];
}

/** Transaction sign request. */
export interface CardanoSignRequest extends SignTransactionRequest {}

export interface CardanoSignResult extends SignTransactionResult {
  signatureCount: number;
}

export type CardanoTransactionSigner = TransactionSigner<
  CardanoSignRequest,
  CardanoSignResult
>;

/** Data sign request. */
export interface CardanoSignDataRequest {
  signWith: Cardano.PaymentAddress | Cardano.RewardAccount;
  payload: string;
}

export interface CardanoSignDataResult {
  signature: HexBytes;
  key: HexBytes;
}

export type CardanoDataSigner = DataSigner<
  CardanoSignDataRequest,
  CardanoSignDataResult
>;

/** Creates Cardano-specific transaction and data signers. */
export interface CardanoSignerFactory extends SignerFactory {
  createTransactionSigner(
    context: CardanoTransactionSignerContext,
  ): CardanoTransactionSigner;
  createDataSigner(context: CardanoSignerContext): CardanoDataSigner;
}

/** Resolved wallet/account props for signer construction. */
export interface CardanoSignerProps {
  createKeyAgent: CreateCardanoKeyAgent;
  accountIndex: number;
  chainId: Cardano.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  encryptedRootPrivateKey: HexBytes;
  knownAddresses: GroupedAddress[];
  auth: SignerAuth;
}

/** Extends CardanoSignerProps with UTXOs. */
export interface CardanoTransactionSignerProps extends CardanoSignerProps {
  utxo: Cardano.Utxo[];
}
