import { ActivityType, activitiesActions } from '@lace-contract/activities';
import { analyticsActions } from '@lace-contract/analytics';
import { TokenId } from '@lace-contract/tokens';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { BigNumber, Ok, Timestamp } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { NEVER, from, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FEATURE_FLAG_REALFI } from '../../src/const';
import { CARDANO_NETWORK_MAGIC } from '../../src/realfi-network-config';
import { makeFinalize } from '../../src/store/side-effects';
import { realfiStakingActions } from '../../src/store/slice';
import { RealFiStakeId } from '../../src/value-objects';

import type { RealFiAttributionRequest } from '../../src/provider-types';
import type { RealFiReview } from '../../src/store/types';
import type { Percent } from '@cardano-sdk/util';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { AnyWallet } from '@lace-contract/wallet-repo';
import type { Milliseconds } from '@lace-lib/util';

type TxEntryPoint = (
  params: unknown,
  mapResult: (result: unknown) => unknown,
) => unknown;

const { confirmTxMock, submitTxMock } = vi.hoisted(() => ({
  confirmTxMock: vi.fn(),
  submitTxMock: vi.fn(),
}));

vi.mock('@lace-contract/tx-executor', async importOriginal => ({
  ...(await importOriginal<object>()),
  makeConfirmTx: () => confirmTxMock,
  makeSubmitTx: () => submitTxMock,
}));

const confirmTx = confirmTxMock as unknown as ReturnType<
  typeof vi.fn<TxEntryPoint>
>;
const submitTx = submitTxMock as unknown as ReturnType<
  typeof vi.fn<TxEntryPoint>
>;

const accountId = AccountId('acct-1');

const claimOrderAttribution = vi.fn();
const provider = { claimOrderAttribution } as never;

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
    processingFee: '1000000',
    serviceFee: '0',
    serviceFeeTokenId: 'lovelace',
    quoteExpiresAt: 9_999_999 as Milliseconds,
  },
  estimatedOutput: '999999',
  route: [],
  priceImpact: 0.01 as Percent,
  networkFee: '170000',
  processingFee: '1000000',
  serviceFee: '0',
  serviceFeeTokenId: 'lovelace',
  quoteExpiresAt: 9_999_999 as Milliseconds,
};

const testWallet = {
  walletId: WalletId('wallet-1'),
  accounts: [{ accountId, blockchainName: 'Cardano' }],
} as unknown as AnyWallet;

const userAddress = 'addr_test1staker';

const submittingState = {
  status: 'SubmittingTransaction' as const,
  kind: 'stake' as const,
  accountId,
  inputAmount: '1000000',
  inputTokenId: 'lovelace',
  outputTokenId: 'lovelace',
  review,
  serializedTx: 'unsigned-cbor',
};

/** A build that placed a claimable order output (both stake paths do). */
const attributableState = { ...submittingState, orderOutputIndex: 1 };

const actions = {
  ...realfiStakingActions,
  ...analyticsActions,
  ...activitiesActions,
};

/**
 * The optimistic row for the broadcast order. `inputAmount` is base units, so
 * it maps straight to the balance change with no scaling.
 */
const pendingRow = ({
  recordedAt,
  blockchainSpecific,
}: {
  recordedAt: number;
  blockchainSpecific?: unknown;
}) =>
  actions.activities.upsertActivities({
    accountId,
    activities: [
      {
        accountId,
        activityId: 'tx-1',
        timestamp: Timestamp(recordedAt),
        tokenBalanceChanges: [
          { tokenId: TokenId('lovelace'), amount: BigNumber(-1_000_000n) },
        ],
        type: ActivityType.Pending,
        ...(blockchainSpecific === undefined ? {} : { blockchainSpecific }),
      },
    ],
  });

const previewNetworkId =
  `cardano-${CARDANO_NETWORK_MAGIC.preview}` as BlockchainNetworkId;

const realfiFlag = {
  key: FEATURE_FLAG_REALFI,
  payload: { preview: {} },
};

// No cached prices, so the analytics usd_value falls back to the USD-pegged
// usdr_amount (estimatedOutput 999999 base units → 0.999999 USDr).
const trackSubmitted = actions.analytics.trackEvent({
  eventName: 'realfi | usdr stake | submitted',
  payload: {
    tx_type: 'stake',
    usdr_amount: 0.999_999,
    usd_value: 0.999_999,
    source_token: 'ADA',
  },
});

