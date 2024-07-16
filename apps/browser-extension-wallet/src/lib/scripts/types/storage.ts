import { AuthorizedDappStorage } from '@src/types/dappConnector';
import type { Message } from './background-service';
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
export const MIDNIGHT_EVENT_BANNER_KEY = 'midnightEventBanner';

export interface BackgroundStorage {
  message?: Message;
  mnemonic?: string;
  fiatPrices?: { prices: ADAPrices; timestamp: number };
  userId?: string;
  usePersistentUserId?: boolean;
  experimentsConfiguration?: Record<string, string | boolean>;
  customSubmitTxUrl?: string;
}

export type BackgroundStorageKeys = keyof BackgroundStorage;

export interface MidnightEventBannerStorage {
  lastSeen: number;
  closed: boolean;
}

// TODO: Improve use of extension storage (get/set). We have keys all over the place [LW-6495]
export interface ExtensionStorage {
  MIGRATION_STATE: MigrationState;
  BACKGROUND_STORAGE?: BackgroundStorage;
  [ABOUT_EXTENSION_KEY]?: ExtensionUpdateData;
  [AUTHORIZED_DAPPS_KEY]?: AuthorizedDappStorage;
  [MIDNIGHT_EVENT_BANNER_KEY]?: MidnightEventBannerStorage;
}
