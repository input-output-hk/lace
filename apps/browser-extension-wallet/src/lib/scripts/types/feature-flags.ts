import { Cardano } from '@cardano-sdk/core';
import { z } from 'zod';
import { DeepRequired } from 'utility-types';
import { JsonType } from 'posthog-js';
import { commonSchema, dappExplorerSchema } from '@providers/PostHogClientProvider/schema';

export enum ExperimentName {
  CREATE_PAPER_WALLET = 'create-paper-wallet',
  RESTORE_PAPER_WALLET = 'restore-paper-wallet',
  USE_SWITCH_TO_NAMI_MODE = 'use-switch-to-nami-mode',
  SHARED_WALLETS = 'shared-wallets',
  WEBSOCKET_API = 'websocket-api',
  DAPP_EXPLORER = 'dapp-explorer',
  SEND_CONSOLE_ERRORS_TO_SENTRY = 'send-console-errors-to-sentry',
  BITCOIN_WALLETS = 'bitcoin-wallets',
  NFTPRINTLAB = 'nftprintlab',
  GLACIER_DROP = 'glacier-drop'
}

export type FeatureFlag = `${ExperimentName}`;

export type FeatureFlags = {
  [key in FeatureFlag]: boolean;
};

export type FeatureFlagsByNetwork = Record<Cardano.NetworkMagics, FeatureFlags>;

// currently schema.parse() method returns partially valid type - all properties are optional
// so we use extra types with DeepRequired, these types can be removed after Lace uses strict null checks
export type FeatureFlagCommonSchema = DeepRequired<z.infer<typeof commonSchema>>;
export type FeatureFlagDappExplorerSchema = DeepRequired<z.infer<typeof dappExplorerSchema>>;

// Using `false` as a fallback type for the payload, as it can be optional, and we (sadly) don't have
// strict null checks enabled so `false` is a replacement for `undefined` in this case
// eslint-disable-next-line @typescript-eslint/ban-types
type FeatureFlagPayload<T extends Record<string, unknown> = {}> = (FeatureFlagCommonSchema & T) | false;

type FeatureFlagCustomPayloads = {
  [ExperimentName.DAPP_EXPLORER]: FeatureFlagPayload<FeatureFlagDappExplorerSchema>;
};

export type FeatureFlagPayloads = {
  [key in FeatureFlag]: FeatureFlagPayload;
} &
  FeatureFlagCustomPayloads;

export type RawFeatureFlagPayloads = Record<ExperimentName, JsonType>;
