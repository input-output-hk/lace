/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useHwWalletDevicePicker } from '../../src/extension-ui/use-hw-wallet-device-picker';

import type { HardwareWalletPickerOption } from '../../src/extension-ui/types';
import type {
  DeviceDescriptor,
  RequestHWConnection,
  RequestHWConnectionOption,
} from '../../src/types';
import type { HardwareIntegrationId } from '../../src/value-objects';

vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const ledgerOption: HardwareWalletPickerOption = {
  id: 'ledger' as HardwareIntegrationId,
  isHwDevice: true,
  device: { id: 'ledger-device', name: 'Ledger', models: ['Nano X'] },
  usbFilters: [{ vendorId: 0x2c_97 }],
  bleFilters: [{ vendorName: 'ledger' }],
};

const trezorOption: HardwareWalletPickerOption = {
  id: 'trezor' as HardwareIntegrationId,
  isHwDevice: true,
  device: { id: 'trezor-device', name: 'Trezor', models: ['Model T'] },
  usbFilters: [{ vendorId: 0x12_34, productId: 0x00_01 }],
};

const airGappedOption: HardwareWalletPickerOption = {
  id: 'seed-signer' as HardwareIntegrationId,
  isHwDevice: true,
  device: { id: 'seed-signer-device', name: 'SeedSigner', models: [] },
  isAirGapped: true,
};

const ledgerUsbDescriptor: DeviceDescriptor = {
  kind: 'usb',
  vendorId: 0x2c_97,
  productId: 0x50_11,
  serialNumber: 'serial-1',
};

const ledgerBleDescriptor: DeviceDescriptor = {
  kind: 'ble',
  vendorName: 'ledger',
  id: 'ble-1',
  name: 'Nano X',
};

type PickerProps = Parameters<
  typeof useHwWalletDevicePicker<HardwareWalletPickerOption>
>[0];

const renderPicker = (overrides: Partial<PickerProps> = {}) => {
  const props: PickerProps = {
    loadedOnboardingOptions: [[ledgerOption, trezorOption, airGappedOption]],
    requestHWConnection: vi
      .fn<RequestHWConnection>()
      .mockResolvedValue(ledgerUsbDescriptor),
    onDeviceMatched: vi.fn(),
    onDeviceError: vi.fn(),
    onAirGappedSelected: vi.fn(),
    ...overrides,
  };
  return {
    props,
    ...renderHook(() =>
      useHwWalletDevicePicker<HardwareWalletPickerOption>(props),
    ),
  };
};

