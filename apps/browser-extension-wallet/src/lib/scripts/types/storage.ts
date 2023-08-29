import { Wallet } from '@lace/cardano';
import { AuthorizedDappStorage } from '@src/types/dappConnector';
import { Message } from './background-service';
import { ADAPrices } from './prices';

export interface PendingMigrationState {
  from: string;
  to: string;
  state: 'not-applied' | 'migrating' | 'error';
}
export interface NoVersionsMigrationState {
  state: 'up-to-date' | 'not-loaded';
}
export type MigrationState = PendingMigrationState | NoVersionsMigrationState;

export interface ExtensionUpdateData {
  version?: string;
  acknowledged?: boolean;
  reason?: 'update' | 'install' | 'downgrade';
}

export const AUTHORIZED_DAPPS_KEY = 'authorizedDapps';
export const ABOUT_EXTENSION_KEY = 'aboutExtension';

export interface BackgroundStorage {
  message?: Message;
  mnemonic?: string;
  keyAgentsByChain?: Wallet.KeyAgentsByChain;
  fiatPrices?: { prices: ADAPrices; timestamp: number };
  userId?: string;
  usePersistentUserId?: boolean;
}

export type BackgroundStorageKeys = keyof BackgroundStorage;

// TODO: Improve use of extension storage (get/set). We have keys all over the place [LW-6495]
export interface ExtensionStorage {
  MIGRATION_STATE: MigrationState;
  BACKGROUND_STORAGE?: BackgroundStorage;
  [ABOUT_EXTENSION_KEY]?: ExtensionUpdateData;
  [AUTHORIZED_DAPPS_KEY]?: AuthorizedDappStorage;
}
