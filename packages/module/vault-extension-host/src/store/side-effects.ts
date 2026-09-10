import { MidnightNetworkId } from '@lace-contract/midnight-context';
import { catchError, concat, from, mergeMap, of, withLatestFrom } from 'rxjs';

import { vaultCeremonyFailureId } from '../failure-id';
import {
  requestConnectHardwareWallet,
  requestCreateWallet,
  requestImportWallet,
  requestRenameAccount,
  requestWalletManager,
} from '../lace-client';

import type { SideEffect } from '..';
import type { TranslationKey } from '@lace-contract/i18n';
import type { Ceremony } from '@lace-contract/vault';
import type {
  LaceResult,
  SurfaceMountResult,
} from '@lace-lib/extension-shell-api';

// The mount-failure report is dev-visible only (silent UX, ADR 36) — it feeds
// analytics through the failures store and is never rendered to the user. We
// reuse an existing generic string rather than mint a vault-specific i18n key
// (provenance for a never-rendered message is not worth the churn); the
// FailureId carries the real per-ceremony signal.
export const CEREMONY_MOUNT_FAILED_MESSAGE =
  'tx-executor.submission-error.generic.title' as TranslationKey;

// The wire is resolve-on-mount with no user-cancel signal (ADR 36): only a
// failed MOUNT is observable. A rejected promise / `ok: false` / `mounted:
// false` all count as a mount failure.
const isMountFailure = (result: LaceResult<SurfaceMountResult>): boolean =>
  !result.ok || !result.value.mounted;

type SideEffectActions = Parameters<SideEffect>[2]['actions'];

// Raised BEFORE the host round-trip, which is the whole point: the mount can
// take seconds on a cold MV3 service worker and the pressed control has nothing
// else to show. redux-observable dispatches epic emissions synchronously and the
// guest store is in-page, so the flag flips in the same React commit as the
// press. Every launch below pairs it with exactly one `ceremonySettled`.
const launching = (
  ceremony: Ceremony,
  actions: SideEffectActions,
  walletId?: string,
) => of(actions.vault.ceremonyLaunching({ ceremony, walletId }));

// Any outcome settles (ADR 52), and the `mounted` flag is what tells the
// consumers apart: on a mounted surface `cardano-host-pull` re-syncs the
// wallet-repo projection (pull model, ADR 34); a mount that never came up
// changed nothing, so it carries `mounted: false` and no re-sync follows — a
// known-failed mount used to open the ~10-minute ceremony poll window for a
// change that by construction does not exist.
const settle = (ceremony: Ceremony, actions: SideEffectActions) =>
  actions.vault.ceremonySettled({ ceremony, mounted: true });

// A mount failure additionally reports to the failures store (dev-visible only).
const failAndSettle = (ceremony: Ceremony, actions: SideEffectActions) => [
  actions.failures.addFailure({
    failureId: vaultCeremonyFailureId(ceremony),
    message: CEREMONY_MOUNT_FAILED_MESSAGE,
  }),
  actions.vault.ceremonySettled({ ceremony, mounted: false }),
];

// The guest passes its ACTIVE Midnight network to the host (ADR 41) so the
// host first-syncs THAT network's account with the keys still warm from the
// ceremony — otherwise the guest, on a different network, later pokes
// `requestMidnightSync` and mounts the unlock prompt (ADR 34/47). The active id
// from the network slice is a `BlockchainNetworkId` (`midnight-<sdkId>`);
// `getNetworkNameId` converts it to the SDK id the host warms, or undefined
// when Midnight has no active network.
export const requestCreateWalletCeremony: SideEffect = (
  { vault: { createWalletCeremonyRequested$ } },
  { network: { selectActiveNetworkId$ } },
  { actions },
) =>
  createWalletCeremonyRequested$.pipe(
    withLatestFrom(selectActiveNetworkId$),
    mergeMap(([, selectActiveNetworkId]) => {
      const activeMidnightNetworkId = selectActiveNetworkId('Midnight');
      const midnightNetwork = activeMidnightNetworkId
        ? MidnightNetworkId.getNetworkNameId(activeMidnightNetworkId)
        : undefined;
      return concat(
        launching('create', actions),
        from(requestCreateWallet(midnightNetwork)).pipe(
          mergeMap(result =>
            isMountFailure(result)
              ? from(failAndSettle('create', actions))
              : of(settle('create', actions)),
          ),
          catchError(() => from(failAndSettle('create', actions))),
        ),
      );
    }),
  );

