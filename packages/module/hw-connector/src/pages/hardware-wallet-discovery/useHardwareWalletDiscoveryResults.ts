import { useTranslation } from '@lace-contract/i18n';
import { isStatus } from '@lace-lib/util-store';
import { useCallback, useMemo } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { IconName } from '@lace-lib/ui-toolkit';
import type { DeviceDescriptor, FoundDevice } from '@lace-lib/util-hw';

export interface HardwareWalletDevice {
  id: string;
  name: string;
  icon: IconName;
}

/** Stable empty array reference — avoids busting useMemo on every render. */
const EMPTY_DEVICES: readonly FoundDevice[] = [];

const KNOWN_ICONS: ReadonlySet<IconName> = new Set<IconName>([
  'CellularNetwork',
  'UsbMemory',
]);

const asIconName = (icon: string): IconName =>
  (KNOWN_ICONS.has(icon as IconName) ? icon : 'UsbMemory') as IconName;

const deviceListId = (descriptor: DeviceDescriptor) =>
  descriptor.kind === 'ble'
    ? descriptor.id
    : `usb-${descriptor.vendorId}-${descriptor.productId}-${
        descriptor.serialNumber ?? 'no-serial'
      }`;

export const useHardwareWalletDiscoveryResults = () => {
  const { t } = useTranslation();
  const state = useLaceSelector('hwConnectorMobile.selectState');
  const dispatchDeviceSelected = useDispatchLaceAction(
    'hwConnectorMobile.deviceSelected',
  );
  const dispatchCancel = useDispatchLaceAction('hwConnectorMobile.cancel');

  const foundDevices: readonly FoundDevice[] = isStatus(state, 'Searching')
    ? state.devices
    : EMPTY_DEVICES;

  const devices = useMemo<HardwareWalletDevice[]>(
    () =>
      foundDevices.map(found => ({
        id: deviceListId(found.deviceDescriptor),
        name: found.displayName,
        icon: asIconName(found.icon),
      })),
    [foundDevices],
  );

  const onDeviceSelect = useCallback(
    (selected: HardwareWalletDevice) => {
      const found = foundDevices.find(
        device => deviceListId(device.deviceDescriptor) === selected.id,
      );
      if (!found) return;
      dispatchDeviceSelected({ device: found.deviceDescriptor });
    },
    [foundDevices, dispatchDeviceSelected],
  );

  return {
    title: t('v2.hardware-wallet.results.title'),
    devices,
    onDeviceSelect,
    onCancel: dispatchCancel,
    statusText: t('v2.hardware-wallet.searching.pleaseWait'),
    instructionText: t('v2.hardware-wallet.searching.ensureConnected'),
    detailText: t('v2.hardware-wallet.searching.instruction'),
    linkText: t('v2.hardware-wallet.searching.here'),
    cancelButtonLabel: t('app.cancel'),
  };
};
