import { testSideEffect } from '@lace-lib/util-dev';
import { NEVER } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { makeTrackAnalytics } from '../../../src/store/side-effects/track-analytics';
import { migrateWalletActions } from '../../../src/store/slice';

import type { DiscoverySummary } from '../../../src/store/slice';
import type { Observable } from 'rxjs';
import type { RunHelpers } from 'rxjs/internal/testing/TestScheduler';

const { migrateWallet: mw } = migrateWalletActions;

// The side effect destructures every stream it maps, so the harness must
// supply them all; each test overrides only the one it drives. Typed as
// Observable<unknown> so a driven HotObservable<action> is assignable.
const never$: Observable<unknown> = NEVER;
const idleActionObservables = (): Record<string, Observable<unknown>> => ({
  wizardOpened$: never$,
  destinationTypeChosen$: never$,
  destinationCreated$: never$,
  sourceImported$: never$,
  discoveryCompleted$: never$,
  discoveryRetryRequested$: never$,
  destinationDeviceFailed$: never$,
  migrationUnsupported$: never$,
  attestationRefused$: never$,
  sweepStarted$: never$,
  sweepAuthCancelled$: never$,
  sweepPaused$: never$,
  sweepRetryRequested$: never$,
  sweepSucceeded$: never$,
  delegationSettled$: never$,
  delegationPaused$: never$,
  delegationRetryRequested$: never$,
  delegationAbandoned$: never$,
  stepFailed$: never$,
  wizardCancelled$: never$,
});

const trackEvent = vi.fn((payload: unknown) => ({
  type: 'analytics/trackEvent',
  payload,
}));

const dependencies = { actions: { analytics: { trackEvent } } } as never;

const discovery: DiscoverySummary = {
  utxoCount: 5,
  totalCoin: '10000000',
  assets: [{ id: 'a', quantity: '1' }],
  withdrawableRewards: '300000',
  retainedStakeDeposit: '2000000',
  estimatedFee: '170000',
  sweptAccountCount: 2,
  scannedThroughAccountIndex: 3,
  scriptUtxoCount: 0,
  chunkCount: 3,
};

/**
 * Drives one action stream and asserts the analytics call it maps to. The
 * emitted action's identity is trackEvent's return value, so asserting the
 * mock's argument pins both the event name and its whole payload.
 */
const expectMapping = ({
  drive,
  state,
  expected,
}: {
  drive: (hot: RunHelpers['hot']) => Record<string, Observable<unknown>>;
  state?: (hot: RunHelpers['hot']) => Record<string, unknown>;
  expected: Record<string, unknown>;
}) => {
  trackEvent.mockClear();
  testSideEffect(makeTrackAnalytics(), ({ hot, flush }) => ({
    actionObservables: {
      migrateWallet: { ...idleActionObservables(), ...drive(hot) },
    } as never,
    stateObservables: {
      migrateWallet: {
        selectStep$: never$,
        selectSweepProgress$: never$,
        selectDiscovery$: never$,
        selectDelegationFailurePhase$: never$,
        ...(state?.(hot) ?? {}),
      },
    } as never,
    dependencies,
    assertion: sideEffect$ => {
      const emissions: unknown[] = [];
      sideEffect$.subscribe(action => emissions.push(action));
      flush();
      expect(trackEvent).toHaveBeenCalledTimes(1);
      expect(trackEvent).toHaveBeenCalledWith(expected);
      // The mapped action is emitted, not just constructed.
      expect(emissions).toHaveLength(1);
    },
  }));
};

