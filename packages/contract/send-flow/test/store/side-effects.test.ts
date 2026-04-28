import { activitiesActions, ActivityType } from '@lace-contract/activities';
import { analyticsActions } from '@lace-contract/analytics';
import { BlockchainNetworkId, type NetworkType } from '@lace-contract/network';
import { TokenId } from '@lace-contract/tokens';
import { AccountId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { BigNumber, Timestamp } from '@lace-sdk/util';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import { sendFlowActions } from '../../src';
import { FEATURE_FLAG_SEND_FLOW } from '../../src/const';
import { createFormInitialState } from '../../src/store/form-initial-state';
import {
  makeSendFlowAwaitingConfirmation,
  makeSendFlowFormDataValidation,
  makeSendFlowProcessing,
  makeSendFlowTxBuilding,
  makeSendFlowDiscard,
  makeSendFlowPreparing,
  makeTrackSendFlowAuthenticationConfirmation,
  syncSendFlowFeatureFlagPayload,
} from '../../src/store/side-effects';

import type { SendFlowAddressValidator, SendFlowSliceState } from '../../src';
import type {
  FormValidationResult,
  TxErrorTranslationKeys,
} from '../../src/types';
import type { Address, AddressAliasResolver } from '@lace-contract/addresses';
import type { Token } from '@lace-contract/tokens';
import type { TxBuildResult } from '@lace-contract/tx-executor';
import type { AnyWallet } from '@lace-contract/wallet-repo';

const logger = dummyLogger;

const midnightAccount = {
  accountId: AccountId('midnight-acc'),
  blockchainName: 'Midnight',
  networkType: 'mainnet',
  blockchainNetworkId: 'mainnet',
} as const;
const cardanoAccount = {
  accountId: AccountId('cardano-acc'),
  blockchainName: 'Cardano',
  networkType: 'mainnet',
  blockchainNetworkId: 1,
} as const;

const midnightToken: Token = {
  accountId: midnightAccount.accountId,
  address: 'mn-addr' as Address,
  blockchainName: midnightAccount.blockchainName,
  tokenId: TokenId('id'),
  available: BigNumber(100n),
  pending: BigNumber(0n),
  displayLongName: 'Test token',
  displayShortName: 'TT1',
  decimals: 2,
  unnamed: false,
  metadata: {
    name: 'Test token',
    decimals: 2,
    ticker: 'TT1',
    blockchainSpecific: {},
  },
};

const cardanoToken: Token = {
  accountId: cardanoAccount.accountId,
  address: 'cardano-address' as Address,
  blockchainName: cardanoAccount.blockchainName,
  tokenId: TokenId('id'),
  available: BigNumber(10n),
  pending: BigNumber(0n),
  displayLongName: 'Test token 2',
  displayShortName: 'TT2',
  decimals: 3,
  unnamed: false,
  metadata: {
    name: 'Test token 2',
    decimals: 3,
    ticker: 'TT2',
    blockchainSpecific: {},
  },
};

const lovelaceToken: Token = {
  accountId: cardanoAccount.accountId,
  address: 'cardano-address' as Address,
  blockchainName: cardanoAccount.blockchainName,
  tokenId: TokenId('lovelace'),
  available: BigNumber(10_000_000n),
  pending: BigNumber(0n),
  displayLongName: 'ADA',
  displayShortName: 'ADA',
  decimals: 6,
  unnamed: false,
  metadata: {
    name: 'Cardano',
    decimals: 6,
    ticker: 'ADA',
    blockchainSpecific: {},
  },
};

const baseToken: Token = {
  accountId: midnightAccount.accountId,
  address: 'mn-addr' as Address,
  blockchainName: midnightAccount.blockchainName,
  tokenId: TokenId('base-token'),
  available: BigNumber(100n),
  pending: BigNumber(0n),
  displayLongName: 'Base token',
  displayShortName: 'BT1',
  decimals: 2,
  unnamed: false,
  metadata: {
    name: 'Base token',
    decimals: 2,
    ticker: 'BT1',
    blockchainSpecific: {},
  },
};

const wallet = {
  accounts: [midnightAccount, cardanoAccount],
} as AnyWallet;

describe('send-flow sideEffects', () => {
  describe('sendFlowPreparing', () => {
    it('sends single "preparingCompleted" action with form containing first token of active blockchain', () => {
      testSideEffect(
        makeSendFlowPreparing({ selectBaseToken: () => null }),
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  status: 'Preparing',
                  accountId: midnightAccount.accountId,
                  blockchainSpecificData: {},
                } satisfies SendFlowSliceState,
              }),
            },
            tokens: {
              selectTokensGroupedByAccount$: cold('ab', {
                a: {},
                b: {
                  [midnightAccount.accountId]: {
                    fungible: [midnightToken],
                    nfts: [],
                  },
                  [cardanoAccount.accountId]: {
                    fungible: [cardanoToken],
                    nfts: [],
                  },
                },
              }),
            },
            wallets: {
              selectAll$: cold('a', { a: [wallet] }),
            },
            network: {
              selectNetworkType$: cold('a', { a: 'mainnet' as NetworkType }),
              selectBlockchainNetworks$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions: {
              ...sendFlowActions,
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: sendFlowActions.sendFlow.preparingCompleted({
                form: createFormInitialState({
                  token: midnightToken,
                }),
                blockchainName: midnightToken.blockchainName,
                accountId: midnightToken.accountId,
                wallet,
              }),
            });
          },
        }),
      );
    });

    it('sends single "preparingCompleted" action with form containing first token of active blockchain if selectBaseToken provides no token', () => {
      testSideEffect(
        makeSendFlowPreparing({
          selectBaseToken: () => ({
            blockchainName: 'Midnight',
            selectBaseToken: () => undefined,
          }),
        }),
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  status: 'Preparing',
                  accountId: midnightAccount.accountId,
                  blockchainSpecificData: {},
                } satisfies SendFlowSliceState,
              }),
            },
            tokens: {
              selectTokensGroupedByAccount$: cold('ab', {
                a: {},
                b: {
                  [midnightAccount.accountId]: {
                    fungible: [midnightToken],
                    nfts: [],
                  },
                  [cardanoAccount.accountId]: {
                    fungible: [cardanoToken],
                    nfts: [],
                  },
                },
              }),
            },
            wallets: {
              selectAll$: cold('a', { a: [wallet] }),
            },
            network: {
              selectNetworkType$: cold('a', { a: 'mainnet' as NetworkType }),
              selectBlockchainNetworks$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions: {
              ...sendFlowActions,
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: sendFlowActions.sendFlow.preparingCompleted({
                form: createFormInitialState({
                  token: midnightToken,
                }),
                blockchainName: midnightToken.blockchainName,
                accountId: midnightToken.accountId,
                wallet,
              }),
            });
          },
        }),
      );
    });

    it('sends single "preparingCompleted" action with form containing first token returned by selectBaseToken util', () => {
      testSideEffect(
        makeSendFlowPreparing({
          selectBaseToken: () => ({
            blockchainName: 'Midnight',
            selectBaseToken: () => baseToken,
          }),
        }),
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  status: 'Preparing',
                  blockchainSpecificData: {},
                  accountId: midnightAccount.accountId,
                } satisfies SendFlowSliceState,
              }),
            },
            tokens: {
              selectTokensGroupedByAccount$: cold('ab', {
                a: {},
                b: {
                  [midnightAccount.accountId]: {
                    fungible: [midnightToken],
                    nfts: [],
                  },
                  [cardanoAccount.accountId]: {
                    fungible: [cardanoToken],
                    nfts: [],
                  },
                },
              }),
            },
            wallets: {
              selectAll$: cold('a', { a: [wallet] }),
            },
            network: {
              selectNetworkType$: cold('a', { a: 'mainnet' as NetworkType }),
              selectBlockchainNetworks$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions: {
              ...sendFlowActions,
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: sendFlowActions.sendFlow.preparingCompleted({
                form: createFormInitialState({
                  token: baseToken,
                }),
                blockchainName: baseToken.blockchainName,
                accountId: baseToken.accountId,
                wallet,
              }),
            });
          },
        }),
      );
    });

    it('sends single "closed" action with initially selected token not for the current account', () => {
      testSideEffect(
        makeSendFlowPreparing({ selectBaseToken: () => null }),
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  status: 'Preparing',
                  initialSelectedToken: midnightToken,
                  blockchainSpecificData: {},
                  accountId: AccountId('cardano-acc'),
                } satisfies SendFlowSliceState,
              }),
            },
            tokens: {
              selectTokensGroupedByAccount$: cold('a', {
                a: {},
              }),
            },
            wallets: {
              selectAll$: cold('a', { a: [wallet] }),
            },
            network: {
              selectNetworkType$: cold('a', { a: 'mainnet' as NetworkType }),
              selectBlockchainNetworks$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: sendFlowActions.sendFlow.closed(),
            });
          },
        }),
      );
    });

    it('sends single "preparingCompleted" action with form prefilled with provided token', () => {
      testSideEffect(
        makeSendFlowPreparing({ selectBaseToken: () => null }),
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  status: 'Preparing',
                  initialSelectedToken: cardanoToken,
                  blockchainSpecificData: {},
                  accountId: cardanoAccount.accountId,
                } satisfies SendFlowSliceState,
              }),
            },
            tokens: {
              selectTokensGroupedByAccount$: cold('a', {
                a: {},
              }),
            },
            wallets: {
              selectAll$: cold('a', { a: [wallet] }),
            },
            network: {
              selectNetworkType$: cold('a', { a: 'mainnet' as NetworkType }),
              selectBlockchainNetworks$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions: {
              ...sendFlowActions,
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: sendFlowActions.sendFlow.preparingCompleted({
                form: createFormInitialState({
                  token: cardanoToken,
                }),
                blockchainName: cardanoAccount.blockchainName,
                accountId: cardanoAccount.accountId,
                wallet,
              }),
            });
          },
        }),
      );
    });

    it('emits closed action when there is no wallet or no accounts visible on current network', () => {
      testSideEffect(
        makeSendFlowPreparing({ selectBaseToken: () => null }),
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  status: 'Preparing',
                  accountId: midnightAccount.accountId,
                } as SendFlowSliceState,
              }),
            },
            tokens: {
              selectTokensGroupedByAccount$: cold(''),
            },
            wallets: {
              selectAll$: cold('a', { a: [] }),
            },
            network: {
              selectNetworkType$: cold('a', { a: 'mainnet' as NetworkType }),
              selectBlockchainNetworks$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: sendFlowActions.sendFlow.closed(),
            });
          },
        }),
      );

      testSideEffect(
        makeSendFlowPreparing({ selectBaseToken: () => null }),
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  status: 'Preparing',
                  accountId: midnightAccount.accountId,
                } as SendFlowSliceState,
              }),
            },
            tokens: {
              selectTokensGroupedByAccount$: cold(''),
            },
            wallets: {
              selectAll$: cold('a', {
                a: [{ accounts: [] } as unknown as AnyWallet],
              }),
            },
            network: {
              selectNetworkType$: cold('a', { a: 'mainnet' as NetworkType }),
              selectBlockchainNetworks$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: sendFlowActions.sendFlow.closed(),
            });
          },
        }),
      );
    });

    it("falls back to the first visible account's blockchainName when requested accountId isn't visible on current network", () => {
      const missingAccountId = AccountId('missing-account');
      const fallbackWallet: AnyWallet = {
        accounts: [cardanoAccount, midnightAccount],
      } as unknown as AnyWallet;

      testSideEffect(
        makeSendFlowPreparing({ selectBaseToken: () => null }),
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  status: 'Preparing',
                  accountId: missingAccountId,
                } as SendFlowSliceState,
              }),
            },
            tokens: {
              selectTokensGroupedByAccount$: cold('ab', {
                a: {},
                b: {
                  [cardanoAccount.accountId]: {
                    fungible: [cardanoToken],
                    nfts: [],
                  },
                  [midnightAccount.accountId]: {
                    fungible: [midnightToken],
                    nfts: [],
                  },
                },
              }),
            },
            wallets: {
              selectAll$: cold('a', { a: [fallbackWallet] }),
            },
            network: {
              selectNetworkType$: cold('a', { a: 'mainnet' as NetworkType }),
              selectBlockchainNetworks$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: sendFlowActions.sendFlow.preparingCompleted({
                form: createFormInitialState({
                  token: cardanoToken,
                }),
                blockchainName: cardanoToken.blockchainName,
                accountId: cardanoToken.accountId,
                wallet: fallbackWallet,
              }),
            });
          },
        }),
      );
    });

    it('picks the first available token once when no initialSelectedToken is provided (take(1) behavior)', () => {
      const w: AnyWallet = {
        accounts: [midnightAccount],
      } as unknown as AnyWallet;

      testSideEffect(
        makeSendFlowPreparing({ selectBaseToken: () => null }),
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  status: 'Preparing',
                  accountId: midnightAccount.accountId,
                } as SendFlowSliceState,
              }),
            },
            tokens: {
              selectTokensGroupedByAccount$: cold('abc', {
                a: {},
                b: {
                  [midnightAccount.accountId]: {
                    fungible: [midnightToken],
                    nfts: [],
                  },
                  [cardanoAccount.accountId]: {
                    fungible: [cardanoToken],
                    nfts: [],
                  },
                },
                c: {
                  [cardanoAccount.accountId]: {
                    fungible: [cardanoToken],
                    nfts: [],
                  },
                },
              }),
            },
            wallets: {
              selectAll$: cold('a', { a: [w] }),
            },
            network: {
              selectNetworkType$: cold('a', { a: 'mainnet' as NetworkType }),
              selectBlockchainNetworks$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: sendFlowActions.sendFlow.preparingCompleted({
                form: createFormInitialState({
                  token: midnightToken,
                }),
                blockchainName: midnightAccount.blockchainName,
                accountId: midnightToken.accountId,
                wallet: w,
              }),
            });
          },
        }),
      );
    });
  });

  describe('makeSendFlowDiscard', () => {
    it('calls "discardTx"', () => {
      const discardTx = vi.fn();

      testSideEffect(
        {
          build: ({ cold }) => {
            discardTx.mockReturnValue(cold('-'));
            return makeSendFlowDiscard({ discardTx });
          },
        },
        ({ cold, expectObservable, flush }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  serializedTx: 'serializedTx',
                  status: 'DiscardingTx',
                } as SendFlowSliceState,
              }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();

            expect(discardTx).toHaveBeenCalledWith(
              {
                serializedTx: 'serializedTx',
              },
              expect.any(Function),
            );
          },
        }),
      );
    });

    it('dispatches "discardingTxCompleted" action', () => {
      testSideEffect(
        {
          build: ({ cold }) =>
            makeSendFlowDiscard({
              discardTx: (_, mapResult) =>
                cold('a', {
                  a: mapResult({
                    success: true,
                  }),
                }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  serializedTx: 'serializedTx',
                  status: 'DiscardingTx',
                } as SendFlowSliceState,
              }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: sendFlowActions.sendFlow.discardingTxCompleted(),
            });
          },
        }),
      );
    });
  });

  describe('makeSendFlowFormDataValidation', () => {
    it('selects "addressValidator" of active blockchain', () => {
      const selectAddressValidator = vi.fn().mockReturnValue(null);
      const activeBlockchainName = 'Midnight' as const;

      testSideEffect(
        {
          build: ({ cold }) =>
            makeSendFlowFormDataValidation({
              addressAliasResolvers: [],
              selectAddressValidator,
              validateForm: () => cold('a', { a: [] }),
            }),
        },
        ({ cold, expectObservable, flush }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  status: 'FormPendingValidation',
                  form: createFormInitialState({
                    token: midnightToken,
                  }),
                  blockchainName: midnightToken.blockchainName,
                  minimumAmount: BigNumber(1n),
                } as SendFlowSliceState,
              }),
            },
            network: {
              selectNetworkType$: cold('a', {
                a: 'testnet' as NetworkType,
              }),
              selectBlockchainNetworks$: cold('a', {
                a: {
                  Midnight: {
                    testnet: BlockchainNetworkId('midnight-preview'),
                    mainnet: BlockchainNetworkId('midnight-mainnet'),
                  },
                },
              }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: expect.anything() as unknown,
            });
            flush();

            expect(selectAddressValidator).toHaveBeenCalledWith(
              activeBlockchainName,
            );
          },
        }),
      );
    });

    it('performs form validation', () => {
      const addressAliasResolvers: AddressAliasResolver[] = [];
      const addressValidator =
        'addressValidator' as unknown as SendFlowAddressValidator;
      const validateForm = vi.fn();
      const form = createFormInitialState({
        token: midnightToken,
      });
      // Use mock logger object
      const logger = dummyLogger;

      testSideEffect(
        {
          build: ({ cold }) => {
            validateForm.mockReturnValue(cold('a', { a: [] }));
            return makeSendFlowFormDataValidation({
              addressAliasResolvers,
              selectAddressValidator: () => addressValidator,
              validateForm,
            });
          },
        },
        ({ cold, expectObservable, flush }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  status: 'FormPendingValidation',
                  blockchainName: 'Midnight',
                  blockchainSpecificData: {},
                  form,
                  minimumAmount: BigNumber(1n),
                } as SendFlowSliceState,
              }),
            },
            network: {
              selectNetworkType$: cold('a', {
                a: 'testnet' as NetworkType,
              }),
              selectBlockchainNetworks$: cold('a', {
                a: {
                  Midnight: {
                    testnet: BlockchainNetworkId('midnight-preview'),
                    mainnet: BlockchainNetworkId('midnight-mainnet'),
                  },
                },
              }),
            },
            walletContext: {
              selectActiveBlockchainName$: cold('a', {
                a: 'Midnight' as const,
              }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: expect.anything() as unknown,
            });
            flush();

            expect(validateForm).toHaveBeenCalledWith({
              blockchainSpecificData: {},
              form,
              addressAliasResolvers,
              addressValidator,
              logger,
              minimumAmount: BigNumber(1n),
              network: 'midnight-preview',
            });
          },
        }),
      );
    });

    it('sends "formValidationCompleted" action with validation result', () => {
      const result: FormValidationResult[] = [];

      testSideEffect(
        {
          build: ({ cold }) =>
            makeSendFlowFormDataValidation({
              addressAliasResolvers: [],
              selectAddressValidator: () => null,
              validateForm: () => cold('a', { a: result }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  status: 'FormPendingValidation',
                  blockchainName: 'Midnight',
                  minimumAmount: BigNumber(1n),
                } as SendFlowSliceState,
              }),
            },
            network: {
              selectNetworkType$: cold('a', {
                a: 'testnet' as NetworkType,
              }),
              selectBlockchainNetworks$: cold('a', {
                a: {
                  Midnight: {
                    testnet: BlockchainNetworkId('midnight-preview'),
                    mainnet: BlockchainNetworkId('midnight-mainnet'),
                  },
                },
              }),
            },
            walletContext: {
              selectActiveBlockchainName$: cold('a', {
                a: 'Midnight' as const,
              }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: sendFlowActions.sendFlow.formValidationCompleted({ result }),
            });
          },
        }),
      );
    });
  });

  describe('makeSendFlowTxBuilding', () => {
    const serializedTx = 'serializedTx';
    const txParams = [
      {
        address: 'address',
        tokenTransfers: [
          {
            normalizedAmount: BigNumber(10n),
            token: midnightToken,
          },
        ],
      },
    ];

    const makeState = ({
      address = txParams[0].address,
      addressError = null,
      resolvedAddress,
    }: {
      address?: string;
      addressError?: string | null;
      resolvedAddress?: string;
    } = {}) =>
      ({
        status: 'FormTxBuilding',
        form: {
          address: {
            dirty: true,
            error: addressError,
            value: address,
            resolvedAddress,
          },
          tokenTransfers: [
            {
              amount: {
                dirty: true,
                error: null,
                value: txParams[0].tokenTransfers[0].normalizedAmount,
              },
              token: {
                value: midnightToken,
              },
            },
          ],
        },
        serializedTx,
        minimumAmount: BigNumber(1n),
      } as unknown as SendFlowSliceState);

    it('triggers build when entering FormTxBuilding state', () => {
      const buildTx = vi.fn();
      const previewTx = vi.fn();
      testSideEffect(
        {
          build: ({ cold }) => {
            buildTx.mockReturnValue(cold(''));
            previewTx.mockReturnValue(cold(''));
            return makeSendFlowTxBuilding({
              buildTx,
              previewTx,
              preview: false,
            });
          },
        },
        ({ cold, expectObservable, flush }) => ({
          actionObservables: {},
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: makeState(),
              }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
            flush();

            expect(buildTx).toHaveBeenCalledWith(
              {
                blockchainName: undefined,
                blockchainSpecificSendFlowData: undefined,
                serializedTx,
                txParams: [
                  {
                    address: txParams[0].address,
                    blockchainSpecific: undefined,
                    tokenTransfers: txParams[0].tokenTransfers,
                  },
                ],
              },
              expect.any(Function),
            );
            expect(previewTx).not.toHaveBeenCalled();
          },
        }),
      );
    });

    it('sends "txBuildResulted" action with build result', () => {
      const txBuildResult: TxBuildResult = {
        fees: [],
        serializedTx: '',
        success: true,
      };

      testSideEffect(
        {
          build: ({ cold }) =>
            makeSendFlowTxBuilding({
              buildTx: (_, mapResult) =>
                cold('a', {
                  a: mapResult(txBuildResult),
                }),
              previewTx: vi.fn().mockReturnValue(cold('')),
              preview: false,
            }),
        },
        ({ cold, expectObservable }) => ({
          actionObservables: {
            sendFlow: {
              formDataChanged$: cold(''),
            },
          },
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: makeState(),
              }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe(`a`, {
              a: sendFlowActions.sendFlow.txBuildResulted({
                result: txBuildResult,
              }),
            });
          },
        }),
      );
    });

    it('uses resolvedAddress when available instead of form value', () => {
      const buildTx = vi.fn();
      const previewTx = vi.fn();
      const userInput = '$handle';
      const resolvedAddr = 'addr1resolved...';

      testSideEffect(
        {
          build: ({ cold }) => {
            buildTx.mockReturnValue(cold(''));
            previewTx.mockReturnValue(cold(''));
            return makeSendFlowTxBuilding({
              buildTx,
              previewTx,
              preview: false,
            });
          },
        },
        ({ cold, expectObservable, flush }) => ({
          actionObservables: {},
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: makeState({
                  address: userInput,
                  resolvedAddress: resolvedAddr,
                }),
              }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
            flush();

            expect(buildTx).toHaveBeenCalledWith(
              expect.objectContaining({
                txParams: [
                  expect.objectContaining({
                    address: resolvedAddr,
                  }),
                ],
              }),
              expect.any(Function),
            );
          },
        }),
      );
    });
  });

  describe('makeSendFlowTxBuilding (preview)', () => {
    const serializedTx = '';

    const formStateBase = ({
      addressError = null as string | null,
      addressValue = 'addr1userinputxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      resolvedAddress,
      token = midnightToken,
      amount = BigNumber(10n),
    }: {
      addressError?: string | null;
      addressValue?: string;
      resolvedAddress?: string;
      token?: Token;
      amount?: BigNumber;
    } = {}) =>
      ({
        status: 'Form' as const,
        accountId: cardanoAccount.accountId,
        blockchainName: cardanoAccount.blockchainName,
        blockchainSpecificData: {},
        serializedTx,
        minimumAmount: BigNumber(1n),
        form: {
          address: {
            dirty: true,
            error: addressError,
            value: addressValue,
            resolvedAddress,
          },
          tokenTransfers: [
            {
              amount: {
                dirty: true,
                error: null,
                value: amount,
              },
              token: { value: token },
            },
          ],
        },
        wallet: {} as AnyWallet,
        confirmButtonEnabled: false,
        fees: [],
      } as unknown as SendFlowSliceState);

    it('triggers preview build when entering Form state', () => {
      const buildTx = vi.fn();
      const previewTx = vi.fn();
      testSideEffect(
        {
          build: ({ cold }) => {
            buildTx.mockReturnValue(cold(''));
            previewTx.mockReturnValue(cold(''));
            return makeSendFlowTxBuilding({
              buildTx,
              previewTx,
              preview: true,
            });
          },
        },
        ({ cold, expectObservable, flush }) => ({
          actionObservables: {},
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: formStateBase(),
              }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
            flush();
            expect(previewTx).toHaveBeenCalledTimes(1);
            expect(previewTx).toHaveBeenCalledWith(
              expect.objectContaining({
                accountId: cardanoAccount.accountId,
                blockchainName: cardanoAccount.blockchainName,
                serializedTx,
              }),
              expect.any(Function),
            );
            expect(buildTx).not.toHaveBeenCalled();
          },
        }),
      );
    });

    it('uses empty payment address when the form address has a validation error', () => {
      const buildTx = vi.fn();
      const previewTx = vi.fn();
      testSideEffect(
        {
          build: ({ cold }) => {
            buildTx.mockReturnValue(cold(''));
            previewTx.mockReturnValue(cold(''));
            return makeSendFlowTxBuilding({
              buildTx,
              previewTx,
              preview: true,
            });
          },
        },
        ({ cold, expectObservable, flush }) => ({
          actionObservables: {},
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: formStateBase({
                  addressError: 'v2.send-flow.form.errors.address.invalid',
                  addressValue: 'not-a-valid-addr',
                }),
              }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
            flush();
            expect(previewTx).toHaveBeenCalledWith(
              expect.objectContaining({
                txParams: [
                  expect.objectContaining({
                    address: '',
                  }),
                ],
              }),
              expect.any(Function),
            );
          },
        }),
      );
    });

    it('passes lovelace transfer amount through unchanged in preview build', () => {
      const buildTx = vi.fn();
      const previewTx = vi.fn();
      testSideEffect(
        {
          build: ({ cold }) => {
            buildTx.mockReturnValue(cold(''));
            previewTx.mockReturnValue(cold(''));
            return makeSendFlowTxBuilding({
              buildTx,
              previewTx,
              preview: true,
            });
          },
        },
        ({ cold, expectObservable, flush }) => ({
          actionObservables: {},
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: formStateBase({
                  token: lovelaceToken,
                  amount: BigNumber(0n),
                }),
              }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
            flush();
            expect(previewTx).toHaveBeenCalledWith(
              expect.objectContaining({
                txParams: [
                  expect.objectContaining({
                    tokenTransfers: [
                      expect.objectContaining({
                        normalizedAmount: BigNumber(0n),
                        token: lovelaceToken,
                      }),
                    ],
                  }),
                ],
              }),
              expect.any(Function),
            );
          },
        }),
      );
    });
  });

  describe('makeSendFlowAwaitingConfirmation', () => {
    it('calls "confirmTx"', () => {
      const confirmTx = vi.fn();

      testSideEffect(
        {
          build: ({ cold }) => {
            confirmTx.mockReturnValue(cold('-'));
            return makeSendFlowAwaitingConfirmation({
              confirmTx,
            });
          },
        },
        ({ cold, expectObservable, flush }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  serializedTx: 'serializedTx',
                  status: 'SummaryAwaitingConfirmation',
                } as SendFlowSliceState,
              }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();

            expect(confirmTx).toHaveBeenCalledWith(
              {
                serializedTx: 'serializedTx',
              },
              expect.any(Function),
            );
          },
        }),
      );
    });

    it('sends "confirmationCompleted" with confirmation result', () => {
      testSideEffect(
        {
          build: ({ cold }) =>
            makeSendFlowAwaitingConfirmation({
              confirmTx: (_, mapResult) =>
                cold('a', {
                  a: mapResult({
                    success: true,
                    serializedTx: 'serializedTx',
                  }),
                }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  status: 'SummaryAwaitingConfirmation',
                } as SendFlowSliceState,
              }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: sendFlowActions.sendFlow.confirmationCompleted({
                result: {
                  success: true,
                  serializedTx: 'serializedTx',
                },
              }),
            });
          },
        }),
      );
    });
  });

  describe('makeSendFlowProcessing', () => {
    it('triggers tx execution', () => {
      const submitTx = vi.fn();
      const serializedTx = 'serializedTx';

      testSideEffect(
        {
          build: ({ cold }) => {
            submitTx.mockReturnValue(cold('-'));
            return makeSendFlowProcessing({
              submitTx,
            });
          },
        },
        ({ cold, expectObservable, flush }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  accountId: midnightAccount.accountId,
                  blockchainName: midnightAccount.blockchainName,
                  blockchainSpecificData: {},
                  confirmButtonEnabled: false,
                  status: 'Processing',
                  form: {
                    address: {
                      dirty: true,
                      error: null,
                      value: 'test address',
                    },
                    tokenTransfers: [
                      {
                        amount: {
                          dirty: true,
                          error: null,
                          value: BigNumber(10n),
                        },
                        token: {
                          value: midnightToken,
                        },
                      },
                    ],
                  },
                  fees: [],
                  minimumAmount: BigNumber(1n),
                  serializedTx,
                  wallet: {} as AnyWallet,
                } satisfies SendFlowSliceState & { status: 'Processing' },
              }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();

            expect(submitTx).toHaveBeenCalledWith(
              {
                accountId: midnightAccount.accountId,
                serializedTx,
                blockchainName: 'Midnight',
                blockchainSpecificSendFlowData: {},
              },
              expect.any(Function),
            );
          },
        }),
      );
    });

    it('sends "processingResulted" with the result', () => {
      const txId = 'test tx id';
      const testAccountId = AccountId('test-account');
      // Mock Date.now for deterministic timestamp
      const mockTimestamp = 1700000000000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      testSideEffect(
        {
          build: ({ cold }) =>
            makeSendFlowProcessing({
              submitTx: (_, mapResult) =>
                cold('a', {
                  a: mapResult({ success: true, txId }),
                }),
            }),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  accountId: testAccountId,
                  form: {
                    address: {
                      value: 'address',
                    },
                    tokenTransfers: [
                      {
                        amount: {
                          value: BigNumber(1n),
                        },
                        token: {
                          value: midnightToken,
                        },
                      },
                    ],
                  },
                } as unknown as SendFlowSliceState,
              }),
            },
          },
          dependencies: {
            actions: { ...sendFlowActions, ...activitiesActions },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: activitiesActions.activities.upsertActivities({
                accountId: testAccountId,
                activities: [
                  {
                    accountId: testAccountId,
                    activityId: txId,
                    timestamp: Timestamp(mockTimestamp),
                    tokenBalanceChanges: [
                      {
                        tokenId: midnightToken.tokenId,
                        amount: BigNumber(-1n),
                      },
                    ],
                    type: ActivityType.Pending,
                  },
                ],
              }),
              b: sendFlowActions.sendFlow.processingResulted({
                result: {
                  success: true,
                  txId,
                },
              }),
            });
          },
        }),
      );

      vi.restoreAllMocks();
    });
  });

  describe('makeTrackSendFlowAuthenticationConfirmation', () => {
    it('listens to successful auth confirmation action to track analytics event without enhancer', () => {
      const mockSelectAnalyticsEnhancer = vi.fn().mockReturnValue(null);

      testSideEffect(
        makeTrackSendFlowAuthenticationConfirmation({
          selectAnalyticsEnhancer: mockSelectAnalyticsEnhancer,
        }),
        ({ cold, expectObservable }) => ({
          dependencies: {
            actions: analyticsActions,
            logger,
          },
          actionObservables: {
            sendFlow: {
              confirmationCompleted$: cold('a-b', {
                a: sendFlowActions.sendFlow.confirmationCompleted({
                  result: {
                    success: true,
                    serializedTx: 'serializedTx',
                  },
                }),
                b: sendFlowActions.sendFlow.confirmationCompleted({
                  result: {
                    success: false,
                    errorTranslationKeys: {} as TxErrorTranslationKeys,
                  },
                }),
              }),
            },
          },
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  blockchainName: 'Cardano',
                  confirmButtonEnabled: true,
                  fees: [],
                  serializedTx: 'serialized-tx',
                  form: {
                    address: { value: 'test-address' },
                    amount: { value: BigNumber(10n) },
                    token: { value: cardanoToken },
                  },
                } as unknown as SendFlowSliceState,
              }),
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: analyticsActions.analytics.trackEvent({
                eventName: 'send | transaction confirmation | confirm | press',
              }),
            });
          },
        }),
      );
    });

    it('listens to successful auth confirmation action to track analytics event with enhancer', () => {
      testSideEffect(
        {
          build: ({ cold }) => {
            return makeTrackSendFlowAuthenticationConfirmation({
              selectAnalyticsEnhancer: vi.fn().mockReturnValue({
                getTransactionAnalyticsPayload: vi.fn().mockReturnValue(
                  cold('a', {
                    a: {
                      transactionType: 'shielded',
                    },
                  }),
                ),
              }),
            });
          },
        },
        ({ cold, expectObservable }) => ({
          dependencies: {
            actions: analyticsActions,
            logger,
          },
          stateObservables: {
            sendFlow: {
              selectSendFlowState$: cold('a', {
                a: {
                  status: 'Processing',
                  blockchainName: 'Midnight',
                  confirmButtonEnabled: true,
                  fees: [],
                  serializedTx: 'serialized-tx',
                  form: {
                    address: { value: 'test-address' },
                    tokenTransfers: [
                      {
                        amount: { value: BigNumber(10n) },
                        token: { value: midnightToken },
                      },
                    ],
                  },
                } as unknown as SendFlowSliceState,
              }),
            },
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: analyticsActions.analytics.trackEvent({
                eventName: 'send | transaction confirmation | confirm | press',
                payload: {
                  transactionType: 'shielded',
                },
              }),
            });
          },
        }),
      );
    });
  });

  describe('syncSendFlowFeatureFlagPayload', () => {
    it('should ignore null emissions from selectNextFeatureFlags', () => {
      testSideEffect(
        syncSendFlowFeatureFlagPayload,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            features: {
              selectLoadedFeatures$: cold('a', {
                a: {
                  modules: [],
                  featureFlags: [
                    {
                      key: FEATURE_FLAG_SEND_FLOW,
                      payload: {
                        Midnight: { mainnet: false, testnet: true },
                      },
                    },
                  ],
                },
              }),
              selectNextFeatureFlags$: cold('a', { a: null }),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            // Only loaded features should produce actions, null from next is ignored
            expectObservable(sideEffect$).toBe('a', {
              a: sendFlowActions.sendFlowConfig.setFeatureFlagPayload({
                Midnight: { mainnet: false, testnet: true },
              }),
            });
          },
        }),
      );
    });

    it('syncs payload from loadedFeatures', () => {
      testSideEffect(
        syncSendFlowFeatureFlagPayload,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            features: {
              selectLoadedFeatures$: cold('a', {
                a: {
                  modules: [],
                  featureFlags: [
                    {
                      key: FEATURE_FLAG_SEND_FLOW,
                      payload: {
                        Midnight: { mainnet: false, testnet: true },
                      },
                    },
                  ],
                },
              }),
              selectNextFeatureFlags$: cold('|'),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: sendFlowActions.sendFlowConfig.setFeatureFlagPayload({
                Midnight: { mainnet: false, testnet: true },
              }),
            });
          },
        }),
      );
    });

    it('returns empty object when flag has no payload', () => {
      testSideEffect(
        syncSendFlowFeatureFlagPayload,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            features: {
              selectLoadedFeatures$: cold('a', {
                a: {
                  modules: [],
                  featureFlags: [{ key: FEATURE_FLAG_SEND_FLOW }],
                },
              }),
              selectNextFeatureFlags$: cold('|'),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: sendFlowActions.sendFlowConfig.setFeatureFlagPayload({}),
            });
          },
        }),
      );
    });

    it('returns empty object when flag does not exist', () => {
      testSideEffect(
        syncSendFlowFeatureFlagPayload,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            features: {
              selectLoadedFeatures$: cold('a', {
                a: { modules: [], featureFlags: [] },
              }),
              selectNextFeatureFlags$: cold('|'),
            },
          },
          dependencies: {
            actions: sendFlowActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: sendFlowActions.sendFlowConfig.setFeatureFlagPayload({}),
            });
          },
        }),
      );
    });
  });
});
