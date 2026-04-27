import type { TranslationKey } from '@lace-contract/i18n';
import type { SideEffectDependencies } from '@lace-contract/module';
import type { Token, TokenId } from '@lace-contract/tokens';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';
import type { BlockchainAssigned, ErrorObject } from '@lace-lib/util-store';
import type { BigNumber } from '@lace-sdk/util';
import type { Observable } from 'rxjs';

/**
 * A single token transfer (amount + which token).
 * `normalizedAmount` is the integer amount in the token’s smallest unit.
 */
export type TokenTransfer<BSTokenMetadata = unknown> = {
  /** Amount in the smallest unit (integer). */
  normalizedAmount: BigNumber;
  /** The token to transfer. */
  token: Token<BSTokenMetadata>;
};

/**
 * Parameters for creating one output to a single address, possibly
 * transferring multiple tokens to that same address.
 *
 * There must be at least one transfer.
 */
export type TxParams<BSTokenMetadata = unknown, BSTxParams = unknown> = {
  /** Recipient address. */
  address: string;
  /** One or more token transfers to this address. */
  tokenTransfers: Readonly<
    [TokenTransfer<BSTokenMetadata>, ...TokenTransfer<BSTokenMetadata>[]]
  >;
  blockchainSpecific?: BSTxParams;
};

export type TxParamsBundle<
  BSTokenMetadata = unknown,
  BSTxParams = unknown,
> = Readonly<
  [
    TxParams<BSTokenMetadata, BSTxParams>,
    ...TxParams<BSTokenMetadata, BSTxParams>[],
  ]
>;

export type TxId = string;

export type TxErrorTranslationKeys = {
  subtitle: TranslationKey;
  title: TranslationKey;
};

type Result<S, F> = (F & { success: false }) | (S & { success: true });

export type FeeEntry = {
  amount: BigNumber;
  tokenId: TokenId;
};

export type BuildTxParams<
  BSSendFlowData = unknown,
  BSTokenMetadata = unknown,
  BSTxParams = unknown,
> = BlockchainAssigned<{
  accountId: AccountId;
  serializedTx: string;
  txParams: TxParamsBundle<BSTokenMetadata, BSTxParams>;
  blockchainSpecificSendFlowData: BSSendFlowData;
}>;

export type TxBuildResult = Result<
  {
    fees: FeeEntry[];
    serializedTx: string;
    warningTranslationKey?: TranslationKey;
  },
  { errorTranslationKey: TranslationKey }
>;

export type TxPreviewResult = Result<{ minimumAmount: BigNumber }, unknown>;

export type ConfirmTxParams<BSSendFlowData = unknown> = BlockchainAssigned<{
  accountId: AccountId;
  blockchainSpecificSendFlowData: BSSendFlowData;
  serializedTx: string;
  wallet: AnyWallet;
}>;

export type TxConfirmationResult = Result<
  { serializedTx: string },
  {
    error?: ErrorObject;
    errorTranslationKeys: TxErrorTranslationKeys;
  }
>;

export type DiscardTxParams = BlockchainAssigned<{ serializedTx: string }>;

export type TxDiscardResult = Result<unknown, unknown>;

export type SubmitTxParams<BSSendFlowData = unknown> = BlockchainAssigned<{
  accountId: AccountId;
  blockchainSpecificSendFlowData: BSSendFlowData;
  serializedTx: string;
}>;

export type TxSubmissionResult = Result<
  { txId: TxId },
  {
    error?: ErrorObject;
    errorTranslationKeys: TxErrorTranslationKeys;
  }
>;

export type TxExecutorImplementation<
  BSSendFlowData = unknown,
  BSTokenMetadata = unknown,
  BSTxParams = unknown,
> = BlockchainAssigned<{
  buildTx: (
    params: BuildTxParams<BSSendFlowData, BSTokenMetadata, BSTxParams>,
  ) => Observable<TxBuildResult>;
  previewTx: (
    params: BuildTxParams<BSSendFlowData, BSTokenMetadata, BSTxParams>,
  ) => Observable<TxPreviewResult>;
  confirmTx: (
    params: ConfirmTxParams<BSSendFlowData>,
  ) => Observable<TxConfirmationResult>;
  discardTx: (params: DiscardTxParams) => Observable<TxDiscardResult>;
  submitTx: (
    params: SubmitTxParams<BSSendFlowData>,
  ) => Observable<TxSubmissionResult>;
}>;

export type MakeTxExecutorImplementation<
  BSSendFlowData = unknown,
  BSTokenMetadata = unknown,
> = (
  dependencies: SideEffectDependencies,
) => TxExecutorImplementation<BSSendFlowData, BSTokenMetadata>;

export type TxExecutorImplementationMethodName = keyof Omit<
  TxExecutorImplementation,
  'blockchainName'
>;
