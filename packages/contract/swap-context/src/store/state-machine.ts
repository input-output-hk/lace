import { createStateMachine } from '@lace-lib/util-store';

import type { SwapFlowState } from './types';
import type { SwapQuote } from '@lace-contract/swap-provider';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { EventOf } from '@lace-lib/util-store';

const initialState = {
  status: 'Idle',
} as SwapFlowState;

export type SwapFlowEvent = EventOf<typeof swapFlowMachine>;

export const swapFlowMachine = createStateMachine('swapFlow', initialState, {
  Idle: {
    accountChanged: (_, { accountId }: { accountId: AccountId }) => ({
      status: 'Idle',
      accountId,
    }),
    sellTokenSelected: (
      previousState,
      { sellTokenId, accountId }: { sellTokenId: string; accountId: AccountId },
    ) => ({
      ...previousState,
      status: 'Idle',
      sellTokenId,
      accountId,
    }),
    buyTokenSelected: (
      previousState,
      { buyTokenId }: { buyTokenId: string },
    ) => ({
      ...previousState,
      status: 'Idle',
      buyTokenId,
    }),
    sellAmountChanged: (
      previousState,
      { sellAmount }: { sellAmount: string },
    ) => ({
      ...previousState,
      status: 'Idle',
      sellAmount,
    }),
    quoteRequested: (
      _,
      payload: {
        accountId: AccountId;
        sellTokenId: string;
        buyTokenId: string;
        sellAmount: string;
      },
    ) => ({
      status: 'Quoting',
      ...payload,
    }),
    reset: () => initialState,
  },
  Quoting: {
    quotesReceived: (
      previousState,
      {
        quotes,
        selectedQuote,
      }: { quotes: SwapQuote[]; selectedQuote: SwapQuote },
    ) => ({
      ...previousState,
      status: 'Quoted',
      quotes,
      selectedQuote,
    }),
    quoteFailed: (
      previousState,
      { errorMessage }: { errorMessage: string },
    ) => ({
      status: 'Error',
      accountId: previousState.accountId,
      sellTokenId: previousState.sellTokenId,
      buyTokenId: previousState.buyTokenId,
      sellAmount: previousState.sellAmount,
      errorMessage,
      previousStatus: 'Quoting' as const,
    }),
    accountChanged: (_, { accountId }: { accountId: AccountId }) => ({
      status: 'Idle',
      accountId,
    }),
    sellTokenSelected: (
      previousState,
      { sellTokenId, accountId }: { sellTokenId: string; accountId: AccountId },
    ) => ({
      status: 'Idle',
      sellTokenId,
      accountId,
      buyTokenId: previousState.buyTokenId,
      sellAmount: previousState.sellAmount,
    }),
    buyTokenSelected: (
      previousState,
      { buyTokenId }: { buyTokenId: string },
    ) => ({
      status: 'Idle',
      accountId: previousState.accountId,
      sellTokenId: previousState.sellTokenId,
      buyTokenId,
      sellAmount: previousState.sellAmount,
    }),
    sellAmountChanged: (
      previousState,
      { sellAmount }: { sellAmount: string },
    ) => ({
      status: 'Idle',
      accountId: previousState.accountId,
      sellTokenId: previousState.sellTokenId,
      buyTokenId: previousState.buyTokenId,
      sellAmount,
    }),
    reset: () => initialState,
  },
  Quoted: {
    quoteRequested: (
      _,
      payload: {
        accountId: AccountId;
        sellTokenId: string;
        buyTokenId: string;
        sellAmount: string;
      },
    ) => ({
      status: 'Quoting',
      ...payload,
    }),
    quotesRefreshed: (
      previousState,
      {
        quotes,
        selectedQuote,
      }: { quotes: SwapQuote[]; selectedQuote: SwapQuote },
    ) => ({
      ...previousState,
      quotes,
      selectedQuote,
    }),
    routeSelected: (previousState, { quote }: { quote: SwapQuote }) => ({
      ...previousState,
      selectedQuote: quote,
    }),
    reviewRequested: previousState => ({
      ...previousState,
      status: 'Building',
    }),
    accountChanged: (_, { accountId }: { accountId: AccountId }) => ({
      status: 'Idle',
      accountId,
    }),
    sellTokenSelected: (
      previousState,
      { sellTokenId, accountId }: { sellTokenId: string; accountId: AccountId },
    ) => ({
      status: 'Idle',
      sellTokenId,
      accountId,
      buyTokenId: previousState.buyTokenId,
      sellAmount: previousState.sellAmount,
    }),
    buyTokenSelected: (
      previousState,
      { buyTokenId }: { buyTokenId: string },
    ) => ({
      status: 'Idle',
      accountId: previousState.accountId,
      sellTokenId: previousState.sellTokenId,
      buyTokenId,
      sellAmount: previousState.sellAmount,
    }),
    sellAmountChanged: (
      previousState,
      { sellAmount }: { sellAmount: string },
    ) => ({
      status: 'Idle',
      accountId: previousState.accountId,
      sellTokenId: previousState.sellTokenId,
      buyTokenId: previousState.buyTokenId,
      sellAmount,
    }),
    reset: () => initialState,
  },
  Building: {
    buildCompleted: (
      previousState,
      { unsignedTxCbor }: { unsignedTxCbor: string },
    ) => ({
      ...previousState,
      status: 'Reviewing',
      unsignedTxCbor,
    }),
    buildFailed: (
      previousState,
      { errorMessage }: { errorMessage: string },
    ) => ({
      status: 'Error',
      accountId: previousState.accountId,
      sellTokenId: previousState.sellTokenId,
      buyTokenId: previousState.buyTokenId,
      sellAmount: previousState.sellAmount,
      quotes: previousState.quotes,
      selectedQuote: previousState.selectedQuote,
      errorMessage,
      previousStatus: 'Building' as const,
    }),
    backToQuote: previousState => ({
      status: 'Quoted',
      accountId: previousState.accountId,
      sellTokenId: previousState.sellTokenId,
      buyTokenId: previousState.buyTokenId,
      sellAmount: previousState.sellAmount,
      quotes: previousState.quotes,
      selectedQuote: previousState.selectedQuote,
    }),
    reset: () => initialState,
  },
  Reviewing: {
    confirmRequested: previousState => ({
      ...previousState,
      status: 'AwaitingConfirmation',
    }),
    quoteRequested: (
      _,
      payload: {
        accountId: AccountId;
        sellTokenId: string;
        buyTokenId: string;
        sellAmount: string;
      },
    ) => ({
      status: 'Quoting',
      ...payload,
    }),
    buyTokenSelected: (
      previousState,
      { buyTokenId }: { buyTokenId: string },
    ) => ({
      ...previousState,
      buyTokenId,
      status:
        previousState.sellAmount && previousState.sellTokenId
          ? 'Quoting'
          : 'Idle',
    }),
    sellTokenSelected: (
      previousState,
      { sellTokenId }: { sellTokenId: string },
    ) => ({
      ...previousState,
      sellTokenId,
      status:
        previousState.sellAmount && previousState.buyTokenId
          ? 'Quoting'
          : 'Idle',
    }),
    sellAmountChanged: (
      previousState,
      { sellAmount }: { sellAmount: string },
    ) => ({
      ...previousState,
      sellAmount,
      status:
        sellAmount && previousState.buyTokenId && previousState.sellTokenId
          ? 'Quoting'
          : 'Idle',
    }),
    backToQuote: previousState => ({
      status: 'Quoted',
      accountId: previousState.accountId,
      sellTokenId: previousState.sellTokenId,
      buyTokenId: previousState.buyTokenId,
      sellAmount: previousState.sellAmount,
      quotes: previousState.quotes,
      selectedQuote: previousState.selectedQuote,
    }),
    reset: () => initialState,
  },
  AwaitingConfirmation: {
    confirmationCompleted: (
      previousState,
      { serializedTx }: { serializedTx: string },
    ) => ({
      status: 'Processing',
      accountId: previousState.accountId,
      sellTokenId: previousState.sellTokenId,
      buyTokenId: previousState.buyTokenId,
      sellAmount: previousState.sellAmount,
      selectedQuote: previousState.selectedQuote,
      serializedTx,
    }),
    confirmationFailed: (
      previousState,
      { errorMessage }: { errorMessage: string },
    ) => ({
      status: 'Error',
      accountId: previousState.accountId,
      sellTokenId: previousState.sellTokenId,
      buyTokenId: previousState.buyTokenId,
      sellAmount: previousState.sellAmount,
      selectedQuote: previousState.selectedQuote,
      errorMessage,
      previousStatus: 'Building' as const,
    }),
    reset: () => initialState,
  },
  Processing: {
    submissionSucceeded: (previousState, { txId }: { txId: string }) => ({
      status: 'Success',
      accountId: previousState.accountId,
      sellTokenId: previousState.sellTokenId,
      buyTokenId: previousState.buyTokenId,
      sellAmount: previousState.sellAmount,
      selectedQuote: previousState.selectedQuote,
      txId,
    }),
    submissionFailed: (
      previousState,
      { errorMessage }: { errorMessage: string },
    ) => ({
      status: 'Error',
      accountId: previousState.accountId,
      sellTokenId: previousState.sellTokenId,
      buyTokenId: previousState.buyTokenId,
      sellAmount: previousState.sellAmount,
      selectedQuote: previousState.selectedQuote,
      errorMessage,
      previousStatus: 'Processing' as const,
    }),
    reset: () => initialState,
  },
  Success: {
    reset: () => initialState,
  },
  Error: {
    accountChanged: (_, { accountId }: { accountId: AccountId }) => ({
      status: 'Idle',
      accountId,
    }),
    sellTokenSelected: (
      previousState,
      { sellTokenId, accountId }: { sellTokenId: string; accountId: AccountId },
    ) => ({
      status: 'Idle',
      sellTokenId,
      accountId,
      buyTokenId: previousState.buyTokenId,
      sellAmount: previousState.sellAmount,
    }),
    buyTokenSelected: (
      previousState,
      { buyTokenId }: { buyTokenId: string },
    ) => ({
      status: 'Idle',
      accountId: previousState.accountId,
      sellTokenId: previousState.sellTokenId,
      buyTokenId,
      sellAmount: previousState.sellAmount,
    }),
    sellAmountChanged: (
      previousState,
      { sellAmount }: { sellAmount: string },
    ) => ({
      status: 'Idle',
      accountId: previousState.accountId,
      sellTokenId: previousState.sellTokenId,
      buyTokenId: previousState.buyTokenId,
      sellAmount,
    }),
    retryRequested: previousState => {
      const base = {
        accountId: previousState.accountId,
        sellTokenId: previousState.sellTokenId,
        buyTokenId: previousState.buyTokenId,
        sellAmount: previousState.sellAmount,
      };
      if (
        previousState.previousStatus === 'Quoting' ||
        !previousState.selectedQuote
      ) {
        return { status: 'Quoting', ...base };
      }
      return {
        status: 'Building',
        ...base,
        quotes: previousState.quotes ?? [],
        selectedQuote: previousState.selectedQuote,
      };
    },
    reset: () => initialState,
  },
});
