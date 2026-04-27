import { useTranslation } from '@lace-contract/i18n';
import { useCallback, useMemo, useState } from 'react';

import { classifyHardwareError } from '../classify-hardware-error';
// HW modules currently only loaded in the extension
import { createUsbPickerExtensionBridge } from '../extension';

import {
  isHardwarePickerOption,
  type HardwareWalletPickerOption,
  type SoftwareWalletPickerOption,
} from './types';

import type { DeviceDescriptor } from '../value-objects/device-descriptor.vo';

export interface UseHwWalletDevicePickerProps<
  HwOption extends HardwareWalletPickerOption,
> {
  loadedOnboardingOptions:
    | Array<Array<HwOption | SoftwareWalletPickerOption>>
    | undefined;
  usbPickerMessage: string;
  usbPickerButtonLabel: string;
  onDeviceMatched: (matchedOption: HwOption, device: DeviceDescriptor) => void;
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
  usbPickerMessage,
  usbPickerButtonLabel,
  onDeviceMatched,
}: UseHwWalletDevicePickerProps<HwOption>): UseHwWalletDevicePickerResult<HwOption> => {
  const { t } = useTranslation();

  const requestNewDevice = useMemo(
    () =>
      createUsbPickerExtensionBridge(
        { message: usbPickerMessage, buttonLabel: usbPickerButtonLabel },
        'ledger-usb-picker.html',
      ),
    [usbPickerMessage, usbPickerButtonLabel],
  );

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

    const allFilters = hwOptions.flatMap(o => o.usbFilters ?? []);
    if (allFilters.length === 0) return;

    setConnecting(true);
    setError(null);

    void (async () => {
      try {
        const usbDevice = await requestNewDevice(allFilters);

        const matchedOption = hwOptions.find(option =>
          (option.usbFilters ?? []).some(
            f =>
              (f.vendorId === undefined || f.vendorId === usbDevice.vendorId) &&
              (f.productId === undefined ||
                f.productId === usbDevice.productId),
          ),
        );
        if (!matchedOption) throw new Error('Could not recognize the device');

        onDeviceMatched(matchedOption, usbDevice);
      } catch (error_: unknown) {
        setError(t(`hw-error.${classifyHardwareError(error_)}.subtitle`));
      } finally {
        setConnecting(false);
      }
    })();
  }, [isConnecting, hwOptions, t, requestNewDevice, onDeviceMatched]);

  return { supportedDevices, handleConnect, isConnecting, error };
};
