import { Cardano } from '@cardano-sdk/core';
import { Environment } from '@lace-contract/module';
import { Milliseconds, Seconds } from '@lace-sdk/util';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { cleanEnv, str, makeValidator } from 'envalid';

import defaultFeatureFlags from '../feature-flags';

import type { MidnightSDKTestNetworkId } from '@lace-contract/midnight-context';
import type { AppConfig } from '@lace-contract/module';
import '@lace-contract/bitcoin-context';
import '@lace-contract/cardano-context';
import '@lace-contract/posthog';
import '@lace-module/bitcoin-provider-maestro';
import '@lace-module/cardano-provider-blockfrost';
import '@lace-module/feature-posthog';
import '@lace-module/swap-provider-steelswap';

export const ENV = Environment(
  (process.env.NODE_ENV || 'development') as Environment,
).unwrap();

const cardanoChainId = makeValidator<Cardano.ChainId>(variable => {
  if (!['Preprod', 'Preview'].includes(variable)) {
    throw new Error('Invalid chain id: ' + variable);
  }
  return Cardano.ChainIds[variable as keyof typeof Cardano.ChainIds];
});

const TestNetworkId = Object.values(NetworkId.NetworkId).filter(
  id => id !== 'mainnet',
);
const midnightTestnetNetworkId = makeValidator<MidnightSDKTestNetworkId>(
  variable => {
    // cannot use isMidnightSDKTestNetworkId from midnight-context as
    // that contract imports ledger-v6(wasm) which is not compatible with mobile
    if (TestNetworkId.includes(variable as never))
      return variable as MidnightSDKTestNetworkId;
    throw new Error('Invalid testnet network id: ' + variable);
  },
);

// eslint-disable-next-line functional/no-let
let configValidationError: string | null = null;

