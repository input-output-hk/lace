import LedgerConnection from '@cardano-foundation/ledgerjs-hw-app-cardano';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import isEqual from 'lodash/isEqual';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, State as BleState } from 'react-native-ble-plx';
import { distinctUntilChanged, ReplaySubject } from 'rxjs';

import { BluetoothOffError, LedgerBlePermissionError } from '../mobile-errors';

import type {
  BleDeviceDescriptor,
  FoundDevice,
  SearchHWDevices,
} from '../types';
import type { DescriptorEvent, Observer } from '@ledgerhq/hw-transport';
import type { Subscription as BleSubscription } from 'react-native-ble-plx';

export { BluetoothOffError, LedgerBlePermissionError } from '../mobile-errors';

interface LedgerBleDescriptor {
  id: string;
  name?: string | null;
}

type LedgerListenEvent = DescriptorEvent<LedgerBleDescriptor>;

const isAndroid31OrLater = () =>
  Platform.OS === 'android' &&
  typeof Platform.Version === 'number' &&
  Platform.Version >= 31;

const ensureBluetoothPermissions = async () => {
  if (Platform.OS !== 'android') return;

  const requiredPermissions = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ...(isAndroid31OrLater()
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : []),
  ];
  const statuses = await PermissionsAndroid.requestMultiple(
    requiredPermissions,
  );

  const hasDeniedPermissions = Object.values(statuses).some(
    status => status !== PermissionsAndroid.RESULTS.GRANTED,
  );

  if (hasDeniedPermissions) {
    throw new LedgerBlePermissionError();
  }
};

const isLedgerDevice = ({ deviceModel }: LedgerListenEvent) =>
  typeof deviceModel?.productName === 'string' &&
  deviceModel.productName.toLowerCase().includes('ledger');

const toFoundDevice = (
  descriptor: LedgerBleDescriptor,
  productName: string | undefined,
): FoundDevice => ({
  deviceDescriptor: {
    kind: 'ble',
    vendorName: 'ledger',
    model: productName,
    id: descriptor.id,
    name: descriptor.name ?? null,
  },
  displayName: productName ?? descriptor.name ?? 'Ledger',
  icon: 'CellularNetwork',
});

const sameDeviceList = (a: FoundDevice[], b: FoundDevice[]) => isEqual(a, b);

/** Lazily-instantiated; constructing a BleManager touches native modules. */
const bleManagerHolder: { current?: BleManager } = {};
const getBleManager = (): BleManager => {
  bleManagerHolder.current ??= new BleManager();
  return bleManagerHolder.current;
};

export const scanLedgerBleDevices: SearchHWDevices = () => {
  const results$ = new ReplaySubject<FoundDevice[]>(1);
  const knownDevices = new Map<string, FoundDevice>();
  let bleAvailabilitySubscription: BleSubscription | undefined;
  let listenSubscription: { unsubscribe: () => void } | undefined;
  let isCompleted = false;

  const complete = (error?: Error) => {
    if (isCompleted) return;
    isCompleted = true;
    bleAvailabilitySubscription?.remove();
    listenSubscription?.unsubscribe();
    if (error) {
      results$.error(error);
    } else {
      results$.complete();
    }
  };

  const start = async () => {
    try {
      await ensureBluetoothPermissions();
    } catch (error) {
      complete(error as Error);
      return;
    }
    // stop() may have fired during the async permission prompt; bail before
    // registering subscriptions that would otherwise leak.
    if (isCompleted) return;

    const bleManager = getBleManager();
    const availabilitySub = bleManager.onStateChange(state => {
      switch (state) {
        case BleState.PoweredOn:
        case BleState.Resetting:
        case BleState.Unknown:
          return;
        case BleState.PoweredOff: {
          complete(new BluetoothOffError());
          return;
        }
        case BleState.Unauthorized:
        case BleState.Unsupported: {
          complete(new Error(`Bluetooth ${state.toLowerCase()}`));
          return;
        }
      }
    }, true);
    if (isCompleted) {
      availabilitySub.remove();
      return;
    }
    bleAvailabilitySubscription = availabilitySub;

    const listenSub = TransportBLE.listen({
      complete: () => {
        complete(new Error('Devices listener completed'));
      },
      error: error => {
        complete(error);
      },
      next: event => {
        if (isCompleted) return;
        if (!event.descriptor.id) return;
        if (event.type === 'remove') {
          if (knownDevices.delete(event.descriptor.id)) {
            results$.next([...knownDevices.values()]);
          }
          return;
        }
        if (event.type !== 'add' || !isLedgerDevice(event)) return;
        knownDevices.set(
          event.descriptor.id,
          toFoundDevice(event.descriptor, event.deviceModel?.productName),
        );
        results$.next([...knownDevices.values()]);
      },
    } as Observer<LedgerListenEvent, Error>);
    if (isCompleted) {
      listenSub.unsubscribe();
      return;
    }
    listenSubscription = listenSub;
  };

  void start();

  return {
    results$: results$.pipe(distinctUntilChanged(sameDeviceList)),
    stop: () => {
      complete();
    },
  };
};

export const openLedgerBleDeviceConnection = async (
  descriptor: BleDeviceDescriptor,
) => {
  const transport = await TransportBLE.open(descriptor.id);
  return new LedgerConnection(transport);
};
