import { analyticsActions } from '@lace-contract/analytics';
import { uiActions } from '@lace-contract/app';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { Err, Ok } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FEATURE_FLAG_REALFI } from '../../src/const';
import { CARDANO_NETWORK_MAGIC } from '../../src/realfi-network-config';
import {
  makeWithdraw,
  makeWithdrawFeeQuote,
} from '../../src/store/side-effects';
import { realfiStakingActions } from '../../src/store/slice';

import type {
  RealFiProviderError,
  RealFiWithdrawableUnstake,
  RealFiWithdrawRequest,
} from '../../src/provider-types';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { AnyWallet } from '@lace-contract/wallet-repo';

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
const previewNetworkId =
  `cardano-${CARDANO_NETWORK_MAGIC.preview}` as BlockchainNetworkId;
const recordedAt = 1_700_000_000_000;

const testWallet = {
  walletId: WalletId('wallet-1'),
  accounts: [{ accountId, blockchainName: 'Cardano' }],
} as unknown as AnyWallet;

const unstake: RealFiWithdrawableUnstake = {
  timelockUtxo: { txHash: 'tl-tx', index: 0 },
  unlockSlot: 123,
  usdrAmount: '1500000',
};

const realfiFlag = {
  key: FEATURE_FLAG_REALFI,
  payload: { preview: {} },
};

const actions = { ...realfiStakingActions, ...uiActions, ...analyticsActions };

// Flow failures surface via the error sheet (LW-14684), not a toast: the
// stored payload lets the sheet's Try again re-dispatch the same claim.
const withdrawFailed = actions.realfiPosition.withdrawFailed({
  accountId,
  unstakes: [unstake],
});

// The claim releases USDr, so usd_value reports its USD-pegged amount.
const trackClaimFailure = actions.analytics.trackEvent({
  eventName: 'realfi | claim | failure',
  payload: { tx_type: 'claim', usdr_amount: 1.5, usd_value: 1.5 },
});

const stateObservables = {
  realfiPosition: { selectWithdrawFeeQuote$: of(undefined) },
  wallets: { selectAll$: of([testWallet]) },
  addresses: {
    selectByAccountId$: of(() => [{ address: 'addr_test1xyz' }] as never),
  },
  network: {
    selectActiveNetworkId$: of(() => previewNetworkId),
  },
  features: {
    selectLoadedFeatures$: of({ featureFlags: [realfiFlag], modules: [] }),
  },
};

const runWithdraw = (
  buildWithdrawTx: ReturnType<typeof vi.fn>,
  assert: (emissions: unknown[]) => void,
  unstakes: RealFiWithdrawableUnstake[] = [unstake],
) => {
  const provider = { buildWithdrawTx } as never;
  testSideEffect(makeWithdraw, ({ hot, flush }) => ({
    actionObservables: {
      realfiPosition: {
        withdrawRequested$: hot('-a', {
          a: actions.realfiPosition.withdrawRequested({ accountId, unstakes }),
        }),
      },
    },
    stateObservables,
    dependencies: { actions, realfiProviders: [provider] },
    assertion: sideEffect$ => {
      const emissions: unknown[] = [];
      sideEffect$.subscribe(action => emissions.push(action));
      flush();
      assert(emissions);
    },
  }));
};

