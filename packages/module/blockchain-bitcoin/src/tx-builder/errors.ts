import type { TranslationKey } from '@lace-contract/i18n';

/**
 * The reason a Bitcoin payment cannot be built.
 */
export enum BitcoinTxBuildErrorCode {
  /** The funding UTxO set is empty (e.g. the only UTxO is spent by a pending tx). */
  NoUtxos = 'NoUtxos',
  /** UTxOs exist but cannot cover the requested amount plus the network fee. */
  InsufficientFunds = 'InsufficientFunds',
  /** No transaction outputs were provided. */
  NoOutputs = 'NoOutputs',
  /** Change address was never set (internal invariant). */
  ChangeAddressNotSet = 'ChangeAddressNotSet',
  /** The change address failed validation. */
  InvalidChangeAddress = 'InvalidChangeAddress',
  /** A recipient address failed validation. */
  InvalidRecipientAddress = 'InvalidRecipientAddress',
  /** A selected UTxO's address could not be matched to a known signing address. */
  UnresolvedUtxoAddress = 'UnresolvedUtxoAddress',
  /** The OP_RETURN message exceeds the 80-byte limit. */
  MessageTooLong = 'MessageTooLong',
  /** The resolved fee rate is not a positive number, so the tx would pay no fee. */
  InvalidFeeRate = 'InvalidFeeRate',
}

/**
 * The error a Bitcoin payment build fails with, identified by its `code`.
 */
export class BitcoinTxBuildError extends Error {
  /** The reason the payment cannot be built. */
  public readonly code: BitcoinTxBuildErrorCode;

  public constructor(code: BitcoinTxBuildErrorCode, message: string) {
    super(message);
    this.name = 'BitcoinTxBuildError';
    this.code = code;
  }
}

const TRANSLATION_KEY_BY_CODE: Record<BitcoinTxBuildErrorCode, TranslationKey> =
  {
    [BitcoinTxBuildErrorCode.NoUtxos]: 'tx-executor.building-error.no-utxos',
    [BitcoinTxBuildErrorCode.InsufficientFunds]:
      'tx-executor.building-error.insufficient-funds',
    [BitcoinTxBuildErrorCode.NoOutputs]:
      'tx-executor.building-error.no-outputs',
    // Internal invariant — buildTx always sets a change address; surface generic.
    [BitcoinTxBuildErrorCode.ChangeAddressNotSet]:
      'tx-executor.building-error.generic',
    [BitcoinTxBuildErrorCode.InvalidChangeAddress]:
      'tx-executor.building-error.invalid-change-address',
    [BitcoinTxBuildErrorCode.InvalidRecipientAddress]:
      'tx-executor.building-error.invalid-recipient-address',
    [BitcoinTxBuildErrorCode.UnresolvedUtxoAddress]:
      'tx-executor.building-error.unresolved-utxo-address',
    [BitcoinTxBuildErrorCode.MessageTooLong]:
      'tx-executor.building-error.message-too-long',
    [BitcoinTxBuildErrorCode.InvalidFeeRate]:
      'tx-executor.building-error.invalid-fee-rate',
  };

/**
 * Maps a thrown build error to the translation key surfaced by the (generic,
 * blockchain-agnostic) send flow. Unknown errors fall back to the generic
 * build-error message.
 */
export const buildErrorTranslationKey = (error: unknown): TranslationKey =>
  error instanceof BitcoinTxBuildError
    ? TRANSLATION_KEY_BY_CODE[error.code]
    : 'tx-executor.building-error.generic';
