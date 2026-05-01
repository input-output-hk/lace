import type { SwapQuote } from '@lace-contract/swap-provider';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { StateObject } from '@lace-lib/util-store';

// --- Swap flow state machine states ---

export type SwapStateIdle = StateObject<
  'Idle',
  {
    accountId?: AccountId;
    sellTokenId?: string;
    buyTokenId?: string;
    sellAmount?: string;
  }
>;

export type SwapStateQuoting = StateObject<
  'Quoting',
  {
    accountId: AccountId;
    sellTokenId: string;
    buyTokenId: string;
    sellAmount: string;
  }
>;

export type SwapStateQuoted = StateObject<
  'Quoted',
  {
    accountId: AccountId;
    sellTokenId: string;
    buyTokenId: string;
    sellAmount: string;
    quotes: SwapQuote[];
    selectedQuote: SwapQuote;
  }
>;

export type SwapStateBuilding = StateObject<
  'Building',
  {
    accountId: AccountId;
    sellTokenId: string;
    buyTokenId: string;
    sellAmount: string;
    quotes: SwapQuote[];
    selectedQuote: SwapQuote;
  }
>;

export type SwapStateReviewing = StateObject<
  'Reviewing',
  {
    accountId: AccountId;
    sellTokenId: string;
    buyTokenId: string;
    sellAmount: string;
    quotes: SwapQuote[];
    selectedQuote: SwapQuote;
    unsignedTxCbor: string;
  }
>;

export type SwapStateAwaitingConfirmation = StateObject<
  'AwaitingConfirmation',
  {
    accountId: AccountId;
    sellTokenId: string;
    buyTokenId: string;
    sellAmount: string;
    selectedQuote: SwapQuote;
    unsignedTxCbor: string;
  }
>;

export type SwapStateProcessing = StateObject<
  'Processing',
  {
    accountId: AccountId;
    sellTokenId: string;
    buyTokenId: string;
    sellAmount: string;
    selectedQuote: SwapQuote;
    serializedTx: string;
  }
>;

export type SwapStateSuccess = StateObject<
  'Success',
  {
    accountId: AccountId;
    sellTokenId: string;
    buyTokenId: string;
    sellAmount: string;
    selectedQuote: SwapQuote;
    txId: string;
  }
>;

export type SwapStateError = StateObject<
  'Error',
  {
    accountId: AccountId;
    sellTokenId: string;
    buyTokenId: string;
    sellAmount: string;
    errorMessage: string;
    previousStatus: 'Building' | 'Processing' | 'Quoting';
    quotes?: SwapQuote[];
    selectedQuote?: SwapQuote;
  }
>;

export type SwapFlowState =
  | SwapStateAwaitingConfirmation
  | SwapStateBuilding
  | SwapStateError
  | SwapStateIdle
  | SwapStateProcessing
  | SwapStateQuoted
  | SwapStateQuoting
  | SwapStateReviewing
  | SwapStateSuccess;

// --- Config state (persisted) ---

export type SwapDexEntry = {
  id: string;
  name: string;
};

export type SwapProviderToken = {
  id: string;
  ticker: string;
  name: string;
  decimals: number;
  icon?: string;
};

export type SwapConfigState = {
  disclaimerAcknowledged: boolean;
  slippage: number;
  excludedDexes: string[];
  availableDexes: SwapDexEntry[] | null;
  tradableTokenIds: string[] | null;
  providerTokens: SwapProviderToken[] | null;
};
