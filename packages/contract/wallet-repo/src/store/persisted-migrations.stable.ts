// The stable SDK build resolves this file in place of persisted-migrations.ts:
// the stable SDK first persists the `wallets` state at its current version, so
// no state from an earlier version reaches it.
import type { MigrationManifest } from 'redux-persist';

/** The migrations of the persisted `wallets` state: none. */
export const walletsMigrations: MigrationManifest = {};
