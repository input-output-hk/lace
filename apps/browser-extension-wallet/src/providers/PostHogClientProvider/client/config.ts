import { Wallet } from '@lace/cardano';
import {
  ExperimentName,
  FeatureFlagPayloads,
  FeatureFlags,
  FeatureFlagsByNetwork
} from '@lib/scripts/types/feature-flags';
import { NetworkName } from '@providers/PostHogClientProvider/schema';

export const POSTHOG_ENABLED = process.env.USE_POSTHOG_ANALYTICS === 'true';
export const POSTHOG_OPTED_OUT_EVENTS_DISABLED = process.env.USE_POSTHOG_ANALYTICS_FOR_OPTED_OUT === 'false';
export const POSTHOG_HOST = process.env.POSTHOG_HOST;
export const PRODUCTION_TRACKING_MODE_ENABLED = process.env.PRODUCTION_MODE_TRACKING === 'true';
export const POSTHOG_EXCLUDED_EVENTS = process.env.POSTHOG_EXCLUDED_EVENTS ?? '';

export const DEV_POSTHOG_TOKEN = process.env.POSTHOG_DEV_TOKEN;
export const PRODUCTION_POSTHOG_TOKEN = process.env.POSTHOG_PRODUCTION_TOKEN;

export const DEV_POSTHOG_PROJECT_ID = 6315;
export const PRODUCTION_POSTHOG_PROJECT_ID = 6621;

export const allFeatureFlags = Object.values(ExperimentName);

export const NETWORK_MAGIC_TO_NETWORK_NAME: Map<Wallet.Cardano.NetworkMagic, `${NetworkName}`> = new Map([
  [Wallet.Cardano.NetworkMagics.Mainnet, 'mainnet'],
  [Wallet.Cardano.NetworkMagics.Preprod, 'preprod'],
  [Wallet.Cardano.NetworkMagics.Preview, 'preview'],
  [Wallet.Cardano.NetworkMagics.Sanchonet, 'sanchonet']
]);

const defaultFeatureFlags: FeatureFlags = {
  [ExperimentName.CREATE_PAPER_WALLET]: false,
  [ExperimentName.RESTORE_PAPER_WALLET]: false,
  [ExperimentName.USE_SWITCH_TO_NAMI_MODE]: false,
  [ExperimentName.SHARED_WALLETS]: false,
  [ExperimentName.WEBSOCKET_API]: false,
  [ExperimentName.DAPP_EXPLORER]: false,
  [ExperimentName.BITCOIN_WALLETS]: false
};

export const featureFlagsByNetworkInitialValue: FeatureFlagsByNetwork = {
  [Wallet.Cardano.NetworkMagics.Mainnet]: defaultFeatureFlags,
  [Wallet.Cardano.NetworkMagics.Preprod]: defaultFeatureFlags,
  [Wallet.Cardano.NetworkMagics.Preview]: defaultFeatureFlags,
  [Wallet.Cardano.NetworkMagics.Sanchonet]: defaultFeatureFlags
};

export const featureFlagPayloadsInitialValue = allFeatureFlags.reduce((payloads, featureFlagName) => {
  payloads[featureFlagName] = false;
  return payloads;
}, {} as FeatureFlagPayloads);
