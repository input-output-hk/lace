import { AuthorizedDappStorage } from '@src/types/dappConnector';
import type { Message } from './background-service';
import { ADAPrices } from './prices';
import {
  FeatureFlagPayloads,
  FeatureFlags,
  FeatureFlagsByNetwork,
  RawFeatureFlagPayloads
} from '@lib/scripts/types/feature-flags';
import { LogLevelString } from '@lace/common';
import { Language } from '@lace/translation';
import type { themes } from '@providers/ThemeProvider/types';

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
export const MIDNIGHT_LAUNCH_BANNER_KEY = 'midnightLaunchBanner';
export const SWAPS_DISCLAIMER_ACKNOWLEDGED = 'swapsDisclaimerAcknowledged';
export const SWAPS_TARGET_SLIPPAGE = 'swapsTargetSlippage';
export const SWAPS_EXCLUDED_LIQUIDITY_SOURCES = 'swapsExcludedLiquiditySources';

export interface BackgroundStorage {
  message?: Message;
  mnemonic?: string;
  fiatPrices?: { prices: ADAPrices; timestamp: number };
  fiatBitcoinPrices?: { prices: ADAPrices; timestamp: number };
  userId?: string;
  usePersistentUserId?: boolean;
  featureFlags?: FeatureFlagsByNetwork;
  featureFlagPayloads?: FeatureFlagPayloads;
  initialPosthogFeatureFlags?: FeatureFlags;
  initialPosthogFeatureFlagPayloads?: RawFeatureFlagPayloads;
  customSubmitTxUrl?: string;
  namiMigration?: {
    completed: boolean;
  };
  activeBlockchain?: 'cardano' | 'bitcoin';
  optedInBeta?: boolean;
  logLevel?: LogLevelString;
  languageChoice?: Language;
  colorScheme?: themes;
}

export type BackgroundStorageKeys = keyof BackgroundStorage;

export interface MidnightEventBannerStorage {
  lastSeen: number;
  closed: boolean;
}

export type MidnightLaunchBannerStorage = MidnightEventBannerStorage;

// TODO: Improve use of extension storage (get/set). We have keys all over the place [LW-6495]
export interface ExtensionStorage {
  MIGRATION_STATE: MigrationState;
  BACKGROUND_STORAGE?: BackgroundStorage;
  [ABOUT_EXTENSION_KEY]?: ExtensionUpdateData;
  [AUTHORIZED_DAPPS_KEY]?: AuthorizedDappStorage;
  [MIDNIGHT_EVENT_BANNER_KEY]?: MidnightEventBannerStorage;
  [MIDNIGHT_LAUNCH_BANNER_KEY]?: MidnightLaunchBannerStorage;
}