export const requestImportWalletCeremony: SideEffect = (
  { vault: { importWalletCeremonyRequested$ } },
  { network: { selectActiveNetworkId$ } },
  { actions },
) =>
  importWalletCeremonyRequested$.pipe(
    withLatestFrom(selectActiveNetworkId$),
    mergeMap(([, selectActiveNetworkId]) => {
      const activeMidnightNetworkId = selectActiveNetworkId('Midnight');
      const midnightNetwork = activeMidnightNetworkId
        ? MidnightNetworkId.getNetworkNameId(activeMidnightNetworkId)
        : undefined;
      return concat(
        launching('import', actions),
        from(requestImportWallet(midnightNetwork)).pipe(
          mergeMap(result =>
            isMountFailure(result)
              ? from(failAndSettle('import', actions))
              : of(settle('import', actions)),
          ),
          catchError(() => from(failAndSettle('import', actions))),
        ),
      );
    }),
  );

// Add-account rides the wallet-manager ceremony (ADR 36 — the new account is
// derived behind the password typed inside the manager surface). The wire's
// `walletId` is threaded as the manager's non-authoritative wallet hint. The
// request resolves on MOUNT, not completion, so the `ceremonySettled` re-sync
// relies on the wallet-repo hydrator polling `wallets.list` until the appended
// account appears (the hydrator diffs at account grain — a new account is an
// update).
export const requestAddAccountCeremony: SideEffect = (
  { vault: { addAccountCeremonyRequested$ } },
  _,
  { actions },
) =>
  addAccountCeremonyRequested$.pipe(
    mergeMap(({ payload: { walletId } }) =>
      concat(
        launching('add-account', actions, walletId),
        from(requestWalletManager({ view: 'add-account', walletId })).pipe(
          mergeMap(result =>
            isMountFailure(result)
              ? from(failAndSettle('add-account', actions))
              : of(settle('add-account', actions)),
          ),
          catchError(() => from(failAndSettle('add-account', actions))),
        ),
      ),
    ),
  );

// The per-op management ceremonies (rename / remove-wallet / remove-account /
// recovery-phrase reveal) all mount the same wallet-manager surface with a
// non-authoritative view hint (ADR 36). Like add-account they resolve on MOUNT;
// the `ceremonySettled` re-sync reconciles any wallet-repo change the op made.
export const requestRenameWalletCeremony: SideEffect = (
  { vault: { renameWalletCeremonyRequested$ } },
  _,
  { actions },
) =>
  renameWalletCeremonyRequested$.pipe(
    mergeMap(({ payload: { walletId } }) =>
      concat(
        launching('rename', actions, walletId),
        from(requestWalletManager({ view: 'rename', walletId })).pipe(
          mergeMap(result =>
            isMountFailure(result)
              ? from(failAndSettle('rename', actions))
              : of(settle('rename', actions)),
          ),
          catchError(() => from(failAndSettle('rename', actions))),
        ),
      ),
    ),
  );

// The account rename rides its OWN advertised method rather than a manager view
// hint (an older host drops an unknown hint and mounts the list instead), but is
// otherwise the wallet rename's twin: resolve-on-mount, and the `ceremonySettled`
// re-sync leaves the hydrator to poll `wallets.list` until the new name lands.
export const requestRenameAccountCeremony: SideEffect = (
  { vault: { renameAccountCeremonyRequested$ } },
  _,
  { actions },
) =>
  renameAccountCeremonyRequested$.pipe(
    mergeMap(({ payload: { walletId, accountId } }) =>
      concat(
        launching('rename-account', actions, walletId),
        from(requestRenameAccount({ walletId, accountId })).pipe(
          mergeMap(result =>
            isMountFailure(result)
              ? from(failAndSettle('rename-account', actions))
              : of(settle('rename-account', actions)),
          ),
          catchError(() => from(failAndSettle('rename-account', actions))),
        ),
      ),
    ),
  );

