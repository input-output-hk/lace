import { Cardano, Serialization } from '@cardano-sdk/core';
import { uiActions } from '@lace-contract/app';
import { AccountId } from '@lace-contract/wallet-repo';
import { Err, Ok } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { FEATURE_FLAG_REALFI } from '../../src/const';
import { CARDANO_NETWORK_MAGIC } from '../../src/realfi-network-config';
import { makeQuote } from '../../src/store/side-effects';
import { realfiStakingActions } from '../../src/store/slice';

import type {
  RealFiProviderError,
  RealFiSorQuote,
  RealFiSorQuoteRequest,
} from '../../src/provider-types';
import type { Percent } from '@cardano-sdk/util';
import type { RequiredProtocolParameters } from '@lace-contract/cardano-context';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { Milliseconds } from '@lace-lib/util';

const accountId = AccountId('acct-1');
const previewNetworkId =
  `cardano-${CARDANO_NETWORK_MAGIC.preview}` as BlockchainNetworkId;

const changeAddr = Cardano.PaymentAddress(
  // cSpell:disable-next-line
  'addr_test1qrtdjvvgalpl5pxqftpf5n6mz23ksvg3gwle040z7jarvxquvv2ng0zzk9yx3q627wnledw8gsy9vuljaw0j9vyjs2yqjjnenn',
);

const utxo: Cardano.Utxo = [
  {
    txId: Cardano.TransactionId('0'.repeat(64)),
    index: 0,
    address: changeAddr,
  },
  { address: changeAddr, value: { coins: 10_000_000n } },
];

const protocolParameters = {
  coinsPerUtxoByte: 4310,
  maxTxSize: 16_384,
  maxValueSize: 5000,
  minFeeCoefficient: 44,
  minFeeConstant: 155_381,
} as unknown as RequiredProtocolParameters;

const quote: RealFiSorQuote = {
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
};

const preparingState = {
  status: 'Preparing' as const,
  kind: 'stake' as const,
  accountId,
  inputAmount: '1000000',
  inputTokenId: 'lovelace',
  outputTokenId: 'lovelace',
};

const realfiFlag = {
  key: FEATURE_FLAG_REALFI,
  payload: { preview: {} },
};

const actions = { ...realfiStakingActions, ...uiActions };

const reviewFailed = (errorDetail?: string) =>
  actions.realfiFlow.reviewFailed({
    errorMessage: 'realfi.error.title',
    errorDetail,
  });

const baseStateObservables = {
  addresses: {
    selectByAccountId$: of(() => [{ address: changeAddr }] as never),
  },
  network: {
    selectActiveNetworkId$: of(() => previewNetworkId),
  },
  features: {
    selectLoadedFeatures$: of({ featureFlags: [realfiFlag], modules: [] }),
  },
};

