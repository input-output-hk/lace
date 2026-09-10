import { EMPTY, filter, map, switchMap, take } from 'rxjs';

import type { SideEffect } from '../..';

const HOME_ROUTE = 'Home';

/**
 * Land the user on Home when they cancel a wizard run that STARTED with no
 * wallets once that run has created some — the onboarding migration path.
 *
 * The Router latches its initial route once at mount, so that run closes over
 * the OnboardingStart page even though wallets now exist — a dead end whose
 * only paths forward re-create those wallets and refuse with 'already in
 * Lace'. From Home the wizard's designed retry is reachable instead: re-open
 * migration and pick the source under "A wallet already in Lace".
 *
 * Two gates keep every other exit untouched:
 * - the run must have OPENED with zero wallets, so cancels over settings,
 *   wallet-settings, or add-wallet (which all require a wallet) never match;
 * - only a `userInitiated` cancel counts — exitToWallet's finish exits reuse
 *   wizardCancelled as teardown and navigate on their own, and reacting to
 *   those would dismiss the sheets they open (e.g. set-up-staking).
 */
export const makeNavigateHomeOnCancel =
  (): SideEffect =>
  (
    { migrateWallet: { wizardOpened$, wizardCancelled$ } },
    { wallets: { selectTotal$ } },
    { actions },
  ) =>
    wizardOpened$.pipe(
      // The count AT open, read by subscription rather than withLatestFrom:
      // the store stream replays its current value, so this cannot drop an
      // open that races the state stream's first emission.
      switchMap(() => selectTotal$.pipe(take(1))),
      // switchMap: a re-opened wizard starts a fresh run; the stale run's
      // cancel listener — or its still-pending wallet wait below — must not
      // outlive it.
      switchMap(totalAtOpen =>
        totalAtOpen > 0
          ? EMPTY
          : wizardCancelled$.pipe(
              filter(({ payload }) => payload.userInitiated === true),
              take(1),
              // Wait for the first wallet rather than snapshotting the count
              // at the cancel instant: the cancel tears down TRACKING, not the
              // creation itself, so a cancel during creatingDestination or
              // importingSource sees zero wallets while one is about to land —
              // and that late arrival is exactly the state this escape exists
              // for. If no wallet ever lands the wait stays silent, and a
              // re-opened wizard supersedes it via the switchMap above.
              switchMap(() =>
                selectTotal$.pipe(
                  filter(total => total > 0),
                  take(1),
                ),
              ),
              map(() => actions.views.setActivePage({ route: HOME_ROUTE })),
            ),
      ),
    );
