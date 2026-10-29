// The stable SDK build resolves persisted-migrations.stable.ts in place of this
// file, which migrates nothing. Keep the two files' exports in step, apart from
// the names the variant declares on stable-omits lines; the SDK's stable
// variant parity check enforces it.
import {
  normalizeHardwareWalletIds,
  setBlockchainNetworkId,
  updateMidnightAccountIds,
} from '../migrations';

import type { MigrationManifest } from 'redux-persist';

/** The migrations of the persisted `wallets` state, by the version they reach. */
export const walletsMigrations: MigrationManifest = {
  3: setBlockchainNetworkId,
  4: updateMidnightAccountIds,
  5: normalizeHardwareWalletIds,
};
