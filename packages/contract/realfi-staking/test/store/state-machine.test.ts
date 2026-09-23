import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import { realfiFlowMachine } from '../../src/store/state-machine';

import type { RealFiReview } from '../../src/store/types';
import type { Percent } from '@cardano-sdk/util';
import type { TranslationKey } from '@lace-contract/i18n';
import type { Milliseconds } from '@lace-lib/util';

const accountId = AccountId('acc-1');

const review: RealFiReview = {
  quote: {
    quoteId: 'q1',
    kind: 'stake',
    inputAmount: '1000000',
    estimatedOutput: '999999',
    route: [],
    priceImpact: 0.01 as Percent,
    exchangeRate: 1,
    networkFee: '170000',
    serviceFee: '0',
    serviceFeeTokenId: 'lovelace',
    quoteExpiresAt: 9_999_999 as Milliseconds,
  },
  estimatedOutput: '999999',
  route: [],
  priceImpact: 0.01 as Percent,
  networkFee: '170000',
  serviceFee: '0',
  serviceFeeTokenId: 'lovelace',
  quoteExpiresAt: 9_999_999 as Milliseconds,
};

describe('realfiFlowMachine', () => {
  it('starts Idle', () => {
    expect(realfiFlowMachine.initialState).toEqual({ status: 'Idle' });
  });

  it('Idle → Preparing on prepareRequested', () => {
    const next = realfiFlowMachine.transition(
      realfiFlowMachine.initialState,
      realfiFlowMachine.events.prepareRequested({
        kind: 'stake',
        accountId,
        inputAmount: '1000000',
        inputTokenId: 'lovelace',
        outputTokenId: 'lovelace',
      }),
    );
    expect(next).toEqual({
      status: 'Preparing',
      kind: 'stake',
      accountId,
      inputAmount: '1000000',
      inputTokenId: 'lovelace',
      outputTokenId: 'lovelace',
    });
  });

  it('Preparing → ReviewingTransaction on reviewReceived', () => {
    const preparing = realfiFlowMachine.transition(
      realfiFlowMachine.initialState,
      realfiFlowMachine.events.prepareRequested({
        kind: 'stake',
        accountId,
        inputAmount: '1000000',
        inputTokenId: 'lovelace',
        outputTokenId: 'lovelace',
      }),
    );
    const next = realfiFlowMachine.transition(
      preparing,
      realfiFlowMachine.events.reviewReceived({ review }),
    );
    expect(next.status).toBe('ReviewingTransaction');
    expect(next).toMatchObject({ review, kind: 'stake', accountId });
  });

  it('Preparing → Error on reviewFailed (records previousStatus)', () => {
    const preparing = realfiFlowMachine.transition(
      realfiFlowMachine.initialState,
      realfiFlowMachine.events.prepareRequested({
        kind: 'stake',
        accountId,
        inputAmount: '1000000',
        inputTokenId: 'lovelace',
        outputTokenId: 'lovelace',
      }),
    );
    const next = realfiFlowMachine.transition(
      preparing,
      realfiFlowMachine.events.reviewFailed({
        errorMessage: 'realfi.error' as TranslationKey,
      }),
    );
    expect(next).toEqual({
      status: 'Error',
      kind: 'stake',
      accountId,
      inputAmount: '1000000',
      inputTokenId: 'lovelace',
      outputTokenId: 'lovelace',
      errorMessage: 'realfi.error',
      previousStatus: 'Preparing',
    });
  });

  it('drives Reviewing → Signing → Submitting → Queued', () => {
    let state = realfiFlowMachine.transition(
      realfiFlowMachine.initialState,
      realfiFlowMachine.events.prepareRequested({
        kind: 'stake',
        accountId,
        inputAmount: '1000000',
        inputTokenId: 'lovelace',
        outputTokenId: 'lovelace',
      }),
    );
    state = realfiFlowMachine.transition(
      state,
      realfiFlowMachine.events.reviewReceived({ review }),
    );
    state = realfiFlowMachine.transition(
      state,
      realfiFlowMachine.events.signingRequested(),
    );
    expect(state.status).toBe('SigningTransaction');
    state = realfiFlowMachine.transition(
      state,
      realfiFlowMachine.events.buildCompleted({ unsignedTxCbor: 'cbor' }),
    );
    expect(state).toMatchObject({
      status: 'SigningTransaction',
      unsignedTxCbor: 'cbor',
    });
    state = realfiFlowMachine.transition(
      state,
      realfiFlowMachine.events.submissionStarted({
        serializedTx: 'tx',
      }),
    );
    expect(state.status).toBe('SubmittingTransaction');
    state = realfiFlowMachine.transition(
      state,
      realfiFlowMachine.events.queued({
        txId: 'txid',
        stakeId: 's1' as never,
      }),
    );
    expect(state).toMatchObject({
      status: 'Queued',
      txId: 'txid',
      stakeId: 's1',
    });
  });

  it('Error → Preparing on retryRequested with the entered details intact', () => {
    const errorState = realfiFlowMachine.transition(
      realfiFlowMachine.transition(
        realfiFlowMachine.initialState,
        realfiFlowMachine.events.prepareRequested({
          kind: 'unstake',
          accountId,
          inputAmount: '500',
          inputTokenId: 'lovelace',
          outputTokenId: 'lovelace',
        }),
      ),
      realfiFlowMachine.events.reviewFailed({
        errorMessage: 'realfi.error' as TranslationKey,
      }),
    );
    const next = realfiFlowMachine.transition(
      errorState,
      realfiFlowMachine.events.retryRequested(),
    );
    expect(next).toEqual({
      status: 'Preparing',
      kind: 'unstake',
      accountId,
      inputAmount: '500',
      inputTokenId: 'lovelace',
      outputTokenId: 'lovelace',
    });
  });

  it('submissionFailed keeps the entered details for the retry round trip', () => {
    let state = realfiFlowMachine.transition(
      realfiFlowMachine.initialState,
      realfiFlowMachine.events.prepareRequested({
        kind: 'stake',
        accountId,
        inputAmount: '7000000',
        inputTokenId: 'lovelace',
        outputTokenId: 'usdr-token',
      }),
    );
    state = realfiFlowMachine.transition(
      state,
      realfiFlowMachine.events.reviewReceived({ review }),
    );
    state = realfiFlowMachine.transition(
      state,
      realfiFlowMachine.events.signingRequested(),
    );
    state = realfiFlowMachine.transition(
      state,
      realfiFlowMachine.events.submissionFailed({
        errorMessage: 'realfi.error' as TranslationKey,
      }),
    );
    expect(state).toMatchObject({
      status: 'Error',
      previousStatus: 'SigningTransaction',
      inputAmount: '7000000',
      inputTokenId: 'lovelace',
      outputTokenId: 'usdr-token',
    });
    const retried = realfiFlowMachine.transition(
      state,
      realfiFlowMachine.events.retryRequested(),
    );
    expect(retried).toEqual({
      status: 'Preparing',
      kind: 'stake',
      accountId,
      inputAmount: '7000000',
      inputTokenId: 'lovelace',
      outputTokenId: 'usdr-token',
    });
  });

  it('signingCancelled returns to Reviewing with the review intact (R3-3)', () => {
    let state = realfiFlowMachine.transition(
      realfiFlowMachine.initialState,
      realfiFlowMachine.events.prepareRequested({
        kind: 'stake',
        accountId,
        inputAmount: '7000000',
        inputTokenId: 'lovelace',
        outputTokenId: 'usdr-token',
      }),
    );
    state = realfiFlowMachine.transition(
      state,
      realfiFlowMachine.events.reviewReceived({ review }),
    );
    state = realfiFlowMachine.transition(
      state,
      realfiFlowMachine.events.signingRequested(),
    );
    const cancelled = realfiFlowMachine.transition(
      state,
      realfiFlowMachine.events.signingCancelled(),
    );
    expect(cancelled).toMatchObject({
      status: 'ReviewingTransaction',
      kind: 'stake',
      inputAmount: '7000000',
      review,
    });
  });

  it('reset returns to Idle from any state', () => {
    const preparing = realfiFlowMachine.transition(
      realfiFlowMachine.initialState,
      realfiFlowMachine.events.prepareRequested({
        kind: 'claim',
        accountId,
        inputAmount: '1',
        inputTokenId: 'lovelace',
        outputTokenId: 'lovelace',
      }),
    );
    expect(
      realfiFlowMachine.transition(preparing, realfiFlowMachine.events.reset()),
    ).toEqual({ status: 'Idle' });
  });
});
