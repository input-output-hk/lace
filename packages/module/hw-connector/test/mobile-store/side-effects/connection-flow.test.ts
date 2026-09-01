import { testSideEffect } from '@lace-lib/util-dev';
import { BluetoothOffError, LedgerBlePermissionError } from '@lace-lib/util-hw';
import { Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { navigateMock, closeMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  closeMock: vi.fn(),
}));

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: {
    navigate: navigateMock,
    closeSheet: closeMock,
  },
  SheetRoutes: {
    HardwareWalletDiscoveryResults: 'HardwareWalletDiscoveryResults',
    HardwareWalletDiscoveryError: 'HardwareWalletDiscoveryError',
  },
}));

import {
  handleError,
  handleSheetClose,
  makeHandleSearching,
} from '../../../src/mobile-store/side-effects/connection-flow';
import { hwConnectorMobileActions as actions } from '../../../src/mobile-store/slice';

import type { HwConnectorMobileState } from '../../../src/mobile-store/slice';
import type { FoundDevice, SearchHWDevices } from '@lace-lib/util-hw';

const idleState: HwConnectorMobileState = { status: 'Idle' };
const searchingState: HwConnectorMobileState = {
  status: 'Searching',
  devices: [],
};

const bleDevice: FoundDevice = {
  deviceDescriptor: {
    kind: 'ble',
    vendorName: 'ledger',
    id: 'AA:BB',
    name: 'Ledger',
  },
  displayName: 'Ledger',
  icon: 'CellularNetwork',
};

const usbDevice: FoundDevice = {
  deviceDescriptor: {
    kind: 'usb',
    vendorId: 1,
    productId: 2,
    serialNumber: 's-1',
  },
  displayName: 'Ledger Nano S',
  icon: 'UsbMemory',
};

beforeEach(() => {
  navigateMock.mockClear();
  closeMock.mockClear();
});

