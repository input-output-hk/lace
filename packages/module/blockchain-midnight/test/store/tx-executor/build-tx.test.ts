import { createTestScheduler } from '@cardano-sdk/util-dev';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { TokenId } from '@lace-contract/tokens';
import { genericErrorResults } from '@lace-contract/tx-executor';
import { BigNumber } from '@lace-sdk/util';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import {
  makeBuildTx,
  buildTxDependencies,
} from '../../../src/store/tx-executor/build-tx';

import type {
  MidnightWalletsByAccountId,
  MidnightWallet,
  MidnightSpecificTokenMetadata,
  MidnightSpecificSendFlowData,
} from '@lace-contract/midnight-context';
import type { BuildTxParams } from '@lace-contract/tx-executor/src/types';
import type { Observable } from 'rxjs';
import type { RunHelpers } from 'rxjs/testing';

const prepare = (
  callback: (
    helpers: RunHelpers,
    testData: {
      buildTxParams: BuildTxParams<
        MidnightSpecificSendFlowData,
        MidnightSpecificTokenMetadata
      >;
      createWallet: (params?: {
        dustWalletBalance?: bigint;
        areKeysAvailable?: boolean;
      }) => MidnightWallet;
      createWallet$: (
        wallet: MidnightWallet,
      ) => Observable<MidnightWalletsByAccountId>;
      expectAnyObservable: (params?: {
        dependencies?: Partial<typeof buildTxDependencies>;
      }) => void;
      wallet$: Observable<MidnightWalletsByAccountId>;
      wallet: MidnightWallet;
    },
  ) => void,
) => {
  createTestScheduler().run(helpers => {
    const buildTxParams: BuildTxParams<
      MidnightSpecificSendFlowData,
      MidnightSpecificTokenMetadata
    > = {
      accountId: stubData.accountId,
      serializedTx: '',
      blockchainName: 'Midnight' as const,
      blockchainSpecificSendFlowData: {
        flowType: 'send',
      },
      txParams: [
        {
          address: stubData.midnightShieldedAddress,
          tokenTransfers: [
            {
              token: {
                address: stubData.midnightShieldedAddress,
                accountId: stubData.accountId,
                available: BigNumber(2n),
                blockchainName: 'Midnight' as const,
                decimals: 0,
                displayLongName: '',
                displayShortName: '',
                pending: BigNumber(0n),
                tokenId: TokenId(
                  '0000000000000000000000000000000000000000000000000000000000000000',
                ),
                metadata: {
                  blockchainSpecific: {
                    kind: 'shielded',
                  },
                  decimals: 0,
                },
              },
              normalizedAmount: BigNumber(100n),
            },
          ],
        },
      ] as const,
    };

    const { cold, expectObservable } = helpers;

    const createWallet = ({
      dustWalletBalance = 1n,
      areKeysAvailable = true,
    }: { dustWalletBalance?: bigint; areKeysAvailable?: boolean } = {}) =>
      ({
        accountId: stubData.accountId,
        networkId: stubData.networkId,
        state: vi.fn().mockReturnValue(
          cold('a', {
            a: {
              dust: { balance: () => dustWalletBalance },
              unshielded: { availableCoins: [] },
            },
          }),
        ),
        areKeysAvailable$: cold('a', { a: areKeysAvailable }),
        calculateTransactionFee: vi.fn().mockReturnValue(cold('a', { a: 1n })),
        estimateTransactionFee: vi.fn().mockReturnValue(cold('a', { a: 1n })),
      } as unknown as MidnightWallet);
    const createWallet$ = (wallet: MidnightWallet) =>
      cold<MidnightWalletsByAccountId>('a', {
        a: { [wallet.accountId]: wallet },
      });

    const wallet = createWallet();
    const wallet$ = createWallet$(wallet);

    const expectAnyObservable = ({
      dependencies,
    }: {
      dependencies?: Partial<typeof buildTxDependencies>;
    } = {}) => {
      expectObservable(
        makeBuildTx(
          wallet$,
          { ...buildTxDependencies, ...dependencies },
          { logger: dummyLogger },
        )(buildTxParams),
      ).toBe('a', {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        a: expect.anything(),
      });
    };

    callback(helpers, {
      buildTxParams,
      createWallet,
      createWallet$,
      expectAnyObservable,
      wallet$,
      wallet,
    });
  });
};

