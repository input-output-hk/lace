import { HardwareWalletId } from '@lace-contract/wallet-repo';

import type { WalletId } from '@lace-contract/wallet-repo';
import type { DeviceDescriptor } from '@lace-lib/util-hw';

/**
 * Resolve the Ledger device descriptor used to address the physical device.
 *
 * v2 hardware wallets encode the descriptor in their walletId. Wallets migrated
 * from v1 carry a legacy public-key-hash walletId instead, so the descriptor is
 * recovered at sign time via the optional legacy resolver (a USB scan on web).
 */
export const resolveLedgerDeviceDescriptor = async (
  walletId: WalletId,
  resolveLegacyDevice?: () => Promise<DeviceDescriptor>,
): Promise<DeviceDescriptor> => {
  const descriptor =
    HardwareWalletId.parse(walletId) ?? (await resolveLegacyDevice?.());
  if (!descriptor) {
    throw new Error(
      `Cannot derive device descriptor from walletId: ${walletId}`,
    );
  }
  return descriptor;
};