describe('makeWithdraw', () => {
  beforeEach(() => {
    confirmTx.mockReset();
    submitTx.mockReset();
    vi.spyOn(Date, 'now').mockReturnValue(recordedAt);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds, signs, and submits the claim, then clears, records, and refreshes', () => {
    const buildWithdrawTx = vi
      .fn()
      .mockReturnValue(of(Ok({ unsignedTxCbor: 'withdraw-cbor' })));
    confirmTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: true, serializedTx: 'signed-withdraw' })),
    );
    submitTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: true, txId: 'tx-1' })),
    );

    runWithdraw(buildWithdrawTx, emissions => {
      const request = buildWithdrawTx.mock.calls[0][0] as RealFiWithdrawRequest;
      expect(request.unstakes).toEqual([unstake]);
      expect(submitTx).toHaveBeenCalledWith(
        expect.objectContaining({ serializedTx: 'signed-withdraw' }),
        expect.any(Function),
      );
      expect(emissions).toEqual([
        actions.realfiPosition.withdrawSucceeded({
          accountId,
          amountUsdr: '1500000',
        }),
        actions.realfiPosition.withdrawableCleared({
          accountId,
          timelockUtxos: [unstake.timelockUtxo],
        }),
        actions.realfiPosition.withdrawActivitiesRecorded({
          accountId,
          activities: [
            {
              id: 'tl-tx#0-withdraw',
              kind: 'withdraw',
              label: 'Withdrawal',
              subtitle: '+1.50 USDrf',
              usdrBaseUnits: '1500000',
              completed: true,
              requestDate: recordedAt,
              steps: [{ key: 'withdrawn', status: 'completed' }],
            },
          ],
        }),
        actions.realfiPosition.stakeActivitiesRequested({ accountId }),
        // Immediate withdraw-ready recheck: other pending claims refresh while
        // the tombstone keeps the just-claimed timelock out of the banner.
        actions.realfiPosition.withdrawablesRequested(),
        actions.analytics.trackEvent({
          eventName: 'realfi | claim | success',
          payload: {
            tx_type: 'claim',
            usdr_amount: 1.5,
            usd_value: 1.5,
            txId: 'tx-1',
          },
        }),
      ]);
    });
  });

  it('surfaces the failure for the error sheet when the build fails', () => {
    const buildWithdrawTx = vi
      .fn()
      .mockReturnValue(
        of(Err<RealFiProviderError>({ code: 'VALIDATION', message: 'nope' })),
      );

    runWithdraw(buildWithdrawTx, emissions => {
      expect(confirmTx).not.toHaveBeenCalled();
      expect(emissions).toEqual([withdrawFailed, trackClaimFailure]);
    });
  });

  it('quotes the exact built fee for the claim sheet, staying silent on a failed dry run', () => {
    const buildWithdrawTx = vi
      .fn()
      .mockReturnValueOnce(
        of(Ok({ unsignedTxCbor: 'withdraw-cbor', feeLovelace: '176000' })),
      )
      .mockReturnValueOnce(
        of(Err<RealFiProviderError>({ code: 'VALIDATION', message: 'nope' })),
      );
    const provider = { buildWithdrawTx } as never;
    testSideEffect(makeWithdrawFeeQuote, ({ hot, flush }) => ({
      actionObservables: {
        realfiPosition: {
          withdrawFeeQuoteRequested$: hot('-a-b', {
            a: actions.realfiPosition.withdrawFeeQuoteRequested({
              accountId,
              unstakes: [unstake],
            }),
            b: actions.realfiPosition.withdrawFeeQuoteRequested({
              accountId,
              unstakes: [unstake],
            }),
          }),
        },
      },
      stateObservables,
      dependencies: { actions, realfiProviders: [provider] },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();
        expect(emissions).toEqual([
          actions.realfiPosition.withdrawFeeQuoteReceived({
            feeLovelace: '176000',
            unsignedTxCbor: 'withdraw-cbor',
            timelockKey: 'tl-tx#0',
            quotedAt: recordedAt,
          }),
        ]);
      },
    }));
  });

  it('signs the fresh fee-quoted tx as-is (fee shown === fee paid) instead of rebuilding', () => {
    const buildWithdrawTx = vi.fn();
    confirmTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: true, serializedTx: 'signed-withdraw' })),
    );
    submitTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: true, txId: 'tx-1' })),
    );
    testSideEffect(makeWithdraw, ({ hot, flush }) => ({
      actionObservables: {
        realfiPosition: {
          withdrawRequested$: hot('-a', {
            a: actions.realfiPosition.withdrawRequested({
              accountId,
              unstakes: [unstake],
            }),
          }),
        },
      },
      stateObservables: {
        ...stateObservables,
        realfiPosition: {
          selectWithdrawFeeQuote$: of({
            feeLovelace: '176000',
            unsignedTxCbor: 'quoted-cbor',
            timelockKey: 'tl-tx#0',
            quotedAt: recordedAt,
          }),
        },
      },
      dependencies: {
        actions,
        realfiProviders: [{ buildWithdrawTx } as never],
      },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();
        expect(buildWithdrawTx).not.toHaveBeenCalled();
        expect(confirmTx).toHaveBeenCalledWith(
          expect.objectContaining({ serializedTx: 'quoted-cbor' }),
          expect.any(Function),
        );
      },
    }));
  });

  it('unlocks the claim CTA (no toast, no error sheet) when the signing prompt is declined', () => {
    const buildWithdrawTx = vi
      .fn()
      .mockReturnValue(of(Ok({ unsignedTxCbor: 'withdraw-cbor' })));
    confirmTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: false, error: new Error('declined') })),
    );

    runWithdraw(buildWithdrawTx, emissions => {
      expect(submitTx).not.toHaveBeenCalled();
      expect(emissions).toEqual([actions.realfiPosition.withdrawDeclined()]);
    });
  });

  it('ignores a re-entrant claim request while one is in flight (no duplicate claim)', () => {
    confirmTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: true, serializedTx: 'signed-withdraw' })),
    );
    submitTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: true, txId: 'tx-1' })),
    );
    testSideEffect(makeWithdraw, ({ hot, flush }) => {
      // The build resolves AFTER the second request arrives, so the first
      // claim is still in flight when the retry double-dispatches.
      const buildWithdrawTx = vi
        .fn()
        .mockReturnValue(
          hot('----(r|)', { r: Ok({ unsignedTxCbor: 'withdraw-cbor' }) }),
        );
      return {
        actionObservables: {
          realfiPosition: {
            withdrawRequested$: hot('-a-b', {
              a: actions.realfiPosition.withdrawRequested({
                accountId,
                unstakes: [unstake],
              }),
              b: actions.realfiPosition.withdrawRequested({
                accountId,
                unstakes: [unstake],
              }),
            }),
          },
        },
        stateObservables,
        dependencies: {
          actions,
          realfiProviders: [{ buildWithdrawTx } as never],
        },
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();
          // One build, one signature, one submission — the second request
          // was swallowed by exhaustMap instead of spending the same
          // timelocks twice ("inputs already spent").
          expect(buildWithdrawTx).toHaveBeenCalledTimes(1);
          expect(submitTx).toHaveBeenCalledTimes(1);
          expect(
            emissions.filter(
              action =>
                (action as { type: string }).type ===
                actions.realfiPosition.withdrawSucceeded({
                  accountId,
                  amountUsdr: '0',
                }).type,
            ),
          ).toHaveLength(1);
        },
      };
    });
  });

  it('surfaces the failure for the error sheet when submission fails', () => {
    const buildWithdrawTx = vi
      .fn()
      .mockReturnValue(of(Ok({ unsignedTxCbor: 'withdraw-cbor' })));
    confirmTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: true, serializedTx: 'signed-withdraw' })),
    );
    submitTx.mockImplementation((_params, mapResult) =>
      of(mapResult({ success: false, error: new Error('submit failed') })),
    );

    runWithdraw(buildWithdrawTx, emissions => {
      expect(emissions).toEqual([withdrawFailed, trackClaimFailure]);
    });
  });

  it('surfaces the failure for the error sheet when the pipeline throws', () => {
    const buildWithdrawTx = vi
      .fn()
      .mockReturnValue(throwError(() => new Error('boom')));

    runWithdraw(buildWithdrawTx, emissions => {
      expect(emissions).toEqual([withdrawFailed, trackClaimFailure]);
    });
  });

  it('does not call the provider when there is nothing to withdraw, unlocking the CTA', () => {
    const buildWithdrawTx = vi
      .fn()
      .mockReturnValue(of(Ok({ unsignedTxCbor: 'withdraw-cbor' })));

    runWithdraw(
      buildWithdrawTx,
      emissions => {
        expect(buildWithdrawTx).not.toHaveBeenCalled();
        expect(emissions).toEqual([actions.realfiPosition.withdrawDeclined()]);
      },
      [],
    );
  });
});