describe('makeTrackAnalytics', () => {
  it('reports the intro view with its opening origin', () => {
    expectMapping({
      drive: hot => ({
        wizardOpened$: hot('-a', { a: mw.wizardOpened({ origin: 'restore' }) }),
      }),
      expected: {
        eventName: 'migrate wallet | intro | view',
        payload: { origin: 'restore' },
      },
    });
  });

  it('reports an origin-less open as unknown rather than omitting the property', () => {
    expectMapping({
      drive: hot => ({ wizardOpened$: hot('-a', { a: mw.wizardOpened() }) }),
      expected: {
        eventName: 'migrate wallet | intro | view',
        payload: { origin: 'unknown' },
      },
    });
  });

  it('reports the destination kind', () => {
    expectMapping({
      drive: hot => ({
        destinationTypeChosen$: hot('-a', {
          a: mw.destinationTypeChosen({ type: 'hardware' }),
        }),
      }),
      expected: {
        eventName: 'migrate wallet | destination | chosen',
        payload: { type: 'hardware' },
      },
    });
  });

  it('reports destination creation with no identifying payload', () => {
    expectMapping({
      drive: hot => ({
        destinationCreated$: hot('-a', {
          a: mw.destinationCreated({
            destinationWalletId: 'w' as never,
            destinationAccountId: 'a' as never,
          }),
        }),
      }),
      expected: { eventName: 'migrate wallet | destination | created' },
    });
  });

  it('reports the source import with no identifying payload', () => {
    expectMapping({
      drive: hot => ({
        sourceImported$: hot('-a', {
          a: mw.sourceImported({
            sourceWalletId: 'w' as never,
            sourceAccountId: 'a' as never,
            sourceNetworkType: 'mainnet',
          }),
        }),
      }),
      expected: { eventName: 'migrate wallet | source | imported' },
    });
  });

  it('reports discovery shape as counts and booleans, never values', () => {
    expectMapping({
      drive: hot => ({
        discoveryCompleted$: hot('-a', {
          a: mw.discoveryCompleted({
            discovery,
            reviewedPlan: {} as never,
          }),
        }),
      }),
      expected: {
        eventName: 'migrate wallet | discovery | completed',
        payload: {
          utxos: 5,
          accounts: 2,
          assets: 1,
          chunks: 3,
          rewards: true,
          deposit: true,
        },
      },
    });
  });

  it('reports a discovery retry press', () => {
    expectMapping({
      drive: hot => ({
        discoveryRetryRequested$: hot('-a', {
          a: mw.discoveryRetryRequested({
            sourceWalletId: 'w' as never,
            sourceAccountId: 'a' as never,
            sourceNetworkType: 'mainnet',
          }),
        }),
      }),
      expected: { eventName: 'migrate wallet | discovery | retry | press' },
    });
  });

  it('reports a refusal with the reason key stripped of its namespace', () => {
    expectMapping({
      drive: hot => ({
        migrationUnsupported$: hot('-a', {
          a: mw.migrationUnsupported({
            errorKey: 'migrate-wallet.error.cannot-cover-fee',
          }),
        }),
      }),
      expected: {
        eventName: 'migrate wallet | migration | unsupported',
        payload: { reason: 'cannot-cover-fee' },
      },
    });
  });

  it('reports an attestation refusal under the same event with its own reason', () => {
    expectMapping({
      drive: hot => ({
        attestationRefused$: hot('-a', { a: mw.attestationRefused() }),
      }),
      expected: {
        eventName: 'migrate wallet | migration | unsupported',
        payload: { reason: 'non-migratable-role' },
      },
    });
  });

  it('reports the review confirmation', () => {
    expectMapping({
      drive: hot => ({ sweepStarted$: hot('-a', { a: mw.sweepStarted() }) }),
      expected: { eventName: 'migrate wallet | review | confirmed' },
    });
  });

  it('reports a dismissed signing prompt', () => {
    expectMapping({
      drive: hot => ({
        sweepAuthCancelled$: hot('-a', { a: mw.sweepAuthCancelled() }),
      }),
      expected: { eventName: 'migrate wallet | sweep | auth cancelled' },
    });
  });

  it('reports a destination device failure as a pause with its reason', () => {
    expectMapping({
      drive: hot => ({
        destinationDeviceFailed$: hot('-a', {
          a: mw.destinationDeviceFailed({
            deviceHintKey: 'hw-error.device-locked.subtitle',
          }),
        }),
      }),
      expected: {
        eventName: 'migrate wallet | destination device | paused',
        payload: { reason: 'device-locked' },
      },
    });
  });

  it('reports a paused sweep with its reason', () => {
    expectMapping({
      drive: hot => ({
        sweepPaused$: hot('-a', {
          a: mw.sweepPaused({ errorKey: 'migrate-wallet.error.sweep-failed' }),
        }),
      }),
      expected: {
        eventName: 'migrate wallet | sweep | paused',
        payload: { reason: 'sweep-failed' },
      },
    });
  });

  it.each([
    [
      'a real delegation, naming the certificate set',
      mw.delegationSettled({
        outcome: {
          status: 'delegated',
          txId: 'tx1',
          drepId: 'drep1x',
          poolId: 'pool1x',
        },
      }),
      { outcome: 'delegated', certificates: 'stake-and-vote' },
    ],
    [
      'a vote-only delegation',
      mw.delegationSettled({
        outcome: { status: 'delegated', txId: 'tx1', drepId: 'drep1x' },
      }),
      { outcome: 'delegated', certificates: 'vote-only' },
    ],
    [
      'a skip, without inventing a certificate set',
      mw.delegationSettled({ outcome: { status: 'already-delegated' } }),
      { outcome: 'already-delegated' },
    ],
    [
      'an unconfigured target',
      mw.delegationSettled({ outcome: { status: 'unavailable' } }),
      { outcome: 'unavailable' },
    ],
  ] as const)('reports %s', (_name, action, payload) => {
    expectMapping({
      drive: hot => ({ delegationSettled$: hot('-a', { a: action }) }),
      expected: {
        eventName: 'migrate wallet | delegation | settled',
        payload,
      },
    });
    // The outcome's identifiers must never ride into PostHog.
    const sent = JSON.stringify(trackEvent.mock.calls);
    expect(sent).not.toContain('tx1');
    expect(sent).not.toContain('drep1x');
    expect(sent).not.toContain('pool1x');
  });

  it('reports a delegation pause with its phase', () => {
    expectMapping({
      drive: hot => ({
        delegationPaused$: hot('-a', {
          a: mw.delegationPaused({
            errorKey: 'migrate-wallet.error.delegation-failed',
            phase: 'signing',
          }),
        }),
      }),
      expected: {
        eventName: 'migrate wallet | delegation | paused',
        payload: { phase: 'signing' },
      },
    });
  });

  it('reports a delegation retry press', () => {
    expectMapping({
      drive: hot => ({
        delegationRetryRequested$: hot('-a', {
          a: mw.delegationRetryRequested(),
        }),
      }),
      expected: { eventName: 'migrate wallet | delegation | retry | press' },
    });
  });

  it('reports an abandoned delegation with the phase the user gave up at', () => {
    expectMapping({
      drive: hot => ({
        delegationAbandoned$: hot('-a', { a: mw.delegationAbandoned() }),
      }),
      state: hot => ({
        selectDelegationFailurePhase$: hot('a', { a: 'submission' }),
      }),
      expected: {
        eventName: 'migrate wallet | delegation | abandoned',
        payload: { phase: 'submission' },
      },
    });
  });

  it('reports a sweep retry press', () => {
    expectMapping({
      drive: hot => ({
        sweepRetryRequested$: hot('-a', { a: mw.sweepRetryRequested() }),
      }),
      expected: { eventName: 'migrate wallet | sweep | retry | press' },
    });
  });

  it('reports success with chunk/account counts and 3-sig-fig ADA, never the txId', () => {
    expectMapping({
      drive: hot => ({
        sweepSucceeded$: hot('--a', {
          a: mw.sweepSucceeded({
            txId: 'SECRET-ON-CHAIN-ID',
            // 12_345.67 ADA swept coin + 200 ADA rewards → 12 500 at 3 s.f.
            withdrawnRewards: 200_000_000n,
          }),
        }),
      }),
      state: hot => ({
        selectSweepProgress$: hot('-a', {
          a: { totalChunks: 3, submittedChunks: [] },
        }),
        selectDiscovery$: hot('-a', {
          a: { ...discovery, totalCoin: '12345670000' },
        }),
      }),
      expected: {
        eventName: 'migrate wallet | sweep | succeeded',
        payload: { chunks: 3, accounts: 2, ada: 12_500 },
      },
    });
  });

  it('reports success as one chunk and account on the single-tx path (no records)', () => {
    expectMapping({
      drive: hot => ({
        sweepSucceeded$: hot('-a', { a: mw.sweepSucceeded({ txId: 't' }) }),
      }),
      expected: {
        eventName: 'migrate wallet | sweep | succeeded',
        payload: { chunks: 1, accounts: 1, ada: 0 },
      },
    });
  });

  it('attributes a failure to the last ACTIVE step, not the post-reducer one', () => {
    expectMapping({
      drive: hot => ({
        stepFailed$: hot('---a', {
          a: mw.stepFailed({
            errorKey: 'migrate-wallet.error.discovery-failed',
          }),
        }),
      }),
      // The reducer has already moved the step to 'failed' by the time the
      // effect sees the action; the lagging stream must skip it.
      state: hot => ({
        selectStep$: hot('-ab', { a: 'discovering', b: 'failed' }),
      }),
      expected: {
        eventName: 'migrate wallet | step | failure',
        payload: { step: 'discovering', reason: 'discovery-failed' },
      },
    });
  });

  it('attributes a cancellation to the step it abandoned, done meaning completion', () => {
    expectMapping({
      drive: hot => ({
        wizardCancelled$: hot('---a', { a: mw.wizardCancelled() }),
      }),
      state: hot => ({
        selectStep$: hot('-ab', { a: 'done', b: 'idle' }),
      }),
      expected: {
        eventName: 'migrate wallet | wizard | cancelled',
        payload: { step: 'done' },
      },
    });
  });

  it('reports a cancellation before any step as none', () => {
    expectMapping({
      drive: hot => ({
        wizardCancelled$: hot('-a', { a: mw.wizardCancelled() }),
      }),
      expected: {
        eventName: 'migrate wallet | wizard | cancelled',
        payload: { step: 'none' },
      },
    });
  });
});
