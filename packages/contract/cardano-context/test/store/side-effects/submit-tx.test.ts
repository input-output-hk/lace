import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { testSideEffect } from '@lace-lib/util-dev';
import { Err, HexBytes, Ok } from '@lace-sdk/util';
import { of } from 'rxjs';
import { describe, it, vi } from 'vitest';

import { cardanoContextActions } from '../../../src/store';
import { submitTxSideEffect } from '../../../src/store/side-effects';
import { CardanoTxId } from '../../../src/value-objects';
import { chainId } from '../../mocks';

import type { CardanoProviderDependencies } from '../../../src/types';
import type { Cardano } from '@cardano-sdk/core';

const actions = {
  ...cardanoContextActions,
};

const signedTx = HexBytes(
  '84a400d9010281825820f7c54f6688ebc50457a843d89e447ca346308a732a55ec28b8c60ec9341e5ada01018282583900ace9f2847b65f0add15c4ecd4e56177a0d6db39f865f0ac6bf144093593ffd4fbfac6f367105f8261a5f1e93bc97b9af7252be58d42b966e1a0012c4b082583900ace9f2847b65f0add15c4ecd4e56177a0d6db39f865f0ac6bf144093593ffd4fbfac6f367105f8261a5f1e93bc97b9af7252be58d42b966e1b0000000253e135ee021a00029259031a0714299ba100d9010281825820962a64b06b564133ecf53cec9d7ae40cdbcdbc281a84f421f06c72823afe60be5840f9c3706b2df03b6346c8d8db85db5f018b7f6482dda65c04061b2eaf440f690841b60c06cfff1ac38846242149649978eebd683990d797e70ba125f177193103f5f6',
);
const txId = CardanoTxId.fromCbor(signedTx);

describe('submitTxSideEffect', () => {
  it('submits transaction and dispatches submitTxCompleted on success', () => {
    testSideEffect(submitTxSideEffect, ({ hot, expectObservable }) => ({
      actionObservables: {
        cardanoContext: {
          submitTx$: hot('-a', {
            a: actions.cardanoContext.submitTx({ serializedTx: signedTx }),
          }),
        },
      },
      stateObservables: {
        cardanoContext: {
          selectChainId$: hot<Cardano.ChainId>('a', { a: chainId }),
        },
      },
      dependencies: {
        cardanoProvider: {
          submitTx: vi.fn().mockReturnValue(of(Ok(txId))),
        } as unknown as CardanoProviderDependencies['cardanoProvider'],
        actions,
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-a', {
          a: actions.cardanoContext.submitTxCompleted({ txId }),
        });
      },
    }));
  });

  it('dispatches submitTxFailed when provider returns error', () => {
    testSideEffect(submitTxSideEffect, ({ hot, expectObservable }) => ({
      actionObservables: {
        cardanoContext: {
          submitTx$: hot('-a', {
            a: actions.cardanoContext.submitTx({ serializedTx: signedTx }),
          }),
        },
      },
      stateObservables: {
        cardanoContext: {
          selectChainId$: hot<Cardano.ChainId>('a', { a: chainId }),
        },
      },
      dependencies: {
        cardanoProvider: {
          submitTx: vi
            .fn()
            .mockReturnValue(
              of(Err(new ProviderError(ProviderFailure.ConnectionFailure))),
            ),
        } as unknown as CardanoProviderDependencies['cardanoProvider'],
        actions,
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-a', {
          a: actions.cardanoContext.submitTxFailed({
            txId,
            error: new ProviderError(ProviderFailure.ConnectionFailure).message,
          }),
        });
      },
    }));
  });

  it('dispatches submitTxFailed when chainId is not available', () => {
    testSideEffect(submitTxSideEffect, ({ hot, expectObservable }) => ({
      actionObservables: {
        cardanoContext: {
          submitTx$: hot('-a', {
            a: actions.cardanoContext.submitTx({ serializedTx: signedTx }),
          }),
        },
      },
      stateObservables: {
        cardanoContext: {
          selectChainId$: hot<Cardano.ChainId | undefined>('a', {
            a: undefined,
          }),
        },
      },
      dependencies: {
        cardanoProvider: {
          submitTx: vi.fn(),
        } as unknown as CardanoProviderDependencies['cardanoProvider'],
        actions,
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-a', {
          a: actions.cardanoContext.submitTxFailed({
            txId,
            error: 'Chain ID not found',
          }),
        });
      },
    }));
  });
});