describe('useHwWalletDevicePicker', () => {
  describe('handleConnect', () => {
    it('surfaces a not-supported error when every option is air-gapped', () => {
      const { props, result } = renderPicker({
        loadedOnboardingOptions: [[airGappedOption]],
      });

      act(() => {
        result.current.handleConnect();
      });

      expect(result.current.error).toBe('hw-error.no-wired-device.subtitle');
      expect(result.current.isConnecting).toBe(false);
      expect(props.onDeviceError).toHaveBeenCalledWith('not-supported');
      expect(props.requestHWConnection).not.toHaveBeenCalled();
    });

    it('surfaces a not-supported error when no options are loaded', () => {
      const { props, result } = renderPicker({
        loadedOnboardingOptions: undefined,
      });

      act(() => {
        result.current.handleConnect();
      });

      expect(result.current.error).toBe('hw-error.no-wired-device.subtitle');
      expect(props.onDeviceError).toHaveBeenCalledWith('not-supported');
      expect(props.requestHWConnection).not.toHaveBeenCalled();
    });

    it('scans every wired option and matches a usb device to its option', async () => {
      const { props, result } = renderPicker();

      await act(async () => {
        result.current.handleConnect();
      });

      expect(props.requestHWConnection).toHaveBeenCalledWith([
        {
          usbFilters: ledgerOption.usbFilters,
          bleFilters: ledgerOption.bleFilters,
        },
        {
          usbFilters: trezorOption.usbFilters,
          bleFilters: trezorOption.bleFilters,
        },
      ]);
      expect(props.onDeviceMatched).toHaveBeenCalledWith(
        ledgerOption,
        ledgerUsbDescriptor,
      );
      expect(result.current.error).toBeNull();
    });

    it('matches a ble device to its option by vendor name', async () => {
      const { props, result } = renderPicker({
        requestHWConnection: vi
          .fn<RequestHWConnection>()
          .mockResolvedValue(ledgerBleDescriptor),
      });

      await act(async () => {
        result.current.handleConnect();
      });

      expect(props.onDeviceMatched).toHaveBeenCalledWith(
        ledgerOption,
        ledgerBleDescriptor,
      );
    });

    it('surfaces a classified error when the connection request fails', async () => {
      const { props, result } = renderPicker({
        requestHWConnection: vi
          .fn<RequestHWConnection>()
          .mockRejectedValue(new Error('device disconnected')),
      });

      await act(async () => {
        result.current.handleConnect();
      });

      expect(props.onDeviceError).toHaveBeenCalledWith('device-disconnected');
      expect(result.current.error).toBe(
        'hw-error.device-disconnected.subtitle',
      );
      expect(result.current.isConnecting).toBe(false);
    });

    it('surfaces a generic error when the device matches no scanned option', async () => {
      const { props, result } = renderPicker({
        requestHWConnection: vi.fn<RequestHWConnection>().mockResolvedValue({
          kind: 'usb',
          vendorId: 0xff_ff,
          productId: 0xff_ff,
          serialNumber: null,
        }),
      });

      await act(async () => {
        result.current.handleConnect();
      });

      expect(props.onDeviceMatched).not.toHaveBeenCalled();
      expect(props.onDeviceError).toHaveBeenCalledWith('generic');
      expect(result.current.error).toBe('hw-error.generic.subtitle');
    });

    it('ignores a second connect while a scan is in flight', async () => {
      let resolveConnection: (device: DeviceDescriptor) => void = () => {};
      const requestHWConnection = vi
        .fn<RequestHWConnection>()
        .mockImplementation(
          async () =>
            new Promise<DeviceDescriptor>(resolve => {
              resolveConnection = resolve;
            }),
        );
      const { result } = renderPicker({ requestHWConnection });

      act(() => {
        result.current.handleConnect();
      });
      await waitFor(() => {
        expect(result.current.isConnecting).toBe(true);
      });
      act(() => {
        result.current.handleConnect();
      });

      expect(requestHWConnection).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveConnection(ledgerUsbDescriptor);
      });
      await waitFor(() => {
        expect(result.current.isConnecting).toBe(false);
      });
    });
  });

  describe('handleSelectDevice', () => {
    it('invokes onAirGappedSelected without scanning for air-gapped options', () => {
      const { props, result } = renderPicker();

      act(() => {
        result.current.handleSelectDevice(airGappedOption.device.id);
      });

      expect(props.onAirGappedSelected).toHaveBeenCalledWith(airGappedOption);
      expect(props.requestHWConnection).not.toHaveBeenCalled();
    });

    it('scans only the selected option filters for a wired option', async () => {
      const { props, result } = renderPicker();

      await act(async () => {
        result.current.handleSelectDevice(trezorOption.device.id);
      });

      expect(props.requestHWConnection).toHaveBeenCalledWith([
        {
          usbFilters: trezorOption.usbFilters,
          bleFilters: trezorOption.bleFilters,
        },
      ]);
    });

    it('does not match a device belonging to a different option than the selected one', async () => {
      const { props, result } = renderPicker();

      await act(async () => {
        result.current.handleSelectDevice(trezorOption.device.id);
      });

      expect(props.onDeviceMatched).not.toHaveBeenCalled();
      expect(props.onDeviceError).toHaveBeenCalledWith('generic');
      expect(result.current.error).toBe('hw-error.generic.subtitle');
    });

    it('matches the selected option when the scanned device fits its filters', async () => {
      const { props, result } = renderPicker();

      await act(async () => {
        result.current.handleSelectDevice(ledgerOption.device.id);
      });

      expect(props.onDeviceMatched).toHaveBeenCalledWith(
        ledgerOption,
        ledgerUsbDescriptor,
      );
    });

    it('falls back to scanning every wired option for an unknown device id', async () => {
      const { props, result } = renderPicker();

      await act(async () => {
        result.current.handleSelectDevice('unknown-id');
      });

      const [requestOptions] = (
        props.requestHWConnection as ReturnType<typeof vi.fn>
      ).mock.calls[0] as [RequestHWConnectionOption[]];
      expect(requestOptions).toHaveLength(2);
      expect(props.onDeviceMatched).toHaveBeenCalledWith(
        ledgerOption,
        ledgerUsbDescriptor,
      );
    });

    it('ignores selection while a scan is in flight', async () => {
      let resolveConnection: (device: DeviceDescriptor) => void = () => {};
      const requestHWConnection = vi
        .fn<RequestHWConnection>()
        .mockImplementation(
          async () =>
            new Promise<DeviceDescriptor>(resolve => {
              resolveConnection = resolve;
            }),
        );
      const { props, result } = renderPicker({ requestHWConnection });

      act(() => {
        result.current.handleConnect();
      });
      await waitFor(() => {
        expect(result.current.isConnecting).toBe(true);
      });
      act(() => {
        result.current.handleSelectDevice(airGappedOption.device.id);
      });

      expect(props.onAirGappedSelected).not.toHaveBeenCalled();
      expect(requestHWConnection).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveConnection(ledgerUsbDescriptor);
      });
      await waitFor(() => {
        expect(result.current.isConnecting).toBe(false);
      });
    });
  });
});
