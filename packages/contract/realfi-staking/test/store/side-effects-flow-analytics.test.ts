import { analyticsActions } from '@lace-contract/analytics';
import { CardanoTokenPriceId } from '@lace-contract/token-pricing';
import { AccountId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { FEATURE_FLAG_REALFI } from '../../src/const';
import {
  CARDANO_NETWORK_MAGIC,
  getRealFiConfigFromFlags,
} from '../../src/realfi-network-config';
import { makeFlowAnalytics } from '../../src/store/side-effects';
import { realfiStakingActions } from '../../src/store/slice';
import { RealFiStakeId } from '../../src/value-objects';

import type { RealFiReview } from '../../src/store/types';
import type { Percent } from '@cardano-sdk/util';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { Milliseconds } from '@lace-lib/util';

const previewNetworkId =
  `cardano-${CARDANO_NETWORK_MAGIC.preview}` as BlockchainNetworkId;

const realfiFlag = {
  key: FEATURE_FLAG_REALFI,
  payload: { preview: {} },
};

const previewConfig = getRealFiConfigFromFlags(
  [realfiFlag] as never,
  previewNetworkId,
);
const usdrTokenId = previewConfig?.usdrTokenId ?? '';
const susdrTokenId = previewConfig?.susdrTokenId ?? '';

const accountId = AccountId('acct-1');
const actions = { ...realfiStakingActions, ...analyticsActions };

const review: RealFiReview = {
  quote: {
    quoteId: 'q1',
    kind: 'stake',
    inputAmount: '100000000',
    estimatedOutput: '250000000',
    route: [],
    priceImpact: 0.01 as Percent,
    exchangeRate: 1,
    networkFee: '170000',
    processingFee: '1000000',
    serviceFee: '0',
    serviceFeeTokenId: 'lovelace',
    quoteExpiresAt: 9_999_999 as Milliseconds,
  },
  estimatedOutput: '250000000',
  route: [],
  priceImpact: 0.01 as Percent,
  networkFee: '170000',
  processingFee: '1000000',
  serviceFee: '0',
  serviceFeeTokenId: 'lovelace',
  quoteExpiresAt: 9_999_999 as Milliseconds,
};

const idle = { status: 'Idle' as const };

const flowStates = (
  kind: 'stake' | 'unstake',
  inputTokenId: string,
  inputAmount: string,
) => {
  const base = {
    kind,
    accountId,
    inputAmount,
    inputTokenId,
    outputTokenId: usdrTokenId,
  };
  return {
    signing: {
      status: 'SigningTransaction' as const,
      ...base,
      review,
      unsignedTxCbor: '',
    },
    submitting: {
      status: 'SubmittingTransaction' as const,
      ...base,
      review,
      serializedTx: 'cbor',
    },
    queued: {
      status: 'Queued' as const,
      kind,
      accountId,
      txId: 'tx-1',
      stakeId: RealFiStakeId(`stake-${accountId}`),
    },
    error: {
      status: 'Error' as const,
      ...base,
      errorMessage: 'realfi.error.title' as const,
      errorCode: 'PROVIDER_UNAVAILABLE' as const,
      previousStatus: 'SubmittingTransaction' as const,
    },
  };
};

// 1 ADA = $0.50, so the 100 ADA input below is worth $50.
const adaPrices = {
  [CardanoTokenPriceId('lovelace')]: {
    price: 0.5,
    priceInUsd: 0.5,
    lastUpdated: 1_700_000_000_000,
  },
};

const runFlowAnalytics = ({
  marble,
  states,
  assert,
  prices = adaPrices,
}: {
  marble: string;
  states: Record<string, unknown>;
  assert: (emissions: unknown[]) => void;
  prices?: object;
}) => {
  testSideEffect(makeFlowAnalytics, ({ hot, flush }) => ({
    actionObservables: {},
    stateObservables: {
      realfiFlow: { selectFlowState$: hot(marble, states) as never },
      tokenPricing: { selectPrices$: of(prices) as never },
      tokens: { selectTokenById$: of(() => undefined) as never },
      network: { selectActiveNetworkId$: of(() => previewNetworkId) },
      features: {
        selectLoadedFeatures$: of({
          featureFlags: [realfiFlag],
          modules: [],
        }) as never,
      },
    },
    dependencies: { actions },
    assertion: sideEffect$ => {
      const emissions: unknown[] = [];
      sideEffect$.subscribe(action => emissions.push(action));
      flush();
      assert(emissions);
    },
  }));
};

describe('makeFlowAnalytics', () => {
  it('tracks tx built, success, and the swap-to-stake acquisition for an ADA-funded stake', () => {
    const { signing, submitting, queued } = flowStates(
      'stake',
      'lovelace',
      '100000000',
    );
    const context = {
      tx_type: 'stake',
      usdr_amount: 250,
      usd_value: 50,
      source_token: 'ADA',
    };
    runFlowAnalytics({
      marble: 'abcd',
      states: { a: idle, b: signing, c: submitting, d: queued },
      assert: emissions => {
        expect(emissions).toEqual([
          actions.analytics.trackEvent({
            eventName: 'realfi | usdr stake | tx built',
            payload: context,
          }),
          actions.analytics.trackEvent({
            eventName: 'realfi | usdr stake | success',
            payload: { ...context, txId: 'tx-1' },
          }),
          actions.analytics.trackEvent({
            eventName: 'realfi | get usdr | success',
            payload: {
              entry_point: 'swap_to_stake',
              source_token: 'ADA',
              usdr_amount: 250,
              usd_value: 50,
              txId: 'tx-1',
            },
          }),
        ]);
      },
    });
  });

  it('reports the exact input for a USDr-funded stake and skips the acquisition event', () => {
    const { signing, submitting, queued } = flowStates(
      'stake',
      usdrTokenId,
      '250000000',
    );
    // USDr itself is unpriced in the cache, so usd_value falls back to the
    // USD-pegged usdr_amount.
    const context = {
      tx_type: 'stake',
      usdr_amount: 250,
      usd_value: 250,
      source_token: usdrTokenId,
    };
    runFlowAnalytics({
      marble: 'abcd',
      states: { a: idle, b: signing, c: submitting, d: queued },
      prices: {},
      assert: emissions => {
        expect(emissions).toEqual([
          actions.analytics.trackEvent({
            eventName: 'realfi | usdr stake | tx built',
            payload: context,
          }),
          actions.analytics.trackEvent({
            eventName: 'realfi | usdr stake | success',
            payload: { ...context, txId: 'tx-1' },
          }),
        ]);
      },
    });
  });

  it('tracks an unstake submit failure with its stage and error code', () => {
    const { signing, submitting, error } = flowStates(
      'unstake',
      susdrTokenId,
      '250000000',
    );
    const context = {
      tx_type: 'unstake',
      usdr_amount: 250,
      usd_value: 250,
      source_token: susdrTokenId,
    };
    runFlowAnalytics({
      marble: 'abcd',
      states: { a: idle, b: signing, c: submitting, d: error },
      prices: {},
      assert: emissions => {
        expect(emissions).toEqual([
          actions.analytics.trackEvent({
            eventName: 'realfi | usdr unstake | tx built',
            payload: context,
          }),
          actions.analytics.trackEvent({
            eventName: 'realfi | usdr unstake | failure',
            payload: {
              ...context,
              stage: 'submit',
              error_code: 'PROVIDER_UNAVAILABLE',
            },
          }),
        ]);
      },
    });
  });

  it('reports a build failure (error while signing) with stage build', () => {
    const { signing } = flowStates('stake', 'lovelace', '100000000');
    const error = {
      ...flowStates('stake', 'lovelace', '100000000').error,
      previousStatus: 'SigningTransaction' as const,
    };
    runFlowAnalytics({
      marble: 'abc',
      states: { a: idle, b: signing, c: error },
      assert: emissions => {
        expect(emissions).toEqual([
          actions.analytics.trackEvent({
            eventName: 'realfi | usdr stake | failure',
            payload: {
              tx_type: 'stake',
              usdr_amount: 250,
              usd_value: 50,
              source_token: 'ADA',
              stage: 'build',
              error_code: 'PROVIDER_UNAVAILABLE',
            },
          }),
        ]);
      },
    });
  });

  it('stays silent for quote failures and pre-signing transitions', () => {
    const preparing = {
      status: 'Preparing' as const,
      kind: 'stake' as const,
      accountId,
      inputAmount: '100000000',
      inputTokenId: 'lovelace',
      outputTokenId: usdrTokenId,
    };
    const reviewing = {
      status: 'ReviewingTransaction' as const,
      kind: 'stake' as const,
      accountId,
      inputAmount: '100000000',
      inputTokenId: 'lovelace',
      outputTokenId: usdrTokenId,
      review,
    };
    const quoteError = {
      ...flowStates('stake', 'lovelace', '100000000').error,
      errorCode: undefined,
      previousStatus: 'Preparing' as const,
    };
    runFlowAnalytics({
      marble: 'abcbd',
      states: { a: idle, b: preparing, c: quoteError, d: reviewing },
      assert: emissions => {
        expect(emissions).toEqual([]);
      },
    });
  });
});
