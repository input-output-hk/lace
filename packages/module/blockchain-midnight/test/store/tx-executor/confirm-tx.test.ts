import { createTestScheduler } from '@cardano-sdk/util-dev';
import { getTestAuthSecretDeps } from '@lace-contract/authentication-prompt';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { HexBytes } from '@lace-sdk/util';
import { describe, expect, test, vi } from 'vitest';

import { makeConfirmTx } from '../../../src/store/tx-executor/confirm-tx';

import type {
  MidnightSignerContext,
  MidnightSpecificSendFlowData,
  MidnightSpecificSendFlowType,
} from '@lace-contract/midnight-context';
import type { SideEffectDependencies } from '@lace-contract/module';
import type { SignerFactory } from '@lace-contract/signer';
import type { ConfirmTxParams } from '@lace-contract/tx-executor/src/types';
import type { RunHelpers } from 'rxjs/testing';

const mockSignerSign = vi.fn();
const mockCreateTransactionSigner = vi
  .fn()
  .mockReturnValue({ sign: mockSignerSign });

vi.mock('@lace-lib/util-store', async () => ({
  ...(await vi.importActual('@lace-lib/util-store')),
  serializeError: ({ message }: Error) => ({ message }),
}));

const mockSignerFactory = {
  createTransactionSigner: mockCreateTransactionSigner,
} as unknown as SignerFactory;

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

const createConfirmTxParams = (
  flowType: MidnightSpecificSendFlowType = 'send',
): ConfirmTxParams<MidnightSpecificSendFlowData> => ({
  blockchainName: 'Midnight' as const,
  serializedTx: HexBytes.fromUTF8('{"amount":"1","receiverAddress":"addr"}'),
  wallet: stubData.midnightWallet,
  accountId: stubData.accountId,
  blockchainSpecificSendFlowData: { flowType },
});

const authDeps = getTestAuthSecretDeps();

const confirmTx = makeConfirmTx({
  logger: mockLogger,
  signerFactory: mockSignerFactory,
  accessAuthSecret: authDeps.accessAuthSecret,
  authenticate: authDeps.authenticate,
} as unknown as SideEffectDependencies);

const prepareTest = (callback: (helpers: RunHelpers) => void) => {
  createTestScheduler().run(callback);
};

describe('blockchain-midnight confirm-tx', () => {
  test('logs error before returning failure response', () => {
    prepareTest(({ cold, flush }) => {
      const error = new Error('Could not load midnight wallet');
      mockSignerSign.mockReturnValue(cold('#', undefined, error));

      confirmTx(createConfirmTxParams()).subscribe();
      flush();

      expect(mockLogger.error).toHaveBeenCalledWith(error);
    });
  });

  test('creates transaction signer with wallet, accountId and auth', () => {
    prepareTest(({ cold, flush }) => {
      mockCreateTransactionSigner.mockClear();
      mockSignerSign.mockClear();

      mockSignerSign.mockReturnValue(
        cold('a|', { a: { serializedTx: 'signed-tx' } }),
      );

      const params = createConfirmTxParams();
      confirmTx(params).subscribe();
      flush();

      expect(mockCreateTransactionSigner).toHaveBeenCalledTimes(1);
      const [signerContext] = mockCreateTransactionSigner.mock.calls[0] as [
        MidnightSignerContext,
      ];
      expect(signerContext.wallet).toBe(stubData.midnightWallet);
      expect(signerContext.accountId).toBe(stubData.accountId);
      expect(typeof signerContext.auth.authenticate).toBe('function');
      expect(typeof signerContext.auth.accessAuthSecret).toBe('function');
    });
  });

  test('passes serializedTx and flowType to signer.sign', () => {
    prepareTest(({ cold, flush }) => {
      mockSignerSign.mockReturnValue(
        cold('a|', { a: { serializedTx: 'signed-tx' } }),
      );

      const params = createConfirmTxParams('dust-designation');
      confirmTx(params).subscribe();
      flush();

      expect(mockSignerSign).toHaveBeenCalledWith({
        serializedTx: params.serializedTx,
        flowType: 'dust-designation',
      });
    });
  });

  test('maps signer result to success response', () => {
    prepareTest(({ cold, expectObservable }) => {
      const signedTx = 'signed-tx-hex';
      mockSignerSign.mockReturnValue(
        cold('a|', { a: { serializedTx: signedTx } }),
      );

      expectObservable(confirmTx(createConfirmTxParams())).toBe('a|', {
        a: { serializedTx: signedTx, success: true },
      });
    });
  });

  test('maps signer error to failure response with error mapping', () => {
    prepareTest(({ cold, expectObservable }) => {
      mockSignerSign.mockReturnValue(
        cold('#', undefined, new Error('Could not load midnight wallet')),
      );

      expectObservable(confirmTx(createConfirmTxParams())).toBe('(a|)', {
        a: {
          success: false,
          errorTranslationKeys: {
            title: 'tx-executor.confirmation-error.generic.title',
            subtitle: 'tx-executor.confirmation-error.generic.subtitle',
          },
          error: { message: 'Could not load midnight wallet' },
        },
      });
    });
  });

  test('passes undefined flowType when not in blockchainSpecificSendFlowData', () => {
    prepareTest(({ cold, flush }) => {
      mockSignerSign.mockReturnValue(
        cold('a|', { a: { serializedTx: 'signed-tx' } }),
      );

      const params = createConfirmTxParams();
      params.blockchainSpecificSendFlowData = {};
      confirmTx(params).subscribe();
      flush();

      expect(mockSignerSign).toHaveBeenCalledWith({
        serializedTx: params.serializedTx,
        flowType: undefined,
      });
    });
  });
});