describe('makeHandleSearching', () => {
  it('navigates to the discovery results sheet when entering Searching', () => {
    const stop = vi.fn();
    const search: SearchHWDevices = () => ({
      results$: new Subject<FoundDevice[]>(),
      stop,
    });

    testSideEffect(makeHandleSearching([search]), ({ cold, flush }) => ({
      stateObservables: {
        hwConnectorMobile: {
          selectState$: cold<HwConnectorMobileState>('a', {
            a: searchingState,
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        sideEffect$.subscribe();
        flush();
        expect(navigateMock).toHaveBeenCalledWith(
          'HardwareWalletDiscoveryResults',
        );
      },
    }));
  });

  it('aggregates devices across multiple search providers and dispatches devicesChanged', () => {
    testSideEffect(
      {
        build: ({ cold }) => {
          const search1: SearchHWDevices = () => ({
            results$: cold<FoundDevice[]>('-a', { a: [bleDevice] }),
            stop: vi.fn(),
          });
          const search2: SearchHWDevices = () => ({
            results$: cold<FoundDevice[]>('--b', { b: [usbDevice] }),
            stop: vi.fn(),
          });
          return makeHandleSearching([search1, search2]);
        },
      },
      ({ cold, flush }) => ({
        stateObservables: {
          hwConnectorMobile: {
            selectState$: cold<HwConnectorMobileState>('a', {
              a: searchingState,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          const emitted: ReturnType<
            typeof actions.hwConnectorMobile.devicesChanged
          >[] = [];
          sideEffect$.subscribe(action => emitted.push(action as never));
          flush();

          expect(emitted).toContainEqual(
            actions.hwConnectorMobile.devicesChanged({
              devices: [bleDevice, usbDevice],
            }),
          );
        },
      }),
    );
  });

  it('calls stop on every search handle when state leaves Searching', () => {
    const stop1 = vi.fn();
    const stop2 = vi.fn();
    const search1: SearchHWDevices = () => ({
      results$: new Subject<FoundDevice[]>(),
      stop: stop1,
    });
    const search2: SearchHWDevices = () => ({
      results$: new Subject<FoundDevice[]>(),
      stop: stop2,
    });

    testSideEffect(
      makeHandleSearching([search1, search2]),
      ({ cold, flush }) => ({
        stateObservables: {
          hwConnectorMobile: {
            selectState$: cold<HwConnectorMobileState>('a-b', {
              a: searchingState,
              b: idleState,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(stop1).toHaveBeenCalledTimes(1);
          expect(stop2).toHaveBeenCalledTimes(1);
        },
      }),
    );
  });

  it('drops trailing results$ emissions after state leaves Searching', () => {
    const results$ = new Subject<FoundDevice[]>();
    const stop = vi.fn();
    const search: SearchHWDevices = () => ({ results$, stop });

    testSideEffect(makeHandleSearching([search]), ({ cold, flush }) => ({
      stateObservables: {
        hwConnectorMobile: {
          selectState$: cold<HwConnectorMobileState>('a-b', {
            a: searchingState,
            b: idleState,
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        const emitted: ReturnType<
          typeof actions.hwConnectorMobile.devicesChanged
        >[] = [];
        sideEffect$.subscribe(action => emitted.push(action as never));
        flush();
        const countBefore = emitted.length;
        // After state has left Searching, push a late emission. takeUntil
        // must have unsubscribed already so this is dropped.
        results$.next([bleDevice]);
        expect(emitted.length).toBe(countBefore);
        expect(
          emitted.some(
            action =>
              action.type ===
                actions.hwConnectorMobile.devicesChanged({
                  devices: [bleDevice],
                }).type && action.payload.devices.length > 0,
          ),
        ).toBe(false);
      },
    }));
  });

  it('dispatches errored with search-failed key when a search errors generically', () => {
    const stop = vi.fn();
    const search: SearchHWDevices = () => ({
      results$: throwError(() => new Error('something went wrong')),
      stop,
    });

    testSideEffect(makeHandleSearching([search]), ({ cold, flush }) => ({
      stateObservables: {
        hwConnectorMobile: {
          selectState$: cold<HwConnectorMobileState>('a', {
            a: searchingState,
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        const emitted: ReturnType<typeof actions.hwConnectorMobile.errored>[] =
          [];
        sideEffect$.subscribe(action => emitted.push(action as never));
        flush();
        expect(emitted).toContainEqual(
          actions.hwConnectorMobile.errored({
            errorTranslationKey: 'v2.hardware-wallet.error.search-failed',
          }),
        );
        expect(stop).toHaveBeenCalledTimes(1);
      },
    }));
  });

  it('classifies BluetoothOffError into a bluetooth-off translation key', () => {
    const stop = vi.fn();
    const search: SearchHWDevices = () => ({
      results$: throwError(() => new BluetoothOffError()),
      stop,
    });

    testSideEffect(makeHandleSearching([search]), ({ cold, flush }) => ({
      stateObservables: {
        hwConnectorMobile: {
          selectState$: cold<HwConnectorMobileState>('a', {
            a: searchingState,
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        const emitted: ReturnType<typeof actions.hwConnectorMobile.errored>[] =
          [];
        sideEffect$.subscribe(action => emitted.push(action as never));
        flush();
        expect(emitted).toContainEqual(
          actions.hwConnectorMobile.errored({
            errorTranslationKey: 'v2.hardware-wallet.error.bluetooth-off',
          }),
        );
      },
    }));
  });

  it('classifies LedgerBlePermissionError into a ble-permissions-denied translation key', () => {
    const stop = vi.fn();
    const search: SearchHWDevices = () => ({
      results$: throwError(() => new LedgerBlePermissionError()),
      stop,
    });

    testSideEffect(makeHandleSearching([search]), ({ cold, flush }) => ({
      stateObservables: {
        hwConnectorMobile: {
          selectState$: cold<HwConnectorMobileState>('a', {
            a: searchingState,
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        const emitted: ReturnType<typeof actions.hwConnectorMobile.errored>[] =
          [];
        sideEffect$.subscribe(action => emitted.push(action as never));
        flush();
        expect(emitted).toContainEqual(
          actions.hwConnectorMobile.errored({
            errorTranslationKey:
              'v2.hardware-wallet.error.ble-permissions-denied',
          }),
        );
      },
    }));
  });
});

describe('handleError', () => {
  it('navigates to the error sheet when entering Error state', () => {
    const errorState: HwConnectorMobileState = {
      status: 'Error',
      errorTranslationKey: 'v2.hardware-wallet.error.search-failed',
    };

    testSideEffect(handleError, ({ cold, flush }) => ({
      stateObservables: {
        hwConnectorMobile: {
          selectState$: cold<HwConnectorMobileState>('a', { a: errorState }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        sideEffect$.subscribe();
        flush();
        expect(navigateMock).toHaveBeenCalledWith(
          'HardwareWalletDiscoveryError',
        );
      },
    }));
  });
});

describe('handleSheetClose', () => {
  it('closes the discovery sheet when cancel is dispatched', () => {
    testSideEffect(handleSheetClose, ({ cold, flush }) => ({
      actionObservables: {
        hwConnectorMobile: {
          cancel$: cold('a', { a: actions.hwConnectorMobile.cancel() }),
          deviceSelected$: cold('-'),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        sideEffect$.subscribe();
        flush();
        expect(closeMock).toHaveBeenCalledTimes(1);
      },
    }));
  });

  it('closes the discovery sheet when a device is selected', () => {
    testSideEffect(handleSheetClose, ({ cold, flush }) => ({
      actionObservables: {
        hwConnectorMobile: {
          cancel$: cold('-'),
          deviceSelected$: cold('a', {
            a: actions.hwConnectorMobile.deviceSelected({
              device: bleDevice.deviceDescriptor,
            }),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        sideEffect$.subscribe();
        flush();
        expect(closeMock).toHaveBeenCalledTimes(1);
      },
    }));
  });
});
