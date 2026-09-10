// The monolith guest-data import (ADR 38), in two legs joined by one marker
// action:
//
//   importMonolithGuestData    — pull once at store init, dispatch what reads,
//                                then the marker.
//   clearMigratedMonolithGuestData — on the marker: flush redux-persist, then
//                                report, which is what deletes the legacy keys.
//
// The split exists because "report only after the import is DURABLE" cannot be
// expressed in one stream: a side effect's emissions reach the reducers through
// the epic middleware, so the only in-band proof that they landed is seeing the
// last of them come back on `action$`. Reporting earlier would delete the sole
// remaining copy of data still queued for the guest's storage.
//
// Every failure arm leans the same way — do NOT report. An error result, a wire
// failure, a refused flush: all leave the legacy keys in place, and the next boot
// re-pulls and re-imports (see importActions for what makes that safe).

import {
  catchError,
  concatMap,
  defer,
  EMPTY,
  filter,
  ignoreElements,
  map,
  take,
  tap,
} from 'rxjs';

import {
  analyticsUserIdFromWire,
  contactsFromWire,
  tokenFoldersFromWire,
} from '../../mappers';

import type {
  ActionCreators,
  MigrateMonolithGuestDataAction,
  SideEffect,
} from '../..';
import type { Folder } from '@lace-contract/tokens';
import type {
  LaceResult,
  MonolithGuestData,
} from '@lace-lib/extension-shell-api';

const isOk = <T>(
  result: LaceResult<T>,
): result is Extract<LaceResult<T>, { ok: true }> => result.ok;

/** Whether the pull carried anything at all. All three null is the steady state —
 * a profile that never ran the monolith, or one already imported and cleared — and
 * must produce no dispatch and no report. A PRESENT but empty slice still counts:
 * its key needs clearing. */
const hasMonolithData = (data: MonolithGuestData): boolean =>
  data.addressBook !== null ||
  data.tokenFolders !== null ||
  data.analytics !== null;

/**
 * The import as a list of dispatches. RE-RUNNABLE: `addContact` is keyed by
 * contact id, `addTokensToFolder` de-duplicates and `analytics.load` overwrites,
 * so a second pass converges — but `createFolder` unshifts unconditionally, so
 * folders already in the store are skipped rather than duplicated. This matters
 * because a pass whose report never landed IS re-run on the next boot.
 */
const importActions = (
  actions: ActionCreators,
  data: MonolithGuestData,
  existingFolders: Folder[],
): MigrateMonolithGuestDataAction[] => {
  const imported: MigrateMonolithGuestDataAction[] = [];
  for (const contact of contactsFromWire(data.addressBook)) {
    imported.push(actions.addressBook.addContact(contact));
  }
  const { folders, tokenIdsByFolderId } = tokenFoldersFromWire(
    data.tokenFolders,
  );
  const existing = new Set<string>(existingFolders.map(folder => folder.id));
  // Reversed: each createFolder unshifts, so oldest-first replays the legacy
  // array's newest-first order.
  for (const folder of [...folders].reverse()) {
    if (existing.has(folder.id)) continue;
    imported.push(actions.tokenFolders.createFolder(folder));
  }
  for (const folder of folders) {
    const tokenIds = tokenIdsByFolderId[folder.id];
    if (tokenIds === undefined) continue;
    imported.push(
      actions.tokenFolders.addTokensToFolder({ folderId: folder.id, tokenIds }),
    );
  }
  const analyticsUserId = analyticsUserIdFromWire(data.analytics);
  if (analyticsUserId !== undefined) {
    imported.push(actions.analytics.load({ id: analyticsUserId }));
  }
  return imported;
};

export const importMonolithGuestData: SideEffect = (
  _actionObservables,
  { tokenFolders: { selectAllFolders$ } },
  { actions, canMigrateMonolithGuestData, pullMonolithGuestData },
) => {
  // FEATURE-GATED (ADR 41 handshake): a host without the pair has no legacy data
  // to hand over, so the whole import is a silent no-op.
  if (!canMigrateMonolithGuestData) return EMPTY;
  return defer(pullMonolithGuestData).pipe(
    filter(isOk),
    map(({ value }) => value),
    filter(hasMonolithData),
    concatMap(data =>
      selectAllFolders$.pipe(
        take(1),
        concatMap(existingFolders => [
          ...importActions(actions, data, existingFolders),
          // LAST: the completion leg keys off it (see the header).
          actions.migrateMonolithGuestData.monolithGuestDataImported(),
        ]),
      ),
    ),
  );
};

export const clearMigratedMonolithGuestData: SideEffect = (
  { migrateMonolithGuestData: { monolithGuestDataImported$ } },
  _stateObservables,
  { completeMonolithGuestDataMigration, flushPersistedState, logger },
) =>
  monolithGuestDataImported$.pipe(
    concatMap(() =>
      flushPersistedState().pipe(
        concatMap(() => completeMonolithGuestDataMigration()),
        tap(result => {
          if (!result.ok) {
            logger.warn(
              'Monolith guest data imported but the host was not told; the next boot retries',
              result.error,
            );
          }
        }),
        catchError(error => {
          // A rejecting flush never reaches the report — concatMap does not
          // subscribe it — which is the point: the import may still be queued
          // for storage, and the legacy keys are its only other copy.
          logger.error(
            'Failed to persist the imported monolith guest data',
            error,
          );
          return EMPTY;
        }),
      ),
    ),
    ignoreElements(),
  );