const validateEnvironment = (): AppConfig | null => {
  try {
    // In production/minified builds, Expo inlines EXPO_PUBLIC_* values at build time,
    // so process.env is not enumerable. Proceed directly to validation; any missing
    // values will be reported in the catch block below.
    const validatedEnvironment = cleanEnv(
      {
        POSTHOG_API_URL: process.env.EXPO_PUBLIC_POSTHOG_API_URL as string,
        FEATURE_FLAG_CHECK_FREQUENCY_SECONDS: process.env
          .EXPO_PUBLIC_FEATURE_FLAG_CHECK_FREQUENCY_SECONDS as string,
        POSTHOG_API_TOKEN: process.env.EXPO_PUBLIC_POSTHOG_API_TOKEN as string,
        DEFAULT_MIDNIGHT_TESTNET_NETWORK_ID: process.env
          .EXPO_PUBLIC_DEFAULT_MIDNIGHT_TESTNET_NETWORK_ID as string,
        DEFAULT_CARDANO_TESTNET_CHAIN_ID: process.env
          .EXPO_PUBLIC_DEFAULT_CARDANO_TESTNET_CHAIN_ID as string,
        RECOVERY_PHRASE_VIDEO_URL: process.env
          .EXPO_PUBLIC_RECOVERY_PHRASE_VIDEO_URL as string,
        COOKIE_POLICY_URL: process.env.EXPO_PUBLIC_COOKIE_POLICY_URL as string,
        PRIVACY_POLICY_URL: process.env
          .EXPO_PUBLIC_PRIVACY_POLICY_URL as string,
        TERMS_AND_CONDITIONS_URL: process.env
          .EXPO_PUBLIC_TERMS_AND_CONDITIONS_URL as string,
        FAQ_URL: process.env.EXPO_PUBLIC_FAQ_URL as string,
        FAQ_RECOVERY_PHRASE_URL: process.env
          .EXPO_PUBLIC_FAQ_RECOVERY_PHRASE_URL as string,
        FAQ_COPY_PASTE_RECOVERY_PHRASE_URL: process.env
          .EXPO_PUBLIC_FAQ_COPY_PASTE_RECOVERY_PHRASE_URL as string,
        ZENDESK_NEW_REQUEST_URL: process.env
          .EXPO_PUBLIC_ZENDESK_NEW_REQUEST_URL as string,
        BANXA_URL: process.env.EXPO_PUBLIC_BANXA_URL as string,
        GOV_TOOLS_URL: process.env.EXPO_PUBLIC_GOV_TOOLS_URL as string,
        BLOCKFROST_URL_PREPROD: process.env
          .EXPO_PUBLIC_BLOCKFROST_URL_PREPROD as string,
        BLOCKFROST_URL_PREVIEW: process.env
          .EXPO_PUBLIC_BLOCKFROST_URL_PREVIEW as string,
        BLOCKFROST_URL_MAINNET: process.env
          .EXPO_PUBLIC_BLOCKFROST_URL_MAINNET as string,
        BLOCKFROST_PROJECT_ID_PREPROD: process.env
          .EXPO_PUBLIC_BLOCKFROST_PROJECT_ID_PREPROD as string,
        BLOCKFROST_PROJECT_ID_PREVIEW: process.env
          .EXPO_PUBLIC_BLOCKFROST_PROJECT_ID_PREVIEW as string,
        BLOCKFROST_PROJECT_ID_MAINNET: process.env
          .EXPO_PUBLIC_BLOCKFROST_PROJECT_ID_MAINNET as string,
        MAESTRO_URL_TESTNET: process.env
          .EXPO_PUBLIC_MAESTRO_URL_TESTNET as string,
        MAESTRO_URL_MAINNET: process.env
          .EXPO_PUBLIC_MAESTRO_URL_MAINNET as string,
        MAESTRO_PROJECT_ID_TESTNET: process.env
          .EXPO_PUBLIC_MAESTRO_PROJECT_ID_TESTNET as string,
        MAESTRO_PROJECT_ID_MAINNET: process.env
          .EXPO_PUBLIC_MAESTRO_PROJECT_ID_MAINNET as string,
        MEMPOOLSPACE_URL_MAINNET: process.env
          .EXPO_PUBLIC_MEMPOOLSPACE_URL_MAINNET as string,
        MEMPOOLSPACE_URL_TESTNET: process.env
          .EXPO_PUBLIC_MEMPOOLSPACE_URL_TESTNET as string,
        BITCOIN_BLOCKCHAIN_EXPLORER_URL_MAINNET: process.env
          .EXPO_PUBLIC_BITCOIN_BLOCKCHAIN_EXPLORER_URL_MAINNET as string,
        BITCOIN_BLOCKCHAIN_EXPLORER_URL_TESTNET: process.env
          .EXPO_PUBLIC_BITCOIN_BLOCKCHAIN_EXPLORER_URL_TESTNET as string,
        BLOCKFROST_IPFS_URL: process.env
          .EXPO_PUBLIC_BLOCKFROST_IPFS_URL as string,
        CEXPLORER_URL_MAINNET: process.env
          .EXPO_PUBLIC_CEXPLORER_URL_MAINNET as string,
        CEXPLORER_URL_PREVIEW: process.env
          .EXPO_PUBLIC_CEXPLORER_URL_PREVIEW as string,
        CEXPLORER_URL_PREPROD: process.env
          .EXPO_PUBLIC_CEXPLORER_URL_PREPROD as string,
        CEXPLORER_URL_SANCHONET: process.env
          .EXPO_PUBLIC_CEXPLORER_URL_SANCHONET as string,
        SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN as string,
        LEARN_MORE_URL: process.env.EXPO_PUBLIC_LEARN_MORE_URL as string,
        URL_LACE_PAGE: process.env.EXPO_PUBLIC_URL_LACE_PAGE as string,
        NFT_CDN_URL: process.env.EXPO_PUBLIC_NFT_CDN_URL as string,
        COINGECKO_API_BASE_URL: process.env
          .EXPO_PUBLIC_COINGECKO_API_BASE_URL as string,
        STEELSWAP_API_BASE_URL: process.env
          .EXPO_PUBLIC_STEELSWAP_API_BASE_URL as string,
      },
      {
        POSTHOG_API_URL: str({ desc: 'URL for PostHog analytics' }),
        FEATURE_FLAG_CHECK_FREQUENCY_SECONDS: str({
          desc: 'Frequency in seconds for checking feature flags',
        }),
        POSTHOG_API_TOKEN: str({ desc: 'API token for PostHog' }),
        DEFAULT_MIDNIGHT_TESTNET_NETWORK_ID: midnightTestnetNetworkId({
          desc: 'Default Midnight testnet network id',
        }),
        DEFAULT_CARDANO_TESTNET_CHAIN_ID: cardanoChainId({
          desc: 'Default Cardano testnet chain id',
        }),
        RECOVERY_PHRASE_VIDEO_URL: str({
          desc: 'URL to recovery phrase video explanation',
        }),
        COOKIE_POLICY_URL: str({ desc: 'URL to Cookie Policy' }),
        PRIVACY_POLICY_URL: str({ desc: 'URL to Privacy Policy' }),
        TERMS_AND_CONDITIONS_URL: str({ desc: 'URL to Terms and Conditions' }),
        FAQ_URL: str({ desc: 'URL to FAQ' }),
        FAQ_RECOVERY_PHRASE_URL: str({
          desc: 'URL to FAQ about recovery phrase',
        }),
        FAQ_COPY_PASTE_RECOVERY_PHRASE_URL: str({
          desc: 'URL to FAQ about recovery phrase copy-paste best practices',
        }),
        ZENDESK_NEW_REQUEST_URL: str({
          desc: 'URL to create a new Zendesk request',
        }),
        BANXA_URL: str({ desc: 'URL to Banxa partner' }),
        GOV_TOOLS_URL: str({ desc: 'URL to gov.tools' }),
        BLOCKFROST_URL_PREPROD: str({
          desc: 'Blockfrost base URL',
          default: 'https://cardano-preprod.blockfrost.io',
        }),
        BLOCKFROST_URL_PREVIEW: str({
          desc: 'Blockfrost base URL',
          default: 'https://cardano-preview.blockfrost.io',
        }),
        BLOCKFROST_URL_MAINNET: str({
          desc: 'Blockfrost base URL',
          default: 'https://cardano-mainnet.blockfrost.io',
        }),
        BLOCKFROST_PROJECT_ID_PREPROD: str({ desc: 'Blockfrost API key' }),
        BLOCKFROST_PROJECT_ID_PREVIEW: str({ desc: 'Blockfrost API key' }),
        BLOCKFROST_PROJECT_ID_MAINNET: str({ desc: 'Blockfrost API key' }),
        MAESTRO_URL_TESTNET: str({
          desc: 'Maestro base URL',
          default: 'https://dev-maestro.lw.iog.io',
        }),
        MAESTRO_URL_MAINNET: str({
          desc: 'Maestro base URL',
          default: 'https://maestro.lw.iog.io',
        }),
        MAESTRO_PROJECT_ID_TESTNET: str({
          desc: 'Maestro API key',
          default: '',
        }),
        MAESTRO_PROJECT_ID_MAINNET: str({
          desc: 'Maestro API key',
          default: '',
        }),
        MEMPOOLSPACE_URL_MAINNET: str({
          desc: 'Mempool.space API base URL (used by the Bitcoin fee market provider)',
          default: 'https://mempool.lw.iog.io',
        }),
        MEMPOOLSPACE_URL_TESTNET: str({
          desc: 'Mempool.space API base URL (used by the Bitcoin fee market provider)',
          default: 'https://mempool.lw.iog.io/testnet4',
        }),
        BITCOIN_BLOCKCHAIN_EXPLORER_URL_MAINNET: str({
          desc: 'Bitcoin blockchain explorer base URL (public website, used for transaction/address links)',
          default: 'https://mempool.space',
        }),
        BITCOIN_BLOCKCHAIN_EXPLORER_URL_TESTNET: str({
          desc: 'Bitcoin blockchain explorer base URL (public website, used for transaction/address links)',
          default: 'https://mempool.space/testnet4',
        }),
        BLOCKFROST_IPFS_URL: str({
          desc: 'Blockfrost IPFS base URL',
          default: 'https://ipfs.blockfrost.dev',
        }),
        CEXPLORER_URL_MAINNET: str({
          desc: 'Explorer base URL',
          default: 'https://cexplorer.io',
        }),
        CEXPLORER_URL_PREVIEW: str({
          desc: 'Explorer base URL',
          default: 'https://preview.cexplorer.io',
        }),
        CEXPLORER_URL_PREPROD: str({
          desc: 'Explorer base URL',
          default: 'https://preprod.cexplorer.io',
        }),
        CEXPLORER_URL_SANCHONET: str({
          desc: 'Explorer base URL',
          default: 'https://sancho.cexplorer.io',
        }),
        SENTRY_DSN: str({
          desc: 'Sentry DSN for error tracking',
          default: ENV === 'development' ? '' : undefined,
        }),
        LEARN_MORE_URL: str({
          desc: 'URL to learn more',
        }),
        URL_LACE_PAGE: str({
          desc: 'URL to Lace website',
        }),
        NFT_CDN_URL: str({
          desc: 'URL to LaceNFT CDN',
        }),
        COINGECKO_API_BASE_URL: str({
          desc: 'CoinGecko API base URL',
          default: 'https://coingecko.live-mainnet.eks.lw.iog.io/api/v3',
        }),
        STEELSWAP_API_BASE_URL: str({
          desc: 'Steelswap API base URL',
          default: 'https://apidev.steelswap.io',
        }),
      },
      // In vitest, disable the default reporter to avoid process.exit and stderr noise
      process.env.VITEST ? { reporter: null } : undefined,
    );
    return {
      postHogUrl: validatedEnvironment.POSTHOG_API_URL,
      featureFlagCheckFrequency: Seconds(
        Number(validatedEnvironment.FEATURE_FLAG_CHECK_FREQUENCY_SECONDS),
      ),
      extraFeatureFlags: [],
      postHogApiToken: validatedEnvironment.POSTHOG_API_TOKEN,
      defaultFeatureFlags,
      defaultMidnightTestnetNetworkId:
        validatedEnvironment.DEFAULT_MIDNIGHT_TESTNET_NETWORK_ID,
      defaultTestnetChainId:
        validatedEnvironment.DEFAULT_CARDANO_TESTNET_CHAIN_ID,
      cookiePolicyUrl: validatedEnvironment.COOKIE_POLICY_URL,
      privacyPolicyUrl: validatedEnvironment.PRIVACY_POLICY_URL,
      termsAndConditionsUrl: validatedEnvironment.TERMS_AND_CONDITIONS_URL,
      faqUrl: validatedEnvironment.FAQ_URL,
      faqRecoveryPhraseUrl: validatedEnvironment.FAQ_RECOVERY_PHRASE_URL,
      faqCopyPasteRecoveryPhraseUrl:
        validatedEnvironment.FAQ_COPY_PASTE_RECOVERY_PHRASE_URL,
      recoveryPhraseVideoUrl: validatedEnvironment.RECOVERY_PHRASE_VIDEO_URL,
      zendeskNewRequestUrl: validatedEnvironment.ZENDESK_NEW_REQUEST_URL,
      cexplorerUrls: {
        [Cardano.NetworkMagics.Mainnet]:
          validatedEnvironment.CEXPLORER_URL_MAINNET,
        [Cardano.NetworkMagics.Preview]:
          validatedEnvironment.CEXPLORER_URL_PREVIEW,
        [Cardano.NetworkMagics.Preprod]:
          validatedEnvironment.CEXPLORER_URL_PREPROD,
        [Cardano.NetworkMagics.Sanchonet]:
          validatedEnvironment.CEXPLORER_URL_SANCHONET,
      },
      bitcoinExplorerUrls: {
        ['mainnet']:
          validatedEnvironment.BITCOIN_BLOCKCHAIN_EXPLORER_URL_MAINNET,
        ['testnet4']:
          validatedEnvironment.BITCOIN_BLOCKCHAIN_EXPLORER_URL_TESTNET,
      },
      bitcoinProvider: {
        tipPollFrequency: Milliseconds(60_000),
        historyDepth: 20,
        maestroConfig: {
          ['testnet4']: {
            clientConfig: {
              baseUrl: validatedEnvironment.MAESTRO_URL_TESTNET,
              apiVersion: 'v0',
              projectId: validatedEnvironment.MAESTRO_PROJECT_ID_TESTNET,
            },
            rateLimiterConfig: {
              size: 500,
              increaseAmount: 10,
              increaseInterval: Milliseconds(1000),
            },
          },
          ['mainnet']: {
            clientConfig: {
              baseUrl: validatedEnvironment.MAESTRO_URL_MAINNET,
              apiVersion: 'v0',
              projectId: validatedEnvironment.MAESTRO_PROJECT_ID_MAINNET,
            },
            rateLimiterConfig: {
              size: 500,
              increaseAmount: 10,
              increaseInterval: Milliseconds(1000),
            },
          },
        },
      },
      bitcoinFeeMarketProvider: {
        mempoolSpaceConfig: {
          ['testnet4']: {
            url: validatedEnvironment.MEMPOOLSPACE_URL_TESTNET,
          },
          ['mainnet']: {
            url: validatedEnvironment.MEMPOOLSPACE_URL_MAINNET,
          },
        },
      },
      cardanoProvider: {
        tipPollFrequency: Milliseconds(30_000),
        transactionHistoryPollingIntervalSeconds: Milliseconds(30_000),
        blockfrostConfigs: {
          [1]: {
            clientConfig: {
              baseUrl: validatedEnvironment.BLOCKFROST_URL_PREPROD,
              apiVersion: 'v0',
              projectId: validatedEnvironment.BLOCKFROST_PROJECT_ID_PREPROD,
            },
            rateLimiterConfig: {
              size: 500,
              increaseAmount: 10,
              increaseInterval: Milliseconds(1000),
            },
          },
          [2]: {
            clientConfig: {
              baseUrl: validatedEnvironment.BLOCKFROST_URL_PREVIEW,
              apiVersion: 'v0',
              projectId: validatedEnvironment.BLOCKFROST_PROJECT_ID_PREVIEW,
            },
            rateLimiterConfig: {
              size: 500,
              increaseAmount: 10,
              increaseInterval: Milliseconds(1000),
            },
          },
          [764_824_073]: {
            clientConfig: {
              baseUrl: validatedEnvironment.BLOCKFROST_URL_MAINNET,
              apiVersion: 'v0',
              projectId: validatedEnvironment.BLOCKFROST_PROJECT_ID_MAINNET,
            },
            rateLimiterConfig: {
              size: 500,
              increaseAmount: 10,
              increaseInterval: Milliseconds(1000),
            },
          },
        },
      },
      nftCdnUrl: validatedEnvironment.NFT_CDN_URL,
      coinGeckoApiBaseUrl: validatedEnvironment.COINGECKO_API_BASE_URL,
      steelswapApiBaseUrl: validatedEnvironment.STEELSWAP_API_BASE_URL,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Configuration validation failed:', error);
    // eslint-disable-next-line no-console
    console.log('NODE_ENV:', process.env.NODE_ENV);

    // Check which environment variables are actually missing or empty
    const allValidatedVariables = [
      // Required variables (no defaults)
      'EXPO_PUBLIC_POSTHOG_API_URL',
      'EXPO_PUBLIC_FEATURE_FLAG_CHECK_FREQUENCY_SECONDS',
      'EXPO_PUBLIC_POSTHOG_API_TOKEN',
      'EXPO_PUBLIC_DEFAULT_MIDNIGHT_TESTNET_NETWORK_ID',
      'EXPO_PUBLIC_DEFAULT_CARDANO_TESTNET_CHAIN_ID',
      'EXPO_PUBLIC_RECOVERY_PHRASE_VIDEO_URL',
      'EXPO_PUBLIC_COOKIE_POLICY_URL',
      'EXPO_PUBLIC_PRIVACY_POLICY_URL',
      'EXPO_PUBLIC_TERMS_AND_CONDITIONS_URL',
      'EXPO_PUBLIC_FAQ_URL',
      'EXPO_PUBLIC_FAQ_RECOVERY_PHRASE_URL',
      'EXPO_PUBLIC_FAQ_COPY_PASTE_RECOVERY_PHRASE_URL',
      'EXPO_PUBLIC_ZENDESK_NEW_REQUEST_URL',
      'EXPO_PUBLIC_BANXA_URL',
      'EXPO_PUBLIC_GOV_TOOLS_URL',
      'EXPO_PUBLIC_BLOCKFROST_PROJECT_ID_PREPROD',
      'EXPO_PUBLIC_BLOCKFROST_PROJECT_ID_PREVIEW',
      'EXPO_PUBLIC_BLOCKFROST_PROJECT_ID_MAINNET',
      'EXPO_PUBLIC_LEARN_MORE_URL',
      'EXPO_PUBLIC_URL_LACE_PAGE',
      'EXPO_PUBLIC_NFT_CDN_URL',
      // Conditionally required: SENTRY_DSN required in production, optional in development
      ...(ENV === 'production' ? ['EXPO_PUBLIC_SENTRY_DSN'] : []),
    ];

    const missing = allValidatedVariables.filter(variableName => {
      const value = process.env[variableName] as string | undefined;
      return !value || value.trim() === '' || value.trim() === 'TBD';
    });

    // Detect which env files might be in use
    const nodeEnvironment = process.env.NODE_ENV || 'development';
    const environmentFileInfo = `Environment: ${nodeEnvironment}\nPossible env files (in priority order):\n• .env.local (highest priority)\n• .env.${nodeEnvironment}\n• .env (lowest priority)`;

    if (missing.length > 0) {
      configValidationError = `COUNT:${missing.length}|VARS:${missing
        .map(variable => `• ${variable}`)
        .join('\n')}|ENV:${environmentFileInfo}`;
    } else {
      configValidationError = `COUNT:0|ERROR:${
        error instanceof Error
          ? error.message
          : 'Configuration validation failed'
      }|ENV:${environmentFileInfo}`;
    }

    return null;
  }
};

export const appConfig: AppConfig | null = validateEnvironment();
export { configValidationError };
