import { filter, mergeMap } from 'rxjs';

import { createAccountRecordStore } from '../account-record';

import type { PassportAccountRecord } from '../account-record';
import type { SideEffect } from '@lace-contract/passport';

/**
 * Rehydrates the persisted account record into the store on startup, so a
 * returning user's account is recognised without a new passkey ceremony.
 * The record only exists once activation succeeded, hence status 'ready';
 * the device set is not persisted and is rebuilt from chain by the
 * device-management flows. A record sealed by a passkey authoriser cannot
 * be opened without a ceremony, and a ceremony cannot run without a user
 * gesture, so no storage key is passed here: a sealed record reads as
 * absent and the sign-in flow recognises the account instead.
 */
export const restorePassportAccount: SideEffect = (
  _actionObservables,
  _stateObservables,
  { actions, createKeyValueStorage },
) =>
  createAccountRecordStore(createKeyValueStorage)
    .read()
    .pipe(
      filter((record): record is PassportAccountRecord => record !== undefined),
      mergeMap(record => [
        actions.passport.setAccount({
          address: record.address,
          bindingVersion: record.bindingVersion,
          status: 'ready',
        }),
        actions.passport.setLocalUseCounter(record.localUseCounter),
      ]),
    );