/** Stub a clean sign + broadcast; returns the signed CBOR the claim must name. */
const signsAndSubmits = (): string => {
  const signed = 'signed-cbor';
  confirmTx.mockImplementation((_params, mapResult) =>
    of(mapResult({ success: true, serializedTx: signed })),
  );
  submitTx.mockImplementation((_params, mapResult) =>
    of(mapResult({ success: true, txId: 'tx-1' })),
  );
  return signed;
};

const submissionFailed = (errorDetail?: string) =>
  actions.realfiFlow.submissionFailed({
    errorMessage: 'realfi.error.title',
    errorDetail,
  });

const runFinalize = (
  assert: (emissions: unknown[]) => void,
  state: typeof submittingState = submittingState,
) => {
  testSideEffect(makeFinalize, ({ hot, flush }) => ({
    actionObservables: {},
    stateObservables: {
      realfiFlow: {
        selectFlowState$: hot('-a', { a: state }),
      },
      addresses: {
        selectByAccountId$: of(() => [{ address: userAddress }] as never),
      },
      // The signing wallet is resolved FRESH here (not a build-time snapshot).
      wallets: { selectAll$: of([testWallet]) },
      tokenPricing: { selectPrices$: of({}) as never },
      tokens: { selectTokenById$: of(() => undefined) as never },
      network: { selectActiveNetworkId$: of(() => previewNetworkId) },
      features: {
        selectLoadedFeatures$: of({
          featureFlags: [realfiFlag],
          modules: [],
        }) as never,
      },
    },
    dependencies: { actions, realfiProviders: [provider] },
    assertion: sideEffect$ => {
      const emissions: unknown[] = [];
      sideEffect$.subscribe(action => emissions.push(action));
      flush();
      assert(emissions);
    },
  }));
};

