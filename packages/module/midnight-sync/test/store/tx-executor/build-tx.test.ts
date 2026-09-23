import { createTestScheduler } from '@cardano-sdk/util-dev';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { TokenId } from '@lace-contract/tokens';
import { genericErrorResults } from '@lace-contract/tx-executor';
import { BigNumber } from '@lace-lib/util';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import {
  MidnightBech32m,
  UnshieldedAddress,
} from '@midnightntwrk/wallet-sdk-address-format';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import {
  constructShieldedTransaction,
  makeBuildTx,
  buildTxDependencies,
} from '../../../src/store/tx-executor/build-tx';

import type {
  MidnightWalletsByAccountId,
  MidnightWallet,
  MidnightSpecificTokenMetadata,
  MidnightSpecificSendFlowData,
} from '@lace-contract/midnight-context';
import type {
  BuildTxParams,
  TxParamsBundle,
} from '@lace-contract/tx-executor/src/types';
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

  it('emits a generic build error when there are no token transfers', () => {
    prepare(({ expectObservable }, { buildTxParams, wallet$ }) => {
      const emptyParams = {
        ...buildTxParams,
        txParams: [{ ...buildTxParams.txParams[0], tokenTransfers: [] }],
      } as unknown as BuildTxParams<
        MidnightSpecificSendFlowData,
        MidnightSpecificTokenMetadata
      >;

      expectObservable(
        makeBuildTx(wallet$, buildTxDependencies, { logger: dummyLogger })(
          emptyParams,
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

describe('multi-token transfers (LW-15154)', () => {
  const TOKEN_A = TokenId('a'.repeat(64));
  const TOKEN_B = TokenId('b'.repeat(64));

  const transfer = (
    tokenId: TokenId,
    amount: bigint,
    kind: 'shielded' | 'unshielded' = 'shielded',
  ) => ({
    token: {
      address: stubData.midnightShieldedAddress,
      accountId: stubData.accountId,
      available: BigNumber(1_000n),
      blockchainName: 'Midnight' as const,
      decimals: 0,
      displayLongName: '',
      displayShortName: '',
      pending: BigNumber(0n),
      tokenId,
      metadata: {
        blockchainSpecific: { kind },
        decimals: 0,
      },
    },
    normalizedAmount: BigNumber(amount),
  });

  const twoTokenParams = [
    {
      address: stubData.midnightShieldedAddress,
      tokenTransfers: [transfer(TOKEN_A, 5n), transfer(TOKEN_B, 7n)],
    },
  ] as const;

  it('serialises every transfer, not only the first', () => {
    const serialized = buildTxDependencies.serialiseTx(twoTokenParams);

    const parsed = JSON.parse(
      Buffer.from(serialized, 'hex').toString('utf8'),
    ) as { transfers: { amount: string; type: string }[] };

    expect(parsed.transfers).toEqual([
      expect.objectContaining({ amount: '5', type: TOKEN_A }),
      expect.objectContaining({ amount: '7', type: TOKEN_B }),
    ]);
  });

  it('builds a shielded transaction with an output and value delta per token', () => {
    const transaction = buildTxDependencies.buildTransaction({
      blockchainSpecificSendFlowData: { flowType: 'send' },
      networkId: stubData.networkId,
      nightUtxos: [],
      nightVerifyingKey: undefined as unknown as ledger.SignatureVerifyingKey,
      txParams: twoTokenParams,
    });

    const offer = (
      transaction as unknown as {
        guaranteedOffer: {
          outputs: unknown[];
          deltas: Map<string, bigint>;
        };
      }
    ).guaranteedOffer;

    expect(offer.outputs).toHaveLength(2);
    expect(offer.deltas.get(TOKEN_A)).toBe(-5n);
    expect(offer.deltas.get(TOKEN_B)).toBe(-7n);
  });

  it('builds an unshielded transaction with an output per token, stripping the unshielded token prefix', () => {
    const RAW_A = 'a'.repeat(64);
    const RAW_B = 'b'.repeat(64);

    const transaction = buildTxDependencies.buildTransaction({
      blockchainSpecificSendFlowData: { flowType: 'send' },
      networkId: stubData.networkId,
      nightUtxos: [],
      nightVerifyingKey: undefined as unknown as ledger.SignatureVerifyingKey,
      txParams: [
        {
          address: stubData.midnightUnshieldedAddress,
          tokenTransfers: [
            transfer(
              TokenId(`unshielded-${stubData.networkId}${RAW_A}`),
              5n,
              'unshielded',
            ),
            transfer(
              TokenId(`unshielded-${stubData.networkId}${RAW_B}`),
              7n,
              'unshielded',
            ),
          ],
        },
      ] as const,
    });

    const receiver = UnshieldedAddress.codec
      .decode(
        stubData.networkId,
        MidnightBech32m.parse(stubData.midnightUnshieldedAddress),
      )
      .data.toString('hex');
    const offers = [
      ...(
        transaction as unknown as {
          intents: Map<
            number,
            {
              guaranteedUnshieldedOffer: {
                outputs: { value: bigint; owner: string; type: string }[];
              };
            }
          >;
        }
      ).intents.values(),
    ].map(({ guaranteedUnshieldedOffer }) => guaranteedUnshieldedOffer);

    expect(offers).toHaveLength(1);
    expect(offers[0].outputs).toEqual([
      { value: 5n, owner: receiver, type: RAW_A },
      { value: 7n, owner: receiver, type: RAW_B },
    ]);
  });

  it('rejects a bundle that contains no token transfers', () => {
    expect(() =>
      buildTxDependencies.buildTransaction({
        blockchainSpecificSendFlowData: { flowType: 'send' },
        networkId: stubData.networkId,
        nightUtxos: [],
        nightVerifyingKey: undefined as unknown as ledger.SignatureVerifyingKey,
        // The tuple type forbids an empty bundle; the runtime guard covers
        // payloads that bypass it (deserialized or externally sourced).
        txParams: [
          {
            address: stubData.midnightShieldedAddress,
            tokenTransfers: [],
          },
        ] as unknown as TxParamsBundle<MidnightSpecificTokenMetadata>,
      }),
    ).toThrow('At least one token transfer is required');
  });

  it('constructShieldedTransaction rejects an empty transfer list', () => {
    expect(() =>
      constructShieldedTransaction({
        networkId: stubData.networkId,
        transfers: [],
      }),
    ).toThrow('At least one token transfer is required');
  });

  it('rejects mixing shielded and unshielded transfers in one transaction', () => {
    expect(() =>
      buildTxDependencies.buildTransaction({
        blockchainSpecificSendFlowData: { flowType: 'send' },
        networkId: stubData.networkId,
        nightUtxos: [],
        nightVerifyingKey: undefined as unknown as ledger.SignatureVerifyingKey,
        txParams: [
          {
            address: stubData.midnightShieldedAddress,
            tokenTransfers: [
              transfer(TOKEN_A, 5n),
              transfer(TOKEN_B, 7n, 'unshielded'),
            ],
          },
        ] as const,
      }),
    ).toThrow(/[Mm]ixed/);
  });

  it('rejects a transfer whose token has no metadata', () => {
    const metadatalessTransfer = transfer(TOKEN_B, 7n);
    expect(() =>
      buildTxDependencies.serialiseTx([
        {
          address: stubData.midnightShieldedAddress,
          tokenTransfers: [
            transfer(TOKEN_A, 5n),
            {
              ...metadatalessTransfer,
              token: { ...metadatalessTransfer.token, metadata: undefined },
            },
          ],
        },
      ] as const),
    ).toThrow(/metadata/i);
  });
});
