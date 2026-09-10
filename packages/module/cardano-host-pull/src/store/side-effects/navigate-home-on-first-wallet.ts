import {
  distinctUntilChanged,
  filter,
  map,
  pairwise,
  withLatestFrom,
} from 'rxjs';

import type { SideEffect } from '../..';

const HomeRoute = 'Home';
const ONBOARDING_ROUTE_PREFIX = 'Onboarding';

/**
 * Land the guest on Home when the FIRST wallet projects into the repo. The
 * host create/import ceremonies resolve on MOUNT (ADR 34 pull model), so no
 * onboarding side effect ever observes their completion — the projection
 * itself is the completion signal. The Router captures its initial route once
 * at mount, so a wallet landing while the user sits on onboarding needs this
 * explicit navigation. Guarded to onboarding (or no explicit page yet) so a
 * projection can never yank the user away from a page they navigated to.
 */
export const navigateHomeOnFirstWallet: SideEffect = (
  _,
  { wallets: { selectTotal$ }, views: { getActivePage$ } },
  { actions },
) =>
  selectTotal$.pipe(
    map(total => total > 0),
    distinctUntilChanged(),
    pairwise(),
    filter(([hadWallets, hasWallets]) => !hadWallets && hasWallets),
    withLatestFrom(getActivePage$),
    filter(
      ([, activePage]) =>
        !activePage || activePage.route.startsWith(ONBOARDING_ROUTE_PREFIX),
    ),
    map(() => actions.views.setActivePage({ route: HomeRoute })),
  );
