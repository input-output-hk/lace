import { filter, map, merge, startWith, withLatestFrom } from 'rxjs';

import type { SideEffect } from '../..';

/**
 * Lovelace → ADA rounded to 3 significant figures, the same approximation the
 * voting-power super property reports (analytics-posthog,
 * `approximateVotingPower`) — mirrored here because modules cannot import from
 * modules. Coarse enough not to fingerprint a wallet by its exact balance,
 * numeric enough for PostHog to aggregate totals and distributions.
 */
const approximateAda = (lovelace: bigint): number => {
  const ada = Number(lovelace) / 1_000_000;
  if (!Number.isFinite(ada) || ada <= 0) return 0;
  return Number(ada.toPrecision(3));
};

/**
 * Maps the wizard's business milestones to PostHog events, in one place so the
 * taxonomy is readable top-to-bottom and every mapping is marble-testable.
 *
 * Privacy boundary, deliberate: nothing here identifies the wallet. No txIds
 * (on-chain identity), no wallet/account ids, no addresses, no exact amounts.
 * The one value property — migrated ADA on success — is approximated to
 * 3 significant figures, matching the voting-power super property's
 * established precision. Everything else is counts, kinds, and i18n reason
 * keys.
 */
export const makeTrackAnalytics =
  (): SideEffect => (actionObservables, stateObservables, dependencies) => {
    const {
      migrateWallet: {
        wizardOpened$,
        destinationTypeChosen$,
        destinationCreated$,
        sourceImported$,
        discoveryCompleted$,
        discoveryRetryRequested$,
        destinationDeviceFailed$,
        migrationUnsupported$,
        attestationRefused$,
        sweepStarted$,
        sweepAuthCancelled$,
        sweepPaused$,
        sweepRetryRequested$,
        sweepSucceeded$,
        delegationSettled$,
        delegationPaused$,
        delegationRetryRequested$,
        delegationAbandoned$,
        stepFailed$,
        wizardCancelled$,
      },
    } = actionObservables;
    const {
      migrateWallet: {
        selectStep$,
        selectSweepProgress$,
        selectDiscovery$,
        selectDelegationFailurePhase$,
      },
    } = stateObservables;
    const { trackEvent } = dependencies.actions.analytics;

    const reason = (errorKey: string) =>
      errorKey.replace('migrate-wallet.error.', '');
    const hintReason = (hintKey: string) =>
      hintKey.replace('hw-error.', '').replace('.subtitle', '');

    // The step a terminal action interrupted. Read from a lagging stream
    // rather than withLatestFrom(selectStep$) directly: by the time the effect
    // sees wizardCancelled/stepFailed the reducer has already moved the step to
    // idle/failed, so the latest *active* step is the one that answers "where
    // did they drop off".
    const lastActiveStep$ = selectStep$.pipe(
      filter(step => step !== 'idle' && step !== 'failed'),
      startWith('none'),
    );

    return merge(
      wizardOpened$.pipe(
        map(({ payload }) =>
          trackEvent({
            eventName: 'migrate wallet | intro | view',
            payload: { origin: payload.origin ?? 'unknown' },
          }),
        ),
      ),
      destinationTypeChosen$.pipe(
        map(({ payload }) =>
          trackEvent({
            eventName: 'migrate wallet | destination | chosen',
            payload: { type: payload.type },
          }),
        ),
      ),
      // Fires once the destination wallet exists — after the password and the
      // backup/verify ceremony (or the hardware connect), which is the
      // heaviest UX in the flow. Without this stage the funnel jumps straight
      // from choosing a destination kind to importing the source, hiding the
      // ceremony's dropout entirely.
      destinationCreated$.pipe(
        map(() =>
          trackEvent({ eventName: 'migrate wallet | destination | created' }),
        ),
      ),
      sourceImported$.pipe(
        map(() =>
          trackEvent({ eventName: 'migrate wallet | source | imported' }),
        ),
      ),
      // The shape of what users bring: multi-account share, chunked share, and
      // whether rewards/deposits exist. Counts only — never values.
      discoveryCompleted$.pipe(
        map(({ payload: { discovery } }) =>
          trackEvent({
            eventName: 'migrate wallet | discovery | completed',
            payload: {
              utxos: discovery.utxoCount,
              accounts: discovery.sweptAccountCount,
              assets: discovery.assets.length,
              chunks: discovery.chunkCount,
              rewards: discovery.withdrawableRewards !== '0',
              deposit: discovery.retainedStakeDeposit !== '0',
            },
          }),
        ),
      ),
      discoveryRetryRequested$.pipe(
        map(() =>
          trackEvent({
            eventName: 'migrate wallet | discovery | retry | press',
          }),
        ),
      ),
      // Why migrations are refused — the top business signal. The attestation
      // refusal routes to the same terminal, so it reports under the same
      // event with its own reason.
      migrationUnsupported$.pipe(
        map(({ payload }) =>
          trackEvent({
            eventName: 'migrate wallet | migration | unsupported',
            payload: { reason: reason(payload.errorKey) },
          }),
        ),
      ),
      attestationRefused$.pipe(
        map(() =>
          trackEvent({
            eventName: 'migrate wallet | migration | unsupported',
            payload: { reason: 'non-migratable-role' },
          }),
        ),
      ),
      // A paused stage like the sweep's, not a step failure: the user stays on
      // the connect screen and can recover by reconnecting.
      destinationDeviceFailed$.pipe(
        map(({ payload }) =>
          trackEvent({
            eventName: 'migrate wallet | destination device | paused',
            payload: { reason: hintReason(payload.deviceHintKey) },
          }),
        ),
      ),
      sweepStarted$.pipe(
        map(() =>
          trackEvent({ eventName: 'migrate wallet | review | confirmed' }),
        ),
      ),
      sweepAuthCancelled$.pipe(
        map(() =>
          trackEvent({ eventName: 'migrate wallet | sweep | auth cancelled' }),
        ),
      ),
      sweepPaused$.pipe(
        map(({ payload }) =>
          trackEvent({
            eventName: 'migrate wallet | sweep | paused',
            payload: { reason: reason(payload.errorKey) },
          }),
        ),
      ),
      sweepRetryRequested$.pipe(
        map(() =>
          trackEvent({ eventName: 'migrate wallet | sweep | retry | press' }),
        ),
      ),
      // chunks: 1 on the single-tx path (no progress record is ever written).
      // ada is the value migrated — swept coin plus actually-withdrawn rewards
      // — approximated to 3 significant figures, never exact.
      sweepSucceeded$.pipe(
        withLatestFrom(
          selectSweepProgress$.pipe(startWith(undefined)),
          selectDiscovery$.pipe(startWith(undefined)),
        ),
        map(([{ payload }, progress, discovery]) =>
          trackEvent({
            eventName: 'migrate wallet | sweep | succeeded',
            payload: {
              chunks: progress?.totalChunks ?? 1,
              accounts: discovery?.sweptAccountCount ?? 1,
              ada: approximateAda(
                BigInt(discovery?.totalCoin ?? '0') +
                  (payload.withdrawnRewards ?? 0n),
              ),
            },
          }),
        ),
      ),
      // ── The delegation leg (the migration's condition of use). Without
      // these the funnel ends at the sweep and the new phase — including its
      // success — is invisible. Same privacy boundary as the rest: outcome and
      // phase enums, never the pool/DRep/tx identifiers the outcome carries.
      delegationSettled$.pipe(
        map(({ payload }) =>
          trackEvent({
            eventName: 'migrate wallet | delegation | settled',
            payload: {
              outcome: payload.outcome.status,
              // Which certificate set ran — product cares whether stake moved
              // with the vote. Only a real delegation has one.
              ...(payload.outcome.status === 'delegated'
                ? {
                    certificates:
                      payload.outcome.poolId === undefined
                        ? 'vote-only'
                        : 'stake-and-vote',
                  }
                : {}),
            },
          }),
        ),
      ),
      delegationPaused$.pipe(
        map(({ payload }) =>
          trackEvent({
            eventName: 'migrate wallet | delegation | paused',
            payload: { phase: payload.phase ?? 'unknown' },
          }),
        ),
      ),
      delegationRetryRequested$.pipe(
        map(() =>
          trackEvent({
            eventName: 'migrate wallet | delegation | retry | press',
          }),
        ),
      ),
      // The give-up ending. Mirrors the Sentry undelegated-finish signal so
      // PostHog and Sentry agree on the count; the phase says which stage the
      // user gave up at.
      delegationAbandoned$.pipe(
        withLatestFrom(
          selectDelegationFailurePhase$.pipe(startWith(undefined)),
        ),
        map(([, phase]) =>
          trackEvent({
            eventName: 'migrate wallet | delegation | abandoned',
            payload: { phase: phase ?? 'unknown' },
          }),
        ),
      ),
      stepFailed$.pipe(
        withLatestFrom(lastActiveStep$),
        map(([{ payload }, step]) =>
          trackEvent({
            eventName: 'migrate wallet | step | failure',
            payload: { step, reason: reason(payload.errorKey) },
          }),
        ),
      ),
      // Fires on every exit, including the graceful one — step 'done'
      // distinguishes completion from abandonment, which is the funnel.
      wizardCancelled$.pipe(
        withLatestFrom(lastActiveStep$),
        map(([, step]) =>
          trackEvent({
            eventName: 'migrate wallet | wizard | cancelled',
            payload: { step },
          }),
        ),
      ),
    );
  };
