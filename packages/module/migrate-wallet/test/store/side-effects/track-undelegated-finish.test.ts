import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it, vi } from 'vitest';

import { makeTrackUndelegatedFinish } from '../../../src/store/side-effects/track-undelegated-finish';
import { migrateWalletActions } from '../../../src/store/slice';

import type { RunHelpers } from 'rxjs/testing';

const mocks = vi.hoisted(() => ({
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  getObservability: vi.fn(),
}));

vi.mock('@lace-lib/observability', () => ({
  LogLevel: { WARNING: 'warning' },
  getObservability: mocks.getObservability,
}));

const abandoned = (hot: RunHelpers['hot']) =>
  ({
    migrateWallet: {
      delegationAbandoned$: hot('-a', {
        a: migrateWalletActions.migrateWallet.delegationAbandoned(),
      }),
    },
  } as never);

// Values object replaced wholesale, not destructured with defaults: the
// fallback test passes explicit `undefined`s, which destructuring defaults
// would silently overwrite.
const stateFor = (
  hot: RunHelpers['hot'],
  values: { destinationType?: string; phase?: string } = {
    destinationType: 'fresh',
    phase: 'submission',
  },
) =>
  ({
    migrateWallet: {
      selectDestinationType$: hot('a', { a: values.destinationType }),
      selectDelegationFailurePhase$: hot('a', { a: values.phase }),
    },
  } as never);

const dependencies = () =>
  ({ logger: { debug: vi.fn(), error: vi.fn() } } as never);

describe('makeTrackUndelegatedFinish', () => {
  it('reports the finish as a warning message carrying only the two enums', () => {
    mocks.getObservability.mockReturnValue({
      captureMessage: mocks.captureMessage,
      addBreadcrumb: mocks.addBreadcrumb,
    });

    testSideEffect(
      makeTrackUndelegatedFinish(),
      ({ hot, expectObservable }) => ({
        actionObservables: abandoned(hot),
        stateObservables: stateFor(hot, {
          destinationType: 'hardware',
          phase: 'signing',
        }),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          // Telemetry-only: the effect must emit no actions of its own.
          expectObservable(sideEffect$).toBe('--');
        },
      }),
    );

    expect(mocks.captureMessage).toHaveBeenCalledWith(
      'migration finished with the destination undelegated',
      'warning',
    );
    // The argument order is the diagnosis: swapping the two corrupts the
    // telemetry silently.
    expect(mocks.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { destinationType: 'hardware', phase: 'signing' },
      }),
    );
    // Sentry attaches breadcrumbs only to events captured after them, so the
    // breadcrumb must be recorded before the message or the event ships bare.
    expect(mocks.addBreadcrumb.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.captureMessage.mock.invocationCallOrder[0],
    );
    vi.clearAllMocks();
  });

  it("falls back to 'unknown' rather than reporting undefined dimensions", () => {
    mocks.getObservability.mockReturnValue({
      captureMessage: mocks.captureMessage,
      addBreadcrumb: mocks.addBreadcrumb,
    });

    testSideEffect(
      makeTrackUndelegatedFinish(),
      ({ hot, expectObservable }) => ({
        actionObservables: abandoned(hot),
        stateObservables: stateFor(hot, {
          destinationType: undefined,
          phase: undefined,
        }),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('--');
        },
      }),
    );

    expect(mocks.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { destinationType: 'unknown', phase: 'unknown' },
      }),
    );
    vi.clearAllMocks();
  });

  it('survives a missing telemetry sink — the done screen must not die for a log line', () => {
    mocks.getObservability.mockImplementation(() => {
      throw new Error('Observability not initialized');
    });
    const deps = dependencies() as unknown as {
      logger: { debug: ReturnType<typeof vi.fn> };
    };

    testSideEffect(
      makeTrackUndelegatedFinish(),
      ({ hot, expectObservable }) => ({
        actionObservables: abandoned(hot),
        stateObservables: stateFor(hot),
        dependencies: deps as never,
        // No error notification: the throw is contained, the stream stays alive.
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('--');
        },
      }),
    );

    expect(deps.logger.debug).toHaveBeenCalled();
    vi.clearAllMocks();
  });
});
