import { HardwareKeystoneWalletId } from '@lace-contract/wallet-repo';

import type { WalletId } from '@lace-contract/wallet-repo';

/**
 * Derives the Keystone wallet id from the device master fingerprint (xfp).
 * Keying on the xfp groups every account of one device under one wallet,
 * across blockchains and networks. Accepts the 8-char lowercase-hex xfp string.
 */
export const keystoneWalletId = (xfpHex: string): WalletId =>
  HardwareKeystoneWalletId(xfpHex);
