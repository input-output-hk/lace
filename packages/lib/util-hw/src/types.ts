import type { HardwareIntegrationId } from './value-objects';
import type { BlockchainName } from '@lace-lib/util-store';
import type { Observable } from 'rxjs';

/** Hardware wallet vendor; used to route discovered devices to the right onboarding option. */
export type HardwareVendorName = 'ledger' | 'trezor';

/** Identifies a physical hardware wallet device. Discriminated by transport `kind`. */
export type DeviceDescriptor = BleDeviceDescriptor | UsbDeviceDescriptor;

export interface UsbDeviceDescriptor {
  kind: 'usb';
  vendorId: number;
  productId: number;
  serialNumber: string | null;
}

export interface BleDeviceDescriptor {
  kind: 'ble';
  vendorName: HardwareVendorName;
  /** Marketing model name reported by the device (e.g. "Nano X"); for display only. */
  model?: string;
  id: string;
  name: string | null;
}

/** USB device filter for native device picker. */
export interface HardwareDeviceUsbFilter {
  vendorId?: number;
  productId?: number;
}

/** BLE device filter for the discovery side effect. */
export interface HardwareDeviceBleFilter {
  vendorName: HardwareVendorName;
}

/** BIP-32 derivation scheme for HD key derivation on hardware wallets. */
export type DerivationType = 'ICARUS_TREZOR' | 'ICARUS' | 'LEDGER';

/** Payload for dispatching hardware wallet creation via side effect. */
export interface AttemptCreateHardwareWalletPayload {
  optionId: HardwareIntegrationId;
  device: DeviceDescriptor;
  accountIndex: number;
  derivationType?: DerivationType;
  blockchainName: BlockchainName;
}

/**
 * Subset of an onboarding option that the request bridge needs in order to
 * decide which transport to use. Web bridges flatMap usbFilters; mobile
 * bridges use bleFilters to pick which BLE search providers to aggregate.
 */
export interface RequestHWConnectionOption {
  usbFilters?: HardwareDeviceUsbFilter[];
  bleFilters?: HardwareDeviceBleFilter[];
}

export type RequestHWConnection = (
  options: ReadonlyArray<RequestHWConnectionOption>,
) => Promise<DeviceDescriptor>;

export type FoundDevice = {
  deviceDescriptor: DeviceDescriptor;
  displayName: string;
  icon: string;
};

export type SearchHWDevices = () => {
  results$: Observable<FoundDevice[]>;
  stop: () => void;
};
