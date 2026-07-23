import type { Address } from '@lace-contract/addresses';
import type { TranslationKey } from '@lace-contract/i18n';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { Token, TokenId } from '@lace-contract/tokens';
import type {
  FeeEntry,
  TxErrorTranslationKeys,
} from '@lace-contract/tx-executor';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';
import type { BigNumber, Option } from '@lace-lib/util';
import type {
  BlockchainAssigned,
  ErrorObject,
  JsonType,
  StateObject,
} from '@lace-lib/util-store';
import type { Observable } from 'rxjs';

export type { TxErrorTranslationKeys } from '@lace-contract/tx-executor';

export type DefaultAddressError = 'empty' | 'invalid';
export type AddressError = DefaultAddressError | TranslationKey;
export type AmountError =
  | { error: 'insufficient-balance' }
  | { error: 'less-than-minimum'; argument: string };
export type BlockchainSpecificFormDataError = string | null;

export type TokenTransfer<BlockchainSpecificTokenMetadata = unknown> = {
  amount: {
    dirty: boolean;
    error: AmountError | null;
    value: BigNumber;
  };
  token: {
    value: Token<BlockchainSpecificTokenMetadata>;
  };
};

export type FormData<
  BlockchainSpecificTokenMetadata = unknown,
  BlockchainSpecificFormData = unknown,
> = {
  address: {
    dirty: boolean;
    error: TranslationKey | null;
    value: string;
    resolvedAddress?: Address;
  };
  tokenTransfers: TokenTransfer<BlockchainSpecificTokenMetadata>[];
  /** Optional blockchain-specific fields (e.g., memo, fee market etc.) */
  blockchainSpecific?: {
    dirty: boolean;
    error: BlockchainSpecificFormDataError;
    value: BlockchainSpecificFormData;
  };
};

export type FormFieldName = keyof FormData;

export type FormChangeData =
  | { fieldName: 'address'; value: string }
  | { fieldName: 'blockchainSpecific'; value: unknown }
  | { fieldName: 'tokenTransfers.addTokens'; tokens: Token[] }
  | { fieldName: 'tokenTransfers.amount'; id: TokenId; value: BigNumber }
  | { fieldName: 'tokenTransfers.removeToken'; id: TokenId };

export type AddressValidationResult = {
  fieldName: 'address';
  resolvedAddress?: Address;
  error: TranslationKey | null;
};

export type FormValidationResult =
  | AddressValidationResult
  | {
      fieldName: 'tokenTransfers.amount';
      id: TokenId;
      error: AmountError | null;
    }
  | { fieldName: 'blockchainSpecific'; error: BlockchainSpecificFormDataError };

export type StateIdle = StateObject<'Idle'>;

export type StatePreparing<BlockchainSpecificData = unknown> = StateObject<
  'Preparing',
  {
    accountId?: AccountId;
    blockchainSpecificData: BlockchainSpecificData;
    initialAddress?: string;
    initialAmount?: BigNumber;
    initialSelectedToken?: Token;
  }
>;

export type StateDiscardingTx = StateObject<
  'DiscardingTx',
  BlockchainAssigned<{
    serializedTx: string;
  }>
>;

export type StateClosed = StateDiscardingTx | StateIdle | StatePreparing;

export type SendFlowOpenStatus =
  | 'Form'
  | 'FormPendingValidation'
  | 'FormTxBuilding'
  | 'Processing'
  | 'SelectToken'
  | 'Summary'
  | 'SummaryAwaitingConfirmation';

type StateOpenData<BlockchainSpecificData = unknown> = BlockchainAssigned<{
  accountId: AccountId;
  blockchainSpecificData: BlockchainSpecificData;
  confirmButtonEnabled: boolean;
  fees: FeeEntry[];
  minimumAmount: BigNumber;
  txBuildErrorTranslationKey?: TranslationKey;
  form: FormData;
  serializedTx: string;
  wallet: AnyWallet;
}>;

export type StateOpen<BlockchainSpecificData = unknown> = StateObject<
  SendFlowOpenStatus,
  StateOpenData<BlockchainSpecificData>
>;

export type StateFailure<BlockchainSpecificData = unknown> = StateObject<
  'Failure',
  StateOpenData<BlockchainSpecificData> & {
    error?: ErrorObject;
    errorTranslationKeys: TxErrorTranslationKeys;
  }
>;

export type StateSuccess<BlockchainSpecificData = unknown> = StateObject<
  'Success',
  BlockchainAssigned<{
    blockchainSpecificData: BlockchainSpecificData;
    confirmButtonEnabled: boolean;
    fees: FeeEntry[];
    form: FormData;
    txId: string;
  }>
>;

export type SendFlowSliceState<BlockchainSpecificData = unknown> =
  | StateClosed
  | StateFailure<BlockchainSpecificData>
  | StateOpen<BlockchainSpecificData>
  | StateSuccess<BlockchainSpecificData>;

export type SendFlowAddressValidator<
  BlockchainSpecificSendFlowData = unknown,
  BlockchainSpecificTokenMetadata = unknown,
> = BlockchainAssigned<{
  validateAddress: (params: {
    address: string;
    blockchainSpecificSendFlowData: BlockchainSpecificSendFlowData;
    network: BlockchainNetworkId;
    token?: Token<BlockchainSpecificTokenMetadata>;
  }) => Observable<Option<AddressError>>;
}>;

export type ChainMinimumAmountTokenValidator<
  BlockchainSpecificTokenMetadata = unknown,
> = BlockchainAssigned<{
  hasChainMinimumAmount: (
    token: Token<BlockchainSpecificTokenMetadata>,
  ) => boolean;
  formatMinimumAmount: (
    minimumAmount: BigNumber,
    token: Token<BlockchainSpecificTokenMetadata>,
  ) => string;
}>;

export type BaseTokenSelector<BlockchainSpecificMetadata = unknown> =
  BlockchainAssigned<{
    selectBaseToken: (
      tokens: Token<BlockchainSpecificMetadata>[],
    ) => Token<BlockchainSpecificMetadata> | undefined;
  }>;

export type SendFlowAnalyticsEnhancer<
  BlockchainSpecificSendFlowData = unknown,
  BlockchainSpecificTokenMetadata = unknown,
> = BlockchainAssigned<{
  getTransactionAnalyticsPayload: (params: {
    address: string;
    blockchainSpecificSendFlowData: BlockchainSpecificSendFlowData;
    token: Token<BlockchainSpecificTokenMetadata>;
  }) => Observable<Record<string, JsonType> | undefined>;
}>;

export type { TransferValueBucket } from '@lace-contract/token-pricing';

export type TransferType =
  | 'foreign'
  | 'intra_account'
  | 'intra_wallet'
  | 'mixed'
  | 'self';

/**
 * How the user supplied the recipient address for the current send flow.
 *
 * - `'qr'` — scanned via the QR code scanner.
 * - `'address-book'` — selected from the address book.
 * - `'manual'` — typed (or pasted) directly into the input.
 * - `'navigation'` — pre-populated by an external navigation entry point
 *   (e.g. deep link, dapp connector). Distinct from `'manual'` because the
 *   user did not type it, but the source is not one of the in-flow pickers.
 */
export type RecipientSource = 'address-book' | 'manual' | 'navigation' | 'qr';
