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
  /** Undefined for air-gapped devices; the connector resolves identity via the QR account-export. */
  device?: DeviceDescriptor;
  accountIndex: number;
  derivationType?: DerivationType;
  blockchainName: BlockchainName;
  /**
   * Overrides the connector's default wallet name on a NEWLY created wallet
   * (a merge into an existing wallet keeps its name). The migration wizard
   * uses it to mark an imported hardware source, mirroring the name-suffixed
   * phrase import.
   */
  walletName?: string;
  /**
   * Skips the success sheet. For callers that own their own journey (the
   * migration wizard): the sheet is add-wallet's ending, and popping it over
   * a flow that is mid-way reads as the flow finishing when it hasn't.
   */
  shouldSuppressSuccessSheet?: boolean;
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
