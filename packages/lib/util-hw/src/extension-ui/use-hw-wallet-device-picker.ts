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
   * Called when device matching fails — e.g. the user dismisses the USB
   * picker, the device is not recognised, or transport fails. Carries the
   * classified category before it is translated for display.
   */
  onDeviceError?: (category: HardwareErrorCategory) => void;
}

export interface UseHwWalletDevicePickerResult<
  HwOption extends HardwareWalletPickerOption,
> {
  supportedDevices: HwOption['device'][];
  handleConnect: () => void;
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

  const [isConnecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supportedDevices = useMemo(
    () => hwOptions.map(option => option.device),
    [hwOptions],
  );

  const handleConnect = useCallback(() => {
    if (isConnecting) return;
    if (hwOptions.length === 0) return;

    setConnecting(true);
    setError(null);

    void (async () => {
      try {
        const requestOptions = hwOptions.map(option => ({
          usbFilters: option.usbFilters,
          bleFilters: option.bleFilters,
        }));
        const selectedDeviceDescriptor = await requestHWConnection(
          requestOptions,
        );

        const matchedOption =
          selectedDeviceDescriptor.kind === 'ble'
            ? hwOptions.find(option =>
                (option.bleFilters ?? []).some(
                  f => f.vendorName === selectedDeviceDescriptor.vendorName,
                ),
              )
            : hwOptions.find(option =>
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
  }, [
    isConnecting,
    hwOptions,
    t,
    requestHWConnection,
    onDeviceMatched,
    onDeviceError,
  ]);

  return { supportedDevices, handleConnect, isConnecting, error };
};
