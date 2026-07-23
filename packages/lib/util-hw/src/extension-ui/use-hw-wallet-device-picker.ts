import { useTranslation } from '@lace-contract/i18n';
import { useCallback, useMemo, useState } from 'react';

import {
  classifyHardwareError,
  type HardwareErrorCategory,
} from '../classify-hardware-error';
// HW modules currently only loaded in the extension

import {
  isHardwarePickerOption,
  type HardwareWalletPickerOption,
  type SoftwareWalletPickerOption,
} from './types';

import type { DeviceDescriptor, RequestHWConnection } from '../types';

export interface UseHwWalletDevicePickerProps<
  HwOption extends HardwareWalletPickerOption,
> {
  loadedOnboardingOptions:
    | Array<Array<HwOption | SoftwareWalletPickerOption>>
    | undefined;
  requestHWConnection: RequestHWConnection;
  onDeviceMatched: (matchedOption: HwOption, device: DeviceDescriptor) => void;
  /**
   * Called when device matching fails -- e.g. the user dismisses the USB
   * picker, the device is not recognised, transport fails, or a wired scan
   * is requested while no wired option exists. Carries the classified
   * category before it is translated for display.
   */
  onDeviceError?: (category: HardwareErrorCategory) => void;
  /**
   * Called when an air-gapped option (no USB/BLE transport) is selected. The
   * USB/BLE scan is skipped entirely: there is no wired device to discover.
   */
  onAirGappedSelected?: (option: HwOption) => void;
}

export interface UseHwWalletDevicePickerResult<
  HwOption extends HardwareWalletPickerOption,
> {
  supportedDevices: HwOption['device'][];
  /**
   * Scans for and matches a wired device against every wired option. When no
   * wired option is available (all options air-gapped), surfaces a
   * 'not-supported' error instead of silently doing nothing.
   */
  handleConnect: () => void;
  /**
   * Selects a specific option by device id. Wired options run the scan
   * restricted to the selected option's usb/ble filters; air-gapped options
   * invoke {@link UseHwWalletDevicePickerProps.onAirGappedSelected}. Unknown
   * device ids fall back to scanning every wired option.
   */
  handleSelectDevice: (deviceId: string) => void;
  isConnecting: boolean;
  error: string | null;
}

export const useHwWalletDevicePicker = <
  HwOption extends HardwareWalletPickerOption,
>({
  loadedOnboardingOptions,
  requestHWConnection,
  onDeviceMatched,
  onDeviceError,
  onAirGappedSelected,
}: UseHwWalletDevicePickerProps<HwOption>): UseHwWalletDevicePickerResult<HwOption> => {
  const { t } = useTranslation();

  const hwOptions = useMemo(
    () =>
      loadedOnboardingOptions
        ?.flat()
        .filter(isHardwarePickerOption<HwOption | SoftwareWalletPickerOption>)
        .map(option => option as HwOption) ?? [],
    [loadedOnboardingOptions],
  );

  const wiredOptions = useMemo(
    () => hwOptions.filter(option => !option.isAirGapped),
    [hwOptions],
  );

  const [isConnecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supportedDevices = useMemo(
    () => hwOptions.map(option => option.device),
    [hwOptions],
  );

  const scanWiredDevice = useCallback(
    (optionsToScan: HwOption[]) => {
      if (isConnecting) return;
      if (optionsToScan.length === 0) {
        onDeviceError?.('not-supported');
        setError(t('hw-error.no-wired-device.subtitle'));
        return;
      }

      setConnecting(true);
      setError(null);

      void (async () => {
        try {
          const requestOptions = optionsToScan.map(option => ({
            usbFilters: option.usbFilters,
            bleFilters: option.bleFilters,
          }));
          const selectedDeviceDescriptor = await requestHWConnection(
            requestOptions,
          );

          const matchedOption =
            selectedDeviceDescriptor.kind === 'ble'
              ? optionsToScan.find(option =>
                  (option.bleFilters ?? []).some(
                    f => f.vendorName === selectedDeviceDescriptor.vendorName,
                  ),
                )
              : optionsToScan.find(option =>
                  (option.usbFilters ?? []).some(
                    f =>
                      (f.vendorId === undefined ||
                        f.vendorId === selectedDeviceDescriptor.vendorId) &&
                      (f.productId === undefined ||
                        f.productId === selectedDeviceDescriptor.productId),
                  ),
                );
          if (!matchedOption) throw new Error('Could not recognize the device');

          onDeviceMatched(matchedOption, selectedDeviceDescriptor);
        } catch (error_: unknown) {
          const category = classifyHardwareError(error_);
          onDeviceError?.(category);
          setError(t(`hw-error.${category}.subtitle`));
        } finally {
          setConnecting(false);
        }
      })();
    },
    [isConnecting, t, requestHWConnection, onDeviceMatched, onDeviceError],
  );

  const handleConnect = useCallback(() => {
    scanWiredDevice(wiredOptions);
  }, [scanWiredDevice, wiredOptions]);

  const handleSelectDevice = useCallback(
    (deviceId: string) => {
      if (isConnecting) return;
      const option = hwOptions.find(o => o.device.id === deviceId);
      if (option?.isAirGapped) {
        onAirGappedSelected?.(option);
        return;
      }
      scanWiredDevice(option ? [option] : wiredOptions);
    },
    [
      isConnecting,
      hwOptions,
      wiredOptions,
      onAirGappedSelected,
      scanWiredDevice,
    ],
  );

  return {
    supportedDevices,
    handleConnect,
    handleSelectDevice,
    isConnecting,
    error,
  };
};
