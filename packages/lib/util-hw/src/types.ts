import type { DeviceDescriptor, HardwareIntegrationId } from './value-objects';
import type { BlockchainName } from '@lace-lib/util-store';

/** USB device filter for native device picker. */
export interface HardwareDeviceUsbFilter {
  vendorId?: number;
  productId?: number;
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
