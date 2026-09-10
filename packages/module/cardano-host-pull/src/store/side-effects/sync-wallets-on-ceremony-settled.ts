import { filter, map } from 'rxjs';

import type { SideEffect } from '../..';

/**
 * A host wallet ceremony (create/import) settled — re-sync the wallet-repo
 * projection so a newly created/imported wallet appears (pull model, ADR 34;
 * the hydrator triggers on `syncWalletsRequested$`). The `vault-extension-host`
 * arm dispatches `vault.ceremonySettled` once the host surface mount settles.
 * This module→contract edge (ADR 14 clean) replaces the guest app's former
 * post-store-init sync dispatcher.
 *
 * A settle whose surface never MOUNTED is skipped: the ceremony could not have
 * touched the vault, and the window it would open polls the host for ~10 minutes
 * (see the hydrator's ceremony ceiling) for a change that cannot arrive.
 */
export const syncWalletsOnCeremonySettled: SideEffect = (
  { vault: { ceremonySettled$ } },
  _,
  { actions },
) =>
  ceremonySettled$.pipe(
    filter(({ payload: { mounted } }) => mounted),
    map(() => actions.cardanoHostPull.syncWalletsRequested()),
  );