describe('makeFinalize', () => {
  beforeEach(() => {
    confirmTx.mockReset();
    submitTx.mockReset();
    claimOrderAttribution.mockReset();
    claimOrderAttribution.mockReturnValue(of(Ok({ status: 'accepted' })));
  });

  it('signs, submits, and queues the flow, passing tx phase actions through', () => {
    const confirmPhaseAction = { type: 'txExecutor/txPhaseRequested' };
    const submitPhaseAction = { type: 'txExecutor/txPhaseRequested' };
    const recordedAt = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(recordedAt);
    confirmTx.mockImplementation((_params, mapResult) =>
      from([
        confirmPhaseAction,
        mapResult({ success: true, serializedTx: 'signed-cbor' }),
      ]),
    );
    submitTx.mockImplementation((_params, mapResult) =>
      from([submitPhaseAction, mapResult({ success: true, txId: 'tx-1' })]),
    );

    runFinalize(emissions => {
      expect(confirmTx).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId,
          serializedTx: 'unsigned-cbor',
          wallet: testWallet,
        }),
        expect.any(Function),
      );
      expect(submitTx).toHaveBeenCalledWith(
        expect.objectContaining({ accountId, serializedTx: 'signed-cbor' }),
        expect.any(Function),
      );
      expect(emissions).toEqual([
        confirmPhaseAction,
        // The user signed and the broadcast began — the funnel's "submitted".
        trackSubmitted,
        submitPhaseAction,
        // First of the three: the in-flight row must exist before anything
        // reacting to Queued reads the account's spendable UTxOs.
        pendingRow({ recordedAt }),
        // Recorded before Queued so the feed-mismatch watch exists by the
        // time any post-queue activities read can clear it.
        actions.realfiPosition.submittedOrderTxRecorded({
          accountId,
          orderTx: {
            txHash: 'tx-1',
            recordedAt,
            kind: 'stake',
            inputTokenId: 'lovelace',
          },
        }),
        actions.realfiFlow.queued({
          txId: 'tx-1',
          stakeId: RealFiStakeId(`stake-${accountId}`),
        }),
      ]);
    });
  });

  it("carries the submit result's in-flight metadata onto the pending row", () => {
    // Without consumedInputs the row shows the order but does not withdraw
    // its inputs from the available set, which is the half that prevents a
    // back-to-back transaction being rejected with BadInputsUTxO.
    const blockchainSpecific = {
      Cardano: {
        consumedInputs: [{ txId: 'a'.repeat(64), index: 0 }],
        producedOutputs: [],
      },
    };
    const recordedAt = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(recordedAt);
    confirmTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: true, serializedTx: 'signed-cbor' })),
    );
    submitTx.mockImplementation((_params, mapResult) =>
      of(
        mapResult({
          success: true,
          txId: 'tx-1',
          blockchainSpecificActivityMetadata: blockchainSpecific,
        }),
      ),
    );

    runFinalize(emissions => {
      expect(emissions).toContainEqual(
        pendingRow({ recordedAt, blockchainSpecific }),
      );
    });
  });

  it('records an unstake order the same way, off the shared finalize arm', () => {
    const recordedAt = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(recordedAt);
    signsAndSubmits();

    runFinalize(
      emissions => {
        expect(emissions).toContainEqual(pendingRow({ recordedAt }));
      },
      { ...submittingState, kind: 'unstake' as never },
    );
  });

  it('returns to Reviewing (not Error) when the signing prompt is declined/fails', () => {
    // A confirm-stage failure is the user's own act (declined prompt) — quiet
    // return to Reviewing, mirroring the claim flow's withdrawDeclined (R3-3),
    // never the "Transaction failed" error sheet.
    confirmTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: false, error: new Error('sign failed') })),
    );
    submitTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: true, txId: 'tx-1' })),
    );

    runFinalize(emissions => {
      expect(submitTx).not.toHaveBeenCalled();
      expect(emissions).toEqual([actions.realfiFlow.signingCancelled()]);
    });
  });

  it('fails the flow when submission fails', () => {
    confirmTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: true, serializedTx: 'signed-cbor' })),
    );
    submitTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: false, error: new Error('submit failed') })),
    );

    runFinalize(emissions => {
      // The sign happened, so "submitted" precedes the broadcast failure.
      expect(emissions).toEqual([
        trackSubmitted,
        submissionFailed('submit failed'),
      ]);
    });
  });

  it('fails the flow when the confirm pipeline throws', () => {
    confirmTx.mockImplementation(() => throwError(() => new Error('boom')));

    runFinalize(emissions => {
      expect(emissions).toEqual([submissionFailed('boom')]);
    });
  });

  it('claims the order attribution on the signed body before broadcasting it', () => {
    const signed = signsAndSubmits();

    runFinalize(() => {
      const [request] = claimOrderAttribution.mock.calls[0] as [
        RealFiAttributionRequest,
      ];
      expect(request.config.realfiNetwork).toBe('preview');
      expect(request.userAddress).toBe(userAddress);
      // The SIGNED body — RealFi binds the claim to the hash of the body that
      // reaches the chain.
      expect(request.serializedTx).toBe(signed);
      expect(request.orderOutputIndex).toBe(1);
      // RealFi will not honour a claim for a body it sees submitted first.
      expect(claimOrderAttribution.mock.invocationCallOrder[0]).toBeLessThan(
        submitTx.mock.invocationCallOrder[0],
      );
    }, attributableState);
  });

  it('broadcasts unattributed rather than losing a signed tx when the claim fails', () => {
    signsAndSubmits();
    claimOrderAttribution.mockReturnValue(
      throwError(() => new Error('attribution api down')),
    );

    runFinalize(emissions => {
      expect(submitTx).toHaveBeenCalledTimes(1);
      expect(emissions).toContainEqual(
        actions.realfiFlow.queued({
          txId: 'tx-1',
          stakeId: RealFiStakeId(`stake-${accountId}`),
        }),
      );
    }, attributableState);
  });

  it('broadcasts anyway when the claim never settles, rather than wedging the signed tx', () => {
    signsAndSubmits();
    // Not an error — a request that hangs. `retryBackoff` has nothing to act
    // on and `catchError` never fires, so before the timeout this left an
    // already-signed transaction unbroadcast and the flow stuck in
    // SubmittingTransaction.
    claimOrderAttribution.mockReturnValue(NEVER);

    runFinalize(emissions => {
      expect(submitTx).toHaveBeenCalledTimes(1);
      expect(emissions).toContainEqual(
        actions.realfiFlow.queued({
          txId: 'tx-1',
          stakeId: RealFiStakeId(`stake-${accountId}`),
        }),
      );
    }, attributableState);
  });

  it('skips the claim when the build placed no attributable order output', () => {
    signsAndSubmits();

    runFinalize(() => {
      expect(claimOrderAttribution).not.toHaveBeenCalled();
      expect(submitTx).toHaveBeenCalledTimes(1);
    });
  });
});
