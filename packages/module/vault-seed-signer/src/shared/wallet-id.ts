import { HardwareSeedSignerWalletId } from '@lace-contract/wallet-repo';

import type { WalletId } from '@lace-contract/wallet-repo';

/**
 * Derives the Seed Signer wallet id from the device master fingerprint (xfp).
 * Keying on the xfp groups every account of one device under one wallet, across
 * blockchains and networks. Accepts the 8-char lowercase-hex xfp string.
 */
export const seedSignerWalletId = (xfpHex: string): WalletId =>
  HardwareSeedSignerWalletId(xfpHex);
