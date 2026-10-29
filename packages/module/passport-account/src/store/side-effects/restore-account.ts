import {
  catchError,
  concat,
  defer,
  EMPTY,
  filter,
  map,
  mergeMap,
  of,
} from 'rxjs';

import { ledger } from '../../acc/acc-module';
import { readGrants } from '../../acc/read-grants';
import { storedGrantSlots } from '../../flows/stored-grants';
import { createIndexerClient } from '../../infra/indexer';
import { createAccountRecordStore } from '../account-record';

import type { PassportAccountRecord } from '../account-record';
import type {
  PassportNetworkConfig,
  SideEffect,
} from '@lace-contract/passport';
import type { Observable } from 'rxjs';

type StoreActions = Parameters<SideEffect>[2]['actions'];
type SideEffectAction = ReturnType<SideEffect> extends Observable<infer A>
  ? A
  : never;

/** Whether a stored record names an activated account rather than a deployment in progress. */
const isActivatedRecord = (
  record: PassportAccountRecord | undefined,
): record is PassportAccountRecord =>
  record !== undefined && record.deployment === undefined;

/**
 * The grant roster of the restored account, read from chain with the
 * slots the record kept. The read needs no ceremony, but it does need
 * the indexer: a contract it does not serve, or a read it fails, leaves
 * the roster empty rather than failing the restore, and the next sign-in
 * or grant call reads it again.
 */
const restoreGrants = (
  record: PassportAccountRecord,
  { indexerUrl, indexerWsUrl }: PassportNetworkConfig,
  actions: StoreActions,
): Observable<SideEffectAction> =>
  defer(async () =>
    createIndexerClient({ indexerUrl, indexerWsUrl }).queryContractState(
      record.address,
    ),
  ).pipe(
    filter(state => state !== null && state !== undefined),
    map(state =>
      actions.passport.setGrants(
        readGrants(ledger(state.data), storedGrantSlots(record.grants)),
      ),
    ),
    catchError(() => EMPTY),
  );

/**
 * Rehydrates the persisted account record into the store on startup, so a
 * returning user's account is recognised without a new passkey ceremony.
 * Only a record whose activation succeeded is restored, hence status
 * 'ready'; a record still carrying a pending deployment names no usable
 * account and is left for the create flow to resume, or for sign-in to
 * complete once the chain shows it activated. The device set is not
 * persisted and is rebuilt from chain by the device-management flows; the
 * grant roster is read from chain here, once the account is published,
 * so a consumer lists grants without a ceremony. A record sealed by a
 * passkey authoriser cannot be opened without a ceremony, and a ceremony
 * cannot run without a user gesture, so no storage key is passed here: a
 * sealed record reads as absent and the sign-in flow recognises the
 * account instead.
 */
export const restorePassportAccount: SideEffect = (
  _actionObservables,
  _stateObservables,
  { actions, createKeyValueStorage, passportNetwork },
) =>
  createAccountRecordStore(createKeyValueStorage)
    .read()
    .pipe(
      filter(isActivatedRecord),
      mergeMap(record =>
        concat(
          of(
            actions.passport.setAccount({
              address: record.address,
              bindingVersion: record.bindingVersion,
              status: 'ready',
              networkId: passportNetwork.networkId,
            }),
            actions.passport.setLocalUseCounter(record.localUseCounter),
          ),
          restoreGrants(record, passportNetwork, actions),
        ),
      ),
    );
