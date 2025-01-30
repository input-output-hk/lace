import { Cardano } from '@cardano-sdk/core';
import { z, ZodIssueCode } from 'zod';
import { DeepRequired } from 'utility-types';
import { JsonType } from 'posthog-js';

export enum ExperimentName {
  CREATE_PAPER_WALLET = 'create-paper-wallet',
  RESTORE_PAPER_WALLET = 'restore-paper-wallet',
  USE_SWITCH_TO_NAMI_MODE = 'use-switch-to-nami-mode',
  SHARED_WALLETS = 'shared-wallets',
  WEBSOCKET_API = 'websocket-api',
  DAPP_EXPLORER = 'dapp-explorer'
}

export type FeatureFlag = `${ExperimentName}`;

export type FeatureFlags = {
  [key in FeatureFlag]: boolean;
};

export type FeatureFlagsByNetwork = Record<Cardano.NetworkMagics, FeatureFlags>;

const parseJsonPreprocessor = (value: unknown, ctx: z.RefinementCtx) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: (error as Error).message
      });
    }
  }

  return value;
};

// currently schema.parse() method returns partially valid type - all properties are optional
// so we use extra types with DeepRequired, these types can be removed after Lace uses strict null checks

export enum NetworkName {
  preview = 'preview',
  preprod = 'preprod',
  mainnet = 'mainnet',
  sanchonet = 'sanchonet'
}

export const networksEnumSchema = z.enum(Object.values(NetworkName) as [NetworkName, ...NetworkName[]]);
export type NetworksEnumSchema = z.infer<typeof networksEnumSchema>;

const commonSchema = z.object({
  allowedNetworks: z.array(networksEnumSchema)
});
export type FeatureFlagCommonSchema = DeepRequired<z.infer<typeof commonSchema>>;

// has to be aligned with the response from GET `/dapps/categories`
// @see https://apis-portal.dappradar.com/full-api-reference#get-/dapps/categories
export const dappCategoriesEnumSchema = z.enum([
  'games',
  'defi',
  'collectibles',
  'marketplaces',
  'high-risk',
  'gambling',
  'exchanges',
  'social',
  'other'
]);
export type DappCategoriesEnumSchema = z.infer<typeof dappCategoriesEnumSchema>;

const dappExplorerSchema = commonSchema.merge(
  z.object({
    disallowedDapps: z.object({
      legalIssues: z.array(z.number()),
      connectivityIssues: z.array(z.number())
    }),
    disallowedCategories: z.object({
      legalIssues: z.array(dappCategoriesEnumSchema)
    })
  })
);
export type FeatureFlagDappExplorerSchema = DeepRequired<z.infer<typeof dappExplorerSchema>>;

export const featureFlagSchema = {
  common: z.preprocess(parseJsonPreprocessor, commonSchema),
  dappExplorer: z.preprocess(parseJsonPreprocessor, dappExplorerSchema)
};

type FeatureFlagCommonPayload = {
  allowedNetworks: ('preview' | 'preprod' | 'mainnet' | 'sanchonet')[];
};

// Using `false` as a fallback type for the payload, as it can be optional, and we (sadly) don't have
// strict null checks enabled so `false` is a replacement for `undefined` in this case
// eslint-disable-next-line @typescript-eslint/ban-types
type FeatureFlagPayload<T extends Record<string, unknown> = {}> = (FeatureFlagCommonPayload & T) | false;

type FeatureFlagCustomPayloads = {
  [ExperimentName.DAPP_EXPLORER]: FeatureFlagPayload<FeatureFlagDappExplorerSchema>;
};

export type FeatureFlagPayloads = {
  [key in FeatureFlag]: FeatureFlagPayload;
} & FeatureFlagCustomPayloads;

export type RawFeatureFlagPayloads = Record<ExperimentName, JsonType>;
