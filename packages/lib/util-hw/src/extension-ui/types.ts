import type {
  DerivationType,
  HardwareDeviceBleFilter,
  HardwareDeviceUsbFilter,
} from '../types';
import type { HardwareIntegrationId } from '../value-objects/hardware-integration-id.vo';
import type { BlockchainName } from '@lace-lib/util-store';

/**
 * Human-presentable metadata for a supported hardware wallet device. The logo
 * also accepts a blockchain name so the blockchain selection step can reuse
 * the device picker UI with blockchain icons.
 */
export interface HardwareWalletDeviceMetadata {
  id: string;
  name: string;
  models: string[];
  logo?: BlockchainName | 'Keystone' | 'Ledger' | 'SeedSigner' | 'Trezor';
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
  bleFilters?: HardwareDeviceBleFilter[];
  derivationTypes?: DerivationType[];
  /** Air-gapped device: the picker has no wired transport to scan for it. */
  isAirGapped?: boolean;
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
