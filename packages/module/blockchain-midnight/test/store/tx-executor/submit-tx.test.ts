import { createTestScheduler } from '@cardano-sdk/util-dev';
import { genericErrorResults } from '@lace-contract/tx-executor';
import { ByteArray, HexBytes } from '@lace-sdk/util';
import * as ledgerV6 from '@midnight-ntwrk/ledger-v8';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import { makeSubmitTx } from '../../../src/store/tx-executor/submit-tx';

import type {
  MidnightAccountId,
  MidnightWalletsByAccountId,
  MidnightWallet,
} from '@lace-contract/midnight-context';
import type { Observable } from 'rxjs';
import type { RunHelpers } from 'rxjs/testing';
import type { Mock } from 'vitest';

const testAccountId = 'test-account-id' as MidnightAccountId;

vi.mock('@midnight-ntwrk/ledger-v8', async () => {
  const actual: typeof ledgerV6 = await vi.importActual(
    '@midnight-ntwrk/ledger-v8',
  );

  return {
    ...actual,
    Transaction: Object.assign({}, actual.Transaction, {
      deserialize: vi.fn(),
    }),
  };
});

type MockWallet = MidnightWallet & {
  submitTransaction: Mock<MidnightWallet['submitTransaction']>;
};

type Results = Record<'deserialize' | 'submitTransaction', string>;

const prepare = (
  callback: (
    helpers: RunHelpers,
    testData: {
      expectAnyObservable: () => void;
      results: Results;
      serializedTx: string;
      transactionDeserializeMock: Mock;
      wallet: MockWallet;
      wallet$: Observable<MidnightWalletsByAccountId>;
    },
  ) => void,
) => {
  createTestScheduler().run(helpers => {
    const results: Results = {
      deserialize: 'UnprovenTx',
      submitTransaction: 'txId',
    };

    const serializedTx = '';

    const transactionDeserializeMock = vi.mocked(
      ledgerV6.Transaction.deserialize,
    );
    transactionDeserializeMock.mockReturnValue(
      results.deserialize as unknown as ledgerV6.UnprovenTransaction,
    );

    const { cold, expectObservable } = helpers;
    const wallet = {
      accountId: testAccountId,
      submitTransaction: vi.fn().mockReturnValue(
        cold('a', {
          a: results.submitTransaction,
        }),
      ),
    } as unknown as MockWallet;

    const wallet$ = cold<MidnightWalletsByAccountId>('a', {
      a: { [testAccountId]: wallet },
    });

    const expectAnyObservable = () => {
      expectObservable(
        makeSubmitTx(wallet$, { logger: dummyLogger })({
          blockchainName: 'Midnight' as const,
          accountId: testAccountId,
          blockchainSpecificSendFlowData: {
            flowType: 'send',
          },
          serializedTx,
        }),
      ).toBe('a', {
        a: expect.anything() as unknown,
      });
    };

    callback(helpers, {
      expectAnyObservable,
      transactionDeserializeMock,
      results,
      serializedTx,
      wallet,
      wallet$,
    });
  });
};

describe('blockchain-midnight submitTx', () => {
  it('deserializes provided tx', () => {
    prepare(
      (
        { flush },
        { expectAnyObservable, serializedTx, transactionDeserializeMock },
      ) => {
        expectAnyObservable();
        flush();

        expect(transactionDeserializeMock).toHaveBeenCalledWith(
          'signature',
          'proof',
          'binding',
          ByteArray.fromHex(HexBytes(serializedTx)),
        );
      },
    );
  });

  it('calls submitTransaction with deserialized transaction', () => {
    prepare(({ flush }, { expectAnyObservable, results, wallet }) => {
      expectAnyObservable();
      flush();

      expect(wallet.submitTransaction).toHaveBeenCalledWith(
        results.deserialize,
      );
    });
  });

  it('emits result with txId', () => {
    prepare(({ expectObservable }, { wallet$ }) => {
      expectObservable(
        makeSubmitTx(wallet$, { logger: dummyLogger })({
          blockchainName: 'Midnight' as const,
          accountId: testAccountId,
          blockchainSpecificSendFlowData: {
            flowType: 'send',
          },
          serializedTx: '',
        }),
      ).toBe('a', {
        a: {
          success: true,
          txId: 'txId',
        },
      });
    });
  });

  it('emits an error if midnight wallet is not available', () => {
    prepare(({ cold, expectObservable }) => {
      const wallet$ = cold<MidnightWalletsByAccountId>('a', { a: {} });
      expectObservable(
        makeSubmitTx(wallet$, { logger: dummyLogger })({
          blockchainName: 'Midnight' as const,
          accountId: testAccountId,
          blockchainSpecificSendFlowData: {
            flowType: 'send',
          },
          serializedTx: '',
        }),
      ).toBe('(a|)', {
        a: {
          ...genericErrorResults.submitTx(),
          /* eslint-disable @typescript-eslint/no-unsafe-assignment */
          error: expect.objectContaining({
            message: expect.stringContaining('Could not load midnight wallet'),
          }),
          /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        },
      });
    });
  });

  it('emits an error if tx deserialization failed', () => {
    prepare(
      (
        { expectObservable },
        { transactionDeserializeMock, serializedTx, wallet$ },
      ) => {
        const error = new Error('Test error');
        transactionDeserializeMock.mockImplementation(() => {
          throw error;
        });
        expectObservable(
          makeSubmitTx(wallet$, { logger: dummyLogger })({
            accountId: testAccountId,
            blockchainName: 'Midnight' as const,
            blockchainSpecificSendFlowData: {
              flowType: 'send',
            },
            serializedTx,
          }),
        ).toBe('(a|)', {
          a: genericErrorResults.submitTx({ error }),
        });
      },
    );
  });

  it('emits an error if submitTransaction failed', () => {
    prepare(({ cold, expectObservable }, { serializedTx, wallet, wallet$ }) => {
      const error = new Error('Test error');
      wallet.submitTransaction.mockReturnValue(cold('#', {}, error));
      expectObservable(
        makeSubmitTx(wallet$, { logger: dummyLogger })({
          blockchainName: 'Midnight' as const,
          accountId: testAccountId,
          blockchainSpecificSendFlowData: {
            flowType: 'send',
          },
          serializedTx,
        }),
      ).toBe('(a|)', {
        a: genericErrorResults.submitTx({ error }),
      });
    });
  });
});