describe('makeQuote', () => {
  it('requests a quote with serialized UTxOs and emits reviewReceived on success', () => {
    const getSorQuote = vi.fn().mockReturnValue(of(Ok(quote)));
    const provider = { getSorQuote } as never;

    testSideEffect(makeQuote, ({ hot, flush }) => ({
      stateObservables: {
        ...baseStateObservables,
        realfiFlow: {
          selectFlowState$: hot('-a', { a: preparingState }),
        },
        cardanoContext: {
          selectAvailableAccountUtxos$: of({ [accountId]: [utxo] }),
          selectProtocolParameters$: of(protocolParameters),
        },
      },
      dependencies: { actions, realfiProviders: [provider] },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        expect(getSorQuote).toHaveBeenCalledTimes(1);
        const request = getSorQuote.mock.calls[0][0] as RealFiSorQuoteRequest;
        expect(request.userAddress).toBe(changeAddr);
        expect(request.protocolParameters).toEqual(protocolParameters);
        expect(request.utxos).toEqual([
          Serialization.TransactionUnspentOutput.fromCore(utxo).toCbor(),
        ]);
        expect(emissions).toEqual([
          actions.realfiFlow.reviewReceived({
            review: {
              quote,
              estimatedOutput: quote.estimatedOutput,
              route: quote.route,
              priceImpact: quote.priceImpact,
              networkFee: quote.networkFee,
              serviceFee: quote.serviceFee,
              serviceFeeTokenId: quote.serviceFeeTokenId,
              quoteExpiresAt: quote.quoteExpiresAt,
            },
          }),
        ]);
      },
    }));
  });

  it('fails the flow with the provider detail when the provider returns an error result', () => {
    const getSorQuote = vi
      .fn()
      .mockReturnValue(
        of(Err<RealFiProviderError>({ code: 'VALIDATION', message: 'nope' })),
      );
    const provider = { getSorQuote } as never;

    testSideEffect(makeQuote, ({ hot, flush }) => ({
      stateObservables: {
        ...baseStateObservables,
        realfiFlow: {
          selectFlowState$: hot('-a', { a: preparingState }),
        },
        cardanoContext: {
          selectAvailableAccountUtxos$: of({ [accountId]: [utxo] }),
          selectProtocolParameters$: of(protocolParameters),
        },
      },
      dependencies: { actions, realfiProviders: [provider] },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        expect(emissions).toEqual([
          actions.realfiFlow.reviewFailed({
            errorMessage: 'realfi.error.title',
            errorDetail: 'nope',
            errorCode: 'VALIDATION',
          }),
        ]);
      },
    }));
  });

  it('carries the compliance code and suppresses the raw detail on a compliance refusal', () => {
    const getSorQuote = vi.fn().mockReturnValue(
      of(
        Err<RealFiProviderError>({
          code: 'COMPLIANCE_NOT_AUTHORIZED',
          message: 'Compliance handshake not_authorized',
        }),
      ),
    );
    const provider = { getSorQuote } as never;

    testSideEffect(makeQuote, ({ hot, flush }) => ({
      stateObservables: {
        ...baseStateObservables,
        realfiFlow: {
          selectFlowState$: hot('-a', { a: preparingState }),
        },
        cardanoContext: {
          selectAvailableAccountUtxos$: of({ [accountId]: [utxo] }),
          selectProtocolParameters$: of(protocolParameters),
        },
      },
      dependencies: { actions, realfiProviders: [provider] },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        // The state-specific translated copy renders from the code; the raw
        // handshake text must not double up beneath it.
        expect(emissions).toEqual([
          actions.realfiFlow.reviewFailed({
            errorMessage: 'realfi.error.title',
            errorDetail: undefined,
            errorCode: 'COMPLIANCE_NOT_AUTHORIZED',
          }),
        ]);
      },
    }));
  });

  it('fails the flow with the thrown detail when the quote pipeline throws', () => {
    const getSorQuote = vi
      .fn()
      .mockReturnValue(throwError(() => new Error('network down')));
    const provider = { getSorQuote } as never;

    testSideEffect(makeQuote, ({ hot, flush }) => ({
      stateObservables: {
        ...baseStateObservables,
        realfiFlow: {
          selectFlowState$: hot('-a', { a: preparingState }),
        },
        cardanoContext: {
          selectAvailableAccountUtxos$: of({ [accountId]: [utxo] }),
          selectProtocolParameters$: of(protocolParameters),
        },
      },
      dependencies: { actions, realfiProviders: [provider] },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        expect(emissions).toEqual([reviewFailed('network down')]);
      },
    }));
  });

  it('waits for UTxOs and quotes once they arrive instead of failing a snapshot', () => {
    const getSorQuote = vi.fn().mockReturnValue(of(Ok(quote)));
    const provider = { getSorQuote } as never;

    testSideEffect(makeQuote, ({ hot, flush }) => ({
      stateObservables: {
        ...baseStateObservables,
        realfiFlow: {
          selectFlowState$: hot('-a', { a: preparingState }),
        },
        cardanoContext: {
          // Empty at the moment of Preparing; the wallet sync lands them later.
          selectAvailableAccountUtxos$: hot('e 99ms u', {
            e: {},
            u: { [accountId]: [utxo] },
          }),
          selectProtocolParameters$: of(protocolParameters),
        },
      },
      dependencies: { actions, realfiProviders: [provider] },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        expect(getSorQuote).toHaveBeenCalledTimes(1);
        expect(emissions).toEqual([
          actions.realfiFlow.reviewReceived({
            review: {
              quote,
              estimatedOutput: quote.estimatedOutput,
              route: quote.route,
              priceImpact: quote.priceImpact,
              networkFee: quote.networkFee,
              serviceFee: quote.serviceFee,
              serviceFeeTokenId: quote.serviceFeeTokenId,
              quoteExpiresAt: quote.quoteExpiresAt,
            },
          }),
        ]);
      },
    }));
  });

  it('fails with a loading reason when the wallet data never arrives', () => {
    const getSorQuote = vi.fn().mockReturnValue(of(Ok(quote)));
    const provider = { getSorQuote } as never;

    testSideEffect(makeQuote, ({ hot, flush }) => ({
      stateObservables: {
        ...baseStateObservables,
        realfiFlow: {
          selectFlowState$: hot('-a', { a: preparingState }),
        },
        cardanoContext: {
          // Store streams never complete; UTxOs simply never land.
          selectAvailableAccountUtxos$: hot('e', { e: {} }),
          selectProtocolParameters$: of(protocolParameters),
        },
      },
      dependencies: { actions, realfiProviders: [provider] },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        expect(getSorQuote).not.toHaveBeenCalled();
        expect(emissions).toEqual([
          reviewFailed(
            'Wallet data (balance and network parameters) did not load in time',
          ),
        ]);
      },
    }));
  });
});
