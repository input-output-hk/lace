import type { HardwareDeviceUsbFilter, DerivationType } from '../types';
import type { HardwareIntegrationId } from '../value-objects/hardware-integration-id.vo';

/** Human-presentable metadata for a supported hardware wallet device. */
export interface HardwareWalletDeviceMetadata {
  id: string;
  name: string;
  models: string[];
  logo?: 'Ledger' | 'Trezor';
}

/**
 * Minimum shape of a hardware wallet picker option consumed by
 * {@link useHwWalletDevicePicker}. Structurally compatible with any
 * richer onboarding-option type defined in contracts.
 */
export interface HardwareWalletPickerOption {
  id: HardwareIntegrationId;
  isHwDevice: true;
  device: HardwareWalletDeviceMetadata;
  usbFilters?: HardwareDeviceUsbFilter[];
  derivationTypes?: DerivationType[];
}

/** Non-hardware counterpart used to widen the picker's input list. */
export interface SoftwareWalletPickerOption {
  isHwDevice?: false;
}

export type WalletPickerOption =
  | HardwareWalletPickerOption
  | SoftwareWalletPickerOption;

export const isHardwarePickerOption = <O extends { isHwDevice?: boolean }>(
  option: O,
): option is Extract<O, { isHwDevice: true }> => option.isHwDevice === true;
