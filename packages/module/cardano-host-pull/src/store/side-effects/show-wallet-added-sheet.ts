import { filter, map, pairwise, switchMap, take } from 'rxjs';

import type { SideEffect } from '../..';
import type { WalletId } from '@lace-contract/wallet-repo';

const SuccessCreateNewWalletRoute = 'SuccessCreateNewWallet';

/**
 * Surface success when an Nth wallet projects into the repo, mirroring the
 * monolith's add-wallet completion: the account-management arm ends every
 * successful create / import / hardware-pair with
 * `views.setActiveSheetPage({ route: 'SuccessCreateNewWallet', … })`, and its CTA
 * carries the user on to the new wallet's settings.
 *
 * The shell needs its own trigger because a host ceremony resolves on MOUNT
 * (ADR 34 pull model): nothing guest-side observes the pairing finishing, so the
 * projection is again the only completion signal — and without this the AddWallet
 * sheet the user launched from stayed open behind the closed pairing window,
 * looking like the pairing had failed.
 *
 * Scoped to a wallet landing after a ceremony THIS view raised, so a projection
 * that merely reconciles a repo another view already changed cannot congratulate
 * the user for a wallet they did not just add. The FIRST wallet is excluded
 * too: it lands during onboarding, where navigateHomeOnFirstWallet owns the
 * progression and a sheet would fight it.
 *
 * A settle whose surface never MOUNTED is skipped: no wallet can follow it, and
 * `switchMap` would otherwise let it cancel the watch a real ceremony armed.
 */
export const showWalletAddedSheet: SideEffect = (
  { vault: { ceremonySettled$ } },
  { wallets: { selectIds$ } },
  { actions },
) =>
  ceremonySettled$.pipe(
    filter(({ payload: { mounted } }) => mounted),
    switchMap(() =>
      selectIds$.pipe(
        pairwise(),
        filter(([before]) => before.length > 0),
        map(([before, after]) => after.find(id => !before.includes(id))),
        filter((walletId): walletId is WalletId => walletId !== undefined),
        take(1),
      ),
    ),
    map(walletId =>
      actions.views.setActiveSheetPage({
        route: SuccessCreateNewWalletRoute,
        params: { walletId },
      }),
    ),
  );