describe('blockchain-midnight build-tx', () => {
  it('emits result with fees and serialized tx', () => {
    const serialiseTx = vi.fn().mockReturnValue('serialised tx');
    prepare(({ expectObservable }, { buildTxParams, wallet$ }) => {
      expectObservable(
        makeBuildTx(
          wallet$,
          { ...buildTxDependencies, serialiseTx },
          { logger: dummyLogger },
        )(buildTxParams),
      ).toBe('a', {
        a: {
          fees: [{ amount: BigNumber(1n), tokenId: ledger.feeToken().tag }],
          serializedTx: 'serialised tx',
          success: true,
        },
      });
    });
  });

  it('emits an error if midnight wallet is not available', () => {
    prepare(({ cold, expectObservable }, { buildTxParams }) => {
      const wallet$ = cold<MidnightWalletsByAccountId>('a', { a: {} });
      expectObservable(
        makeBuildTx(wallet$, buildTxDependencies, { logger: dummyLogger })(
          buildTxParams,
        ),
      ).toBe('(a|)', {
        a: genericErrorResults.buildTx(),
      });
    });
  });

  it('emits an error if tx discarding previous transactions failed', () => {
    const error = new Error('Test error');
    prepare(({ expectObservable }, { buildTxParams, wallet$ }) => {
      const discardTx = vi.fn().mockImplementation(() => {
        throw error;
      });
      expectObservable(
        makeBuildTx(
          wallet$,
          { ...buildTxDependencies, discardTx },
          { logger: dummyLogger },
        )(buildTxParams),
      ).toBe('(a|)', {
        a: genericErrorResults.buildTx({ error }),
      });
    });
  });

  it('emits an error if building tx failed', () => {
    const error = new Error('Test error');
    prepare(({ expectObservable }, { buildTxParams, wallet$ }) => {
      const buildTransaction = vi.fn().mockImplementation(() => {
        throw error;
      });
      expectObservable(
        makeBuildTx(
          wallet$,
          { ...buildTxDependencies, buildTransaction },
          { logger: dummyLogger },
        )(buildTxParams),
      ).toBe('(a|)', {
        a: genericErrorResults.buildTx({ error }),
      });
    });
  });

  it('calculates fee', () => {
    prepare(({ flush }, { expectAnyObservable, wallet }) => {
      const buildTransaction = vi.fn().mockReturnValue('built tx');

      expectAnyObservable({ dependencies: { buildTransaction } });
      flush();
      expect(wallet.estimateTransactionFee).toHaveBeenCalledWith(
        'built tx',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.objectContaining({ currentTime: expect.any(Date) }),
      );
    });
  });

  it('falls back to calculateTransactionFee when keys are locked', () => {
    prepare(
      (
        { expectObservable, flush },
        { buildTxParams, createWallet, createWallet$ },
      ) => {
        const buildTransaction = vi.fn().mockReturnValue('built tx');
        const wallet = createWallet({ areKeysAvailable: false });
        const wallet$ = createWallet$(wallet);

        expectObservable(
          makeBuildTx(
            wallet$,
            { ...buildTxDependencies, buildTransaction },
            { logger: dummyLogger },
          )(buildTxParams),
        ).toBe('a', {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          a: expect.anything(),
        });

        flush();
        expect(wallet.calculateTransactionFee).toHaveBeenCalledWith('built tx');
        expect(wallet.estimateTransactionFee).not.toHaveBeenCalled();
      },
    );
  });

  it('hardcodes fee to 0 for designation flow if no designation has been made yet', () => {
    const buildTransaction = vi.fn().mockReturnValue('built tx');
    prepare(
      (
        { expectObservable, flush },
        { buildTxParams, createWallet, createWallet$ },
      ) => {
        const wallet = createWallet({ dustWalletBalance: 0n });
        const wallet$ = createWallet$(wallet);

        expectObservable(
          makeBuildTx(
            wallet$,
            { ...buildTxDependencies, buildTransaction },
            { logger: dummyLogger },
          )({
            ...buildTxParams,
            blockchainSpecificSendFlowData: {
              flowType: 'dust-designation',
            },
          }),
        ).toBe('(a|)', {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          a: expect.objectContaining({
            fees: [{ amount: BigNumber(0n), tokenId: ledger.feeToken().tag }],
          }),
        });
        flush();
        expect(wallet.estimateTransactionFee).not.toHaveBeenCalled();
      },
    );
  });

  it('returns success with warning when calculated fee exceeds balance', () => {
    const serialiseTx = vi.fn().mockReturnValue('serialised tx');
    prepare(
      (
        { expectObservable },
        { buildTxParams, createWallet, createWallet$ },
      ) => {
        // Balance is 0n, but estimateTransactionFee returns 1n by default
        const wallet = createWallet({ dustWalletBalance: 0n });
        const wallet$ = createWallet$(wallet);

        expectObservable(
          makeBuildTx(
            wallet$,
            { ...buildTxDependencies, serialiseTx },
            { logger: dummyLogger },
          )(buildTxParams),
        ).toBe('a', {
          a: {
            fees: [{ amount: BigNumber(1n), tokenId: ledger.feeToken().tag }],
            serializedTx: 'serialised tx',
            success: true,
            warningTranslationKey:
              'tx-executor.building-error.insufficient-dust',
          },
        });
      },
    );
  });

  it('succeeds without warning when fee equals dust balance', () => {
    const serialiseTx = vi.fn().mockReturnValue('serialised tx');
    prepare(
      (
        { expectObservable },
        { buildTxParams, createWallet, createWallet$ },
      ) => {
        // Balance equals the fee (1n by default)
        const wallet = createWallet({ dustWalletBalance: 1n });
        const wallet$ = createWallet$(wallet);

        expectObservable(
          makeBuildTx(
            wallet$,
            { ...buildTxDependencies, serialiseTx },
            { logger: dummyLogger },
          )(buildTxParams),
        ).toBe('a', {
          a: {
            fees: [{ amount: BigNumber(1n), tokenId: ledger.feeToken().tag }],
            serializedTx: 'serialised tx',
            success: true,
            warningTranslationKey: undefined,
          },
        });
      },
    );
  });
});
