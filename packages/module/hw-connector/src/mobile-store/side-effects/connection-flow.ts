import { toEmpty } from '@cardano-sdk/util-rxjs';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { BluetoothOffError, LedgerBlePermissionError } from '@lace-lib/util-hw';
import { firstStateOfStatus, isStatus } from '@lace-lib/util-store';
import {
  catchError,
  combineLatest,
  filter,
  finalize,
  map,
  merge,
  of,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs';

import type { SideEffect } from '../..';
import type { TranslationKey } from '@lace-contract/i18n';
import type { FoundDevice, SearchHWDevices } from '@lace-lib/util-hw';
import type { Observable } from 'rxjs';

type SearchOutcome = { devices: FoundDevice[]; error?: unknown };

const SEARCH_ERROR_TRANSLATION_KEY =
  'v2.hardware-wallet.error.search-failed' as TranslationKey;
const BLUETOOTH_OFF_TRANSLATION_KEY =
  'v2.hardware-wallet.error.bluetooth-off' as TranslationKey;
const BLE_PERMISSIONS_TRANSLATION_KEY =
  'v2.hardware-wallet.error.ble-permissions-denied' as TranslationKey;

const classifyBleError = (error: unknown): TranslationKey => {
  if (error instanceof BluetoothOffError) return BLUETOOTH_OFF_TRANSLATION_KEY;
  if (error instanceof LedgerBlePermissionError)
    return BLE_PERMISSIONS_TRANSLATION_KEY;
  return SEARCH_ERROR_TRANSLATION_KEY;
};

export const makeHandleSearching = (
  searchHWDevices: SearchHWDevices[],
): SideEffect => {
  const startSearching = () => {
    const searchHandles = searchHWDevices.map(search => search());
    // Wrap each handle so it never errors the combined stream: a per-vendor
    // failure surfaces as `{ devices: [], error }` and lets other vendors
    // keep streaming devices. Only when every handle has errored do we
    // escalate to the Error state.
    const outcomes$: Observable<SearchOutcome>[] = searchHandles.map(h =>
      h.results$.pipe(
        map((devices): SearchOutcome => ({ devices })),
        startWith<SearchOutcome>({ devices: [] }),
        catchError(error => of<SearchOutcome>({ devices: [], error })),
      ),
    );
    return {
      outcomes$:
        outcomes$.length === 0
          ? of<SearchOutcome[]>([])
          : combineLatest(outcomes$),
      stop: () => {
        searchHandles.forEach(h => {
          h.stop();
        });
      },
    };
  };

  return (_, { hwConnectorMobile: { selectState$ } }, { actions }) =>
    firstStateOfStatus(selectState$, 'Searching').pipe(
      tap(() => {
        NavigationControls.navigate(SheetRoutes.HardwareWalletDiscoveryResults);
      }),
      switchMap(() => {
        const { outcomes$, stop } = startSearching();
        const leavingSearching$ = selectState$.pipe(
          filter(state => !isStatus(state, 'Searching')),
          take(1),
        );
        return outcomes$.pipe(
          map(outcomes => {
            const areAllErrored =
              outcomes.length > 0 && outcomes.every(o => o.error !== undefined);
            if (areAllErrored) {
              const firstError = outcomes.find(
                o => o.error !== undefined,
              )?.error;
              return actions.hwConnectorMobile.errored({
                errorTranslationKey: classifyBleError(firstError),
              });
            }
            return actions.hwConnectorMobile.devicesChanged({
              devices: outcomes.flatMap(o => o.devices),
            });
          }),
          takeUntil(leavingSearching$),
          finalize(stop),
        );
      }),
    );
};

export const handleError: SideEffect = (
  _,
  { hwConnectorMobile: { selectState$ } },
) =>
  firstStateOfStatus(selectState$, 'Error').pipe(
    tap(() => {
      NavigationControls.navigate(SheetRoutes.HardwareWalletDiscoveryError);
    }),
    toEmpty,
  );

export const handleSheetClose: SideEffect = ({
  hwConnectorMobile: { cancel$, deviceSelected$ },
}) =>
  merge(cancel$, deviceSelected$).pipe(
    tap(() => {
      NavigationControls.closeSheet();
    }),
    toEmpty,
  );