export const requestRemoveWalletCeremony: SideEffect = (
  { vault: { removeWalletCeremonyRequested$ } },
  _,
  { actions },
) =>
  removeWalletCeremonyRequested$.pipe(
    mergeMap(({ payload: { walletId } }) =>
      concat(
        launching('remove-wallet', actions, walletId),
        from(requestWalletManager({ view: 'remove-wallet', walletId })).pipe(
          mergeMap(result =>
            isMountFailure(result)
              ? from(failAndSettle('remove-wallet', actions))
              : of(settle('remove-wallet', actions)),
          ),
          catchError(() => from(failAndSettle('remove-wallet', actions))),
        ),
      ),
    ),
  );

export const requestRemoveAccountCeremony: SideEffect = (
  { vault: { removeAccountCeremonyRequested$ } },
  _,
  { actions },
) =>
  removeAccountCeremonyRequested$.pipe(
    mergeMap(({ payload: { walletId, accountIndex } }) =>
      concat(
        launching('remove-account', actions, walletId),
        from(
          requestWalletManager({
            view: 'remove-account',
            walletId,
            accountIndex,
          }),
        ).pipe(
          mergeMap(result =>
            isMountFailure(result)
              ? from(failAndSettle('remove-account', actions))
              : of(settle('remove-account', actions)),
          ),
          catchError(() => from(failAndSettle('remove-account', actions))),
        ),
      ),
    ),
  );

export const requestRevealRecoveryPhraseCeremony: SideEffect = (
  { vault: { revealRecoveryPhraseCeremonyRequested$ } },
  _,
  { actions },
) =>
  revealRecoveryPhraseCeremonyRequested$.pipe(
    mergeMap(({ payload: { walletId } }) =>
      concat(
        launching('recovery-phrase', actions, walletId),
        from(requestWalletManager({ view: 'recovery-phrase', walletId })).pipe(
          mergeMap(result =>
            isMountFailure(result)
              ? from(failAndSettle('recovery-phrase', actions))
              : of(settle('recovery-phrase', actions)),
          ),
          catchError(() => from(failAndSettle('recovery-phrase', actions))),
        ),
      ),
    ),
  );

// Hardware-wallet pairing rides the host pairing ceremony (ADR 36 / ADR 44 —
// the transport, device I/O and xpub extraction all run inside the host-origin
// pairing window; the guest only names the device and the blockchain). The
// action's `device` / `blockchain` payload (both structurally match their wire
// counterparts) selects the transport and which chain's material is extracted.
// Pairing mints a NEW wallet from the device xpub, so like create/import it
// resolves on MOUNT and the `ceremonySettled` re-sync relies on the wallet-repo
// hydrator polling `wallets.list`.
export const requestConnectHardwareCeremony: SideEffect = (
  { vault: { connectHardwareCeremonyRequested$ } },
  _,
  { actions },
) =>
  connectHardwareCeremonyRequested$.pipe(
    mergeMap(({ payload: { device, blockchain } }) =>
      concat(
        launching('connect-hardware', actions),
        from(requestConnectHardwareWallet(device, blockchain)).pipe(
          mergeMap(result =>
            isMountFailure(result)
              ? from(failAndSettle('connect-hardware', actions))
              : of(settle('connect-hardware', actions)),
          ),
          catchError(() => from(failAndSettle('connect-hardware', actions))),
        ),
      ),
    ),
  );

export const sideEffects: SideEffect[] = [
  requestCreateWalletCeremony,
  requestImportWalletCeremony,
  requestConnectHardwareCeremony,
  requestAddAccountCeremony,
  requestRenameWalletCeremony,
  requestRenameAccountCeremony,
  requestRemoveWalletCeremony,
  requestRemoveAccountCeremony,
  requestRevealRecoveryPhraseCeremony,
];
