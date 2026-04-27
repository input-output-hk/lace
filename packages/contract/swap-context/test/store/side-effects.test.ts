import '../../src/augmentations';

import { analyticsActions } from '@lace-contract/analytics';
import { uiActions } from '@lace-contract/app';
import { AccountId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { Ok, Err } from '@lace-sdk/util';
import { of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it } from 'vitest';

import {
  makeAutoQuote,
  makeAwaitConfirmation,
  makeBuildSwapTx,
  makeFetchDexList,
  makeFetchQuote,
  makeFetchTradableTokens,
  makeProcessing,
} from '../../src/store/side-effects';
import { swapContextActions } from '../../src/store/slice';

import type { SwapFlowState } from '../../src/store/types';
import type {
  SwapDex,
  SwapProviderError,
  SwapQuote,
  SwapToken,
} from '@lace-contract/swap-provider';
import type { TxErrorTranslationKeys } from '@lace-contract/tx-executor';
import type { AnyWallet } from '@lace-contract/wallet-repo';

const logger = dummyLogger;
const testAccountId = AccountId('test-account-0-mainnet');

const actions = {
  ...swapContextActions,
  ...uiActions,
  ...analyticsActions,
};

const mockQuote: SwapQuote = {
  routeId: 'route-1',
  providerId: 'steelswap',
  sellTokenId: 'lovelace',
  buyTokenId: 'abc123',
  sellAmount: '10000000',
  expectedBuyAmount: '500',
  price: 0.00005,
  priceDisplay: '0.000050',
  fees: [
    {
      label: 'Network fee',
      amount: '2000000',
      tokenId: 'lovelace',
      displayAmount: '2.00',
      displayCurrency: 'ADA',
    },
  ],
  totalFeeDisplay: '2.00 ADA',
  route: [
    {
      dexName: 'Minswap',
      sellTokenId: 'lovelace',
      buyTokenId: 'abc123',
      percentage: 1,
    },
  ],
  quoteExpiresAt: Date.now() + 15_000,
};

const mockProvider = {
  getQuote: () => of(Ok(mockQuote)),
  buildSwapTx: () =>
    of(Ok({ unsignedTxCbor: 'deadbeef', providerId: 'steelswap' })),
  listTokens: () =>
    of(
      Ok([
        { id: 'lovelace', ticker: 'ADA', name: 'Cardano', decimals: 6 },
        { id: 'abc123', ticker: 'MIN', name: 'Minswap', decimals: 6 },
      ] as SwapToken[]),
    ),
  listDexes: () => of(Ok([{ id: 'Minswap', name: 'Minswap' }] as SwapDex[])),
  searchTokens: () => of(Ok([] as SwapToken[])),
};

const failingProvider = {
  ...mockProvider,
  getQuote: () =>
    of(
      Err<SwapProviderError>({
        code: 'PROVIDER_UNAVAILABLE',
        message: 'Provider down',
      }),
    ),
  buildSwapTx: () =>
    of(
      Err<SwapProviderError>({
        code: 'PROVIDER_UNAVAILABLE',
        message: 'Build failed',
      }),
    ),
};

const testWallet = {
  walletId: 'wallet-1',
  accounts: [{ accountId: testAccountId, blockchainName: 'Cardano' }],
} as unknown as AnyWallet;

const quotingState: SwapFlowState = {
  status: 'Quoting',
  accountId: testAccountId,
  sellTokenId: 'lovelace',
  buyTokenId: 'abc123',
  sellAmount: '10',
};

const buildingState: SwapFlowState = {
  status: 'Building',
  accountId: testAccountId,
  sellTokenId: 'lovelace',
  buyTokenId: 'abc123',
  sellAmount: '10',
  quotes: [mockQuote],
  selectedQuote: mockQuote,
};

const awaitingState: SwapFlowState = {
  status: 'AwaitingConfirmation',
  accountId: testAccountId,
  sellTokenId: 'lovelace',
  buyTokenId: 'abc123',
  sellAmount: '10',
  selectedQuote: mockQuote,
  unsignedTxCbor: 'unsigned-cbor',
};

const processingState: SwapFlowState = {
  status: 'Processing',
  accountId: testAccountId,
  sellTokenId: 'lovelace',
  buyTokenId: 'abc123',
  sellAmount: '10',
  selectedQuote: mockQuote,
  serializedTx: 'signed-cbor',
};

describe('swap-context side effects', () => {
  describe('makeFetchQuote', () => {
    it('emits quotesReceived on successful provider response', () => {
      testSideEffect(makeFetchQuote, ({ hot, flush }) => ({
        stateObservables: {
          swapFlow: {
            selectSwapFlowState$: hot<SwapFlowState>('-a', {
              a: quotingState,
            }),
          },
          swapConfig: {
            selectSlippage$: of(0.5),
            selectExcludedDexes$: of([] as string[]),
          },
          tokens: {
            selectTokenById$: of(((): { decimals: number } | undefined => ({
              decimals: 6,
            })) as (id: string) => { decimals: number } | undefined) as never,
          },
        },
        dependencies: { actions, logger, swapProviders: [mockProvider] },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();
          expect(emissions).toContainEqual(
            actions.swapFlow.quotesReceived({
              quotes: [mockQuote],
              selectedQuote: mockQuote,
            }),
          );
        },
      }));
    });

    it('emits quoteFailed and showToast when all providers fail', () => {
      testSideEffect(makeFetchQuote, ({ hot, flush }) => ({
        stateObservables: {
          swapFlow: {
            selectSwapFlowState$: hot<SwapFlowState>('-a', {
              a: quotingState,
            }),
          },
          swapConfig: {
            selectSlippage$: of(0.5),
            selectExcludedDexes$: of([] as string[]),
          },
          tokens: {
            selectTokenById$: of(((): { decimals: number } | undefined => ({
              decimals: 6,
            })) as (id: string) => { decimals: number } | undefined) as never,
          },
        },
        dependencies: { actions, logger, swapProviders: [failingProvider] },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();
          expect(emissions).toContainEqual(
            actions.swapFlow.quoteFailed({
              errorMessage: 'v2.swap.error.no-quotes-available',
            }),
          );
          expect(emissions).toContainEqual(
            expect.objectContaining({ type: 'ui/showToast' }),
          );
        },
      }));
    });
  });

  describe('makeBuildSwapTx', () => {
    it('emits buildCompleted on successful build', () => {
      testSideEffect(makeBuildSwapTx, ({ hot, flush }) => ({
        stateObservables: {
          swapFlow: {
            selectSwapFlowState$: hot<SwapFlowState>('-a', {
              a: buildingState,
            }),
          },
          swapConfig: {
            selectSlippage$: of(0.5),
            selectExcludedDexes$: of([] as string[]),
          },
          addresses: {
            selectByAccountId$: of(
              ((): Array<{ address: string }> => [
                { address: 'addr_test1...' },
              ]) as (id: AccountId) => Array<{ address: string }>,
            ) as never,
          },
          cardanoContext: {
            selectAccountUtxos$: of({}),
            selectAccountUnspendableUtxos$: of({}),
          },
        },
        dependencies: { actions, logger, swapProviders: [mockProvider] },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();
          expect(emissions).toContainEqual(
            actions.swapFlow.buildCompleted({ unsignedTxCbor: 'deadbeef' }),
          );
        },
      }));
    });

    it('emits buildFailed and showToast on provider error', () => {
      testSideEffect(makeBuildSwapTx, ({ hot, flush }) => ({
        stateObservables: {
          swapFlow: {
            selectSwapFlowState$: hot<SwapFlowState>('-a', {
              a: buildingState,
            }),
          },
          swapConfig: {
            selectSlippage$: of(0.5),
            selectExcludedDexes$: of([] as string[]),
          },
          addresses: {
            selectByAccountId$: of(
              ((): Array<{ address: string }> => [
                { address: 'addr_test1...' },
              ]) as (id: AccountId) => Array<{ address: string }>,
            ) as never,
          },
          cardanoContext: {
            selectAccountUtxos$: of({}),
            selectAccountUnspendableUtxos$: of({}),
          },
        },
        dependencies: { actions, logger, swapProviders: [failingProvider] },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();
          expect(emissions).toContainEqual(
            actions.swapFlow.buildFailed({ errorMessage: 'Build failed' }),
          );
          expect(emissions).toContainEqual(
            expect.objectContaining({ type: 'ui/showToast' }),
          );
        },
      }));
    });

    it('emits buildFailed when no providers available', () => {
      testSideEffect(makeBuildSwapTx, ({ hot, flush }) => ({
        stateObservables: {
          swapFlow: {
            selectSwapFlowState$: hot<SwapFlowState>('-a', {
              a: buildingState,
            }),
          },
          swapConfig: {
            selectSlippage$: of(0.5),
            selectExcludedDexes$: of([] as string[]),
          },
          addresses: {
            selectByAccountId$: of(
              ((): Array<{ address: string }> => [
                { address: 'addr_test1...' },
              ]) as (id: AccountId) => Array<{ address: string }>,
            ) as never,
          },
          cardanoContext: {
            selectAccountUtxos$: of({}),
            selectAccountUnspendableUtxos$: of({}),
          },
        },
        dependencies: { actions, logger, swapProviders: [] },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();
          expect(emissions).toContainEqual(
            actions.swapFlow.buildFailed({
              errorMessage: 'v2.swap.error.no-provider-available',
            }),
          );
        },
      }));
    });
  });

  describe('makeAutoQuote', () => {
    it('emits quoteRequested when all fields are populated', () => {
      testSideEffect(makeAutoQuote, ({ hot, flush }) => ({
        stateObservables: {
          swapFlow: {
            selectSwapFlowState$: hot<SwapFlowState>('a', {
              a: {
                status: 'Idle',
                accountId: testAccountId,
                sellTokenId: 'lovelace',
                buyTokenId: 'abc123',
                sellAmount: '10',
              },
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();
          expect(emissions).toContainEqual(
            actions.swapFlow.quoteRequested({
              accountId: testAccountId,
              sellTokenId: 'lovelace',
              buyTokenId: 'abc123',
              sellAmount: '10',
            }),
          );
        },
      }));
    });

    it('does not emit when sellAmount is zero', () => {
      testSideEffect(makeAutoQuote, ({ hot, flush }) => ({
        stateObservables: {
          swapFlow: {
            selectSwapFlowState$: hot<SwapFlowState>('a', {
              a: {
                status: 'Idle',
                accountId: testAccountId,
                sellTokenId: 'lovelace',
                buyTokenId: 'abc123',
                sellAmount: '0',
              },
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();
          expect(emissions).toHaveLength(0);
        },
      }));
    });

    it('does not emit when fields are missing', () => {
      testSideEffect(makeAutoQuote, ({ hot, flush }) => ({
        stateObservables: {
          swapFlow: {
            selectSwapFlowState$: hot<SwapFlowState>('a', {
              a: { status: 'Idle', accountId: testAccountId },
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();
          expect(emissions).toHaveLength(0);
        },
      }));
    });
  });

  describe('makeFetchDexList', () => {
    it('emits setAvailableDexes on successful fetch', () => {
      testSideEffect(makeFetchDexList, ({ hot, flush }) => ({
        stateObservables: {
          swapFlow: {
            selectSwapFlowState$: hot<SwapFlowState>('-a', {
              a: { status: 'Idle' },
            }),
          },
          swapConfig: { selectAvailableDexes$: of(null) },
        },
        dependencies: { actions, logger, swapProviders: [mockProvider] },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();
          expect(emissions).toContainEqual(
            actions.swapConfig.setAvailableDexes([
              { id: 'Minswap', name: 'Minswap' },
            ]),
          );
        },
      }));
    });

    it('does not emit when no providers available', () => {
      testSideEffect(makeFetchDexList, ({ hot, flush }) => ({
        stateObservables: {
          swapFlow: {
            selectSwapFlowState$: hot<SwapFlowState>('-a', {
              a: { status: 'Idle' },
            }),
          },
          swapConfig: { selectAvailableDexes$: of(null) },
        },
        dependencies: { actions, logger, swapProviders: [] },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();
          expect(emissions).toHaveLength(0);
        },
      }));
    });
  });

  describe('makeFetchTradableTokens', () => {
    it('emits setTradableTokenIds and setProviderTokens on successful fetch', () => {
      testSideEffect(makeFetchTradableTokens, ({ hot, flush }) => ({
        stateObservables: {
          swapFlow: {
            selectSwapFlowState$: hot<SwapFlowState>('-a', {
              a: { status: 'Idle' },
            }),
          },
        },
        dependencies: { actions, logger, swapProviders: [mockProvider] },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();
          expect(emissions).toContainEqual(
            actions.swapConfig.setTradableTokenIds(['lovelace', 'abc123']),
          );
          expect(emissions).toContainEqual(
            expect.objectContaining({
              type: actions.swapConfig.setProviderTokens.type,
            }),
          );
        },
      }));
    });
  });

  describe('makeAwaitConfirmation', () => {
    it('emits confirmationCompleted on successful signing', () => {
      const signedTx = 'signed-cbor-hex';
      testSideEffect(
        {
          build: () =>
            makeAwaitConfirmation({
              confirmTx: (_params, mapResult) =>
                of(mapResult({ success: true, serializedTx: signedTx })),
            }),
        },
        ({ hot, flush }) => ({
          stateObservables: {
            swapFlow: {
              selectSwapFlowState$: hot<SwapFlowState>('-a', {
                a: awaitingState,
              }),
            },
            wallets: { selectAll$: of([testWallet]) },
          },
          dependencies: { actions, logger },
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(action => emissions.push(action));
            flush();
            expect(emissions).toContainEqual(
              actions.swapFlow.confirmationCompleted({
                serializedTx: signedTx,
              }),
            );
          },
        }),
      );
    });

    it('emits confirmationFailed when wallet not found', () => {
      testSideEffect(
        {
          build: () =>
            makeAwaitConfirmation({
              confirmTx: (_params, mapResult) =>
                of(mapResult({ success: true, serializedTx: '' })),
            }),
        },
        ({ hot, flush }) => ({
          stateObservables: {
            swapFlow: {
              selectSwapFlowState$: hot<SwapFlowState>('-a', {
                a: {
                  ...awaitingState,
                  accountId: AccountId('nonexistent'),
                },
              }),
            },
            wallets: { selectAll$: of([testWallet]) },
          },
          dependencies: { actions, logger },
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(action => emissions.push(action));
            flush();
            expect(emissions).toContainEqual(
              actions.swapFlow.confirmationFailed({
                errorMessage: 'v2.swap.error.no-wallet-found',
              }),
            );
          },
        }),
      );
    });
  });

  describe('makeProcessing', () => {
    it('emits submissionSucceeded on successful submission', () => {
      testSideEffect(
        {
          build: () =>
            makeProcessing({
              submitTx: (_params, mapResult) =>
                of(mapResult({ success: true, txId: 'tx-hash-123' })),
            }),
        },
        ({ hot, flush }) => ({
          stateObservables: {
            swapFlow: {
              selectSwapFlowState$: hot<SwapFlowState>('-a', {
                a: processingState,
              }),
            },
            swapConfig: { selectSlippage$: of(0.5) },
          },
          dependencies: { actions, logger },
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(action => emissions.push(action));
            flush();
            expect(emissions).toContainEqual(
              actions.swapFlow.submissionSucceeded({ txId: 'tx-hash-123' }),
            );
          },
        }),
      );
    });

    it('emits submissionFailed on submission failure', () => {
      testSideEffect(
        {
          build: () =>
            makeProcessing({
              submitTx: (_params, mapResult) =>
                of(
                  mapResult({
                    success: false,
                    error: { message: 'Submission rejected' },
                    errorTranslationKeys: {} as TxErrorTranslationKeys,
                  }),
                ),
            }),
        },
        ({ hot, flush }) => ({
          stateObservables: {
            swapFlow: {
              selectSwapFlowState$: hot<SwapFlowState>('-a', {
                a: processingState,
              }),
            },
            swapConfig: { selectSlippage$: of(0.5) },
          },
          dependencies: { actions, logger },
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(action => emissions.push(action));
            flush();
            expect(emissions).toContainEqual(
              expect.objectContaining({
                type: actions.swapFlow.submissionFailed.type,
              }),
            );
          },
        }),
      );
    });
  });
});
