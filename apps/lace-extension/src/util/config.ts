import { Cardano } from '@cardano-sdk/core';
import { isMidnightSDKTestNetworkId } from '@lace-contract/midnight-context';
import { Environment } from '@lace-contract/module';
import { blockfrostProxyConfigs } from '@lace-lib/cardano-provider-core';
import { Milliseconds, Seconds } from '@lace-lib/util';
import { cleanEnv, str, num, makeValidator } from 'envalid';

import defaultFeatureFlags from '../feature-flags';

import type { FeatureFlagKey } from '@lace-contract/feature';
import type { MidnightSDKTestNetworkId } from '@lace-contract/midnight-context';
import type { AppConfig } from '@lace-contract/module';

export const ENV = Environment(
  process.env.EXPO_PUBLIC_NODE_ENV || process.env.NODE_ENV || 'development',
).unwrap();

const featureFlagKeys = makeValidator<FeatureFlagKey[]>(variable => {
  return variable
    .split(',')
    .map(key => key.trim())
    .filter(Boolean) as FeatureFlagKey[];
});

const midnightTestnetNetworkId = makeValidator<MidnightSDKTestNetworkId>(
  variable => {
    if (isMidnightSDKTestNetworkId(variable)) return variable;
    throw new Error('Invalid testnet network id: ' + variable);
  },
);

const validateEnvironment = (): AppConfig => {
  const validatedEnvironment = cleanEnv(
    {
      // webpack creates process.env object as string
      // which doesn't work with envalid
      EXTRA_FEATURE_FLAGS: process.env.EXTRA_FEATURE_FLAGS,
      POSTHOG_API_URL:
        process.env.POSTHOG_API_URL || process.env.EXPO_PUBLIC_POSTHOG_API_URL,
      FEATURE_FLAG_CHECK_FREQUENCY_SECONDS:
        process.env.FEATURE_FLAG_CHECK_FREQUENCY_SECONDS ||
        process.env.EXPO_PUBLIC_FEATURE_FLAG_CHECK_FREQUENCY_SECONDS,
      POSTHOG_API_TOKEN:
        process.env.POSTHOG_API_TOKEN ||
        process.env.EXPO_PUBLIC_POSTHOG_API_TOKEN,
      DEFAULT_MIDNIGHT_TESTNET_NETWORK_ID:
        process.env.DEFAULT_MIDNIGHT_TESTNET_NETWORK_ID ||
        process.env.EXPO_PUBLIC_DEFAULT_MIDNIGHT_TESTNET_NETWORK_ID,
      RECOVERY_PHRASE_VIDEO_URL:
        process.env.URL_RECOVERY_PHRASE_VIDEO ||
        process.env.EXPO_PUBLIC_URL_RECOVERY_PHRASE_VIDEO,
      COOKIE_POLICY_URL:
        process.env.URL_COOKIE_POLICY ||
        process.env.EXPO_PUBLIC_URL_COOKIE_POLICY,
      PRIVACY_POLICY_URL:
        process.env.URL_PRIVACY_POLICY ||
        process.env.EXPO_PUBLIC_URL_PRIVACY_POLICY,
      TERMS_AND_CONDITIONS_URL:
        process.env.URL_TERMS_AND_CONDITIONS ||
        process.env.EXPO_PUBLIC_URL_TERMS_AND_CONDITIONS,
      FAQ_URL: process.env.URL_FAQ || process.env.EXPO_PUBLIC_URL_FAQ,
      FAQ_RECOVERY_PHRASE_URL:
        process.env.URL_FAQ_RECOVERY_PHRASE ||
        process.env.EXPO_PUBLIC_URL_FAQ_RECOVERY_PHRASE,
      FAQ_COPY_PASTE_RECOVERY_PHRASE_URL:
        process.env.URL_FAQ_COPY_PASTE_RECOVERY_PHRASE ||
        process.env.EXPO_PUBLIC_URL_FAQ_COPY_PASTE_RECOVERY_PHRASE,
      ZENDESK_NEW_REQUEST_URL:
        process.env.URL_ZENDESK_NEW_REQUEST ||
        process.env.EXPO_PUBLIC_URL_ZENDESK_NEW_REQUEST,
      BLOCKFROST_PROXY_URL:
        process.env.BLOCKFROST_PROXY_URL ||
        process.env.EXPO_PUBLIC_BLOCKFROST_PROXY_URL,
      BLOCKFROST_IPFS_URL:
        process.env.BLOCKFROST_IPFS_URL ||
        process.env.EXPO_PUBLIC_BLOCKFROST_IPFS_URL,
      MAESTRO_PROJECT_ID_TESTNET:
        process.env.MAESTRO_PROJECT_ID_TESTNET ||
        process.env.EXPO_PUBLIC_MAESTRO_PROJECT_ID_TESTNET,
      MAESTRO_PROJECT_ID_MAINNET:
        process.env.MAESTRO_PROJECT_ID_MAINNET ||
        process.env.EXPO_PUBLIC_MAESTRO_PROJECT_ID_MAINNET,
      MAESTRO_URL_TESTNET:
        process.env.MAESTRO_URL_TESTNET ||
        process.env.EXPO_PUBLIC_MAESTRO_URL_TESTNET,
      MAESTRO_URL_MAINNET:
        process.env.MAESTRO_URL_MAINNET ||
        process.env.EXPO_PUBLIC_MAESTRO_URL_MAINNET,
      MEMPOOLSPACE_URL_TESTNET:
        process.env.MEMPOOLSPACE_URL_TESTNET ||
        process.env.EXPO_PUBLIC_MEMPOOLSPACE_URL_TESTNET,
      MEMPOOLSPACE_URL_MAINNET:
        process.env.MEMPOOLSPACE_URL_MAINNET ||
        process.env.EXPO_PUBLIC_MEMPOOLSPACE_URL_MAINNET,
      BITCOIN_BLOCKCHAIN_EXPLORER_URL_TESTNET:
        process.env.BITCOIN_BLOCKCHAIN_EXPLORER_URL_TESTNET ||
        process.env.EXPO_PUBLIC_BITCOIN_BLOCKCHAIN_EXPLORER_URL_TESTNET,
      BITCOIN_BLOCKCHAIN_EXPLORER_URL_MAINNET:
        process.env.BITCOIN_BLOCKCHAIN_EXPLORER_URL_MAINNET ||
        process.env.EXPO_PUBLIC_BITCOIN_BLOCKCHAIN_EXPLORER_URL_MAINNET,
      CEXPLORER_URL_MAINNET: process.env.EXPO_PUBLIC_CEXPLORER_URL_MAINNET,
      CEXPLORER_URL_PREVIEW: process.env.EXPO_PUBLIC_CEXPLORER_URL_PREVIEW,
      CEXPLORER_URL_PREPROD: process.env.EXPO_PUBLIC_CEXPLORER_URL_PREPROD,
      CEXPLORER_URL_SANCHONET: process.env.EXPO_PUBLIC_CEXPLORER_URL_SANCHONET,
      LACE_PAGE_URL:
        process.env.URL_LACE_PAGE || process.env.EXPO_PUBLIC_URL_LACE_PAGE,
      COINGECKO_API_BASE_URL:
        process.env.COINGECKO_API_BASE_URL ||
        process.env.EXPO_PUBLIC_COINGECKO_API_BASE_URL,
      MIDNIGHT_FOUNDATION_TERMS_AND_CONDITIONS_URL:
        process.env.MIDNIGHT_FOUNDATION_TERMS_AND_CONDITIONS_URL ||
        process.env.EXPO_PUBLIC_MIDNIGHT_FOUNDATION_TERMS_AND_CONDITIONS_URL,
      MIDNIGHT_GLOBAL_TERMS_AND_CONDITIONS_URL:
        process.env.MIDNIGHT_GLOBAL_TERMS_AND_CONDITIONS_URL ||
        process.env.EXPO_PUBLIC_MIDNIGHT_GLOBAL_TERMS_AND_CONDITIONS_URL,
      LACE_TERMS_OF_USE_URL:
        process.env.LACE_TERMS_OF_USE_URL ||
        process.env.EXPO_PUBLIC_LACE_TERMS_OF_USE_URL,
      STEELSWAP_API_BASE_URL:
        process.env.STEELSWAP_API_BASE_URL ||
        process.env.EXPO_PUBLIC_STEELSWAP_API_BASE_URL,
      NFT_CDN_URL:
        process.env.NFT_CDN_URL || process.env.EXPO_PUBLIC_NFT_CDN_URL,
      CARDANO_CUBE_BASE_URL:
        process.env.CARDANO_CUBE_BASE_URL ||
        process.env.EXPO_PUBLIC_CARDANO_CUBE_BASE_URL,
    },
    {
      POSTHOG_API_URL: str({ desc: 'URL for PostHog analytics' }),
      FEATURE_FLAG_CHECK_FREQUENCY_SECONDS: num({
        desc: 'Frequency in seconds for checking feature flags',
      }),
      EXTRA_FEATURE_FLAGS: featureFlagKeys({
        desc: 'Additional feature flags to always load (regardless of defaults or what feature module provides)',
        default: [],
      }),
      POSTHOG_API_TOKEN: str({ desc: 'API token for PostHog' }),
      DEFAULT_MIDNIGHT_TESTNET_NETWORK_ID: midnightTestnetNetworkId({
        desc: 'Default Midnight testnet network id',
      }),
      RECOVERY_PHRASE_VIDEO_URL: str({
        desc: 'URL to recovery phrase video explanation',
      }),
      COOKIE_POLICY_URL: str({
        desc: 'URL to Cookie Policy',
      }),
      PRIVACY_POLICY_URL: str({
        desc: 'URL to Privacy Policy',
      }),
      LACE_PAGE_URL: str({
        desc: 'URL to Lace',
      }),
      TERMS_AND_CONDITIONS_URL: str({
        desc: 'URL to Terms and Conditions',
      }),
      FAQ_URL: str({
        desc: 'URL to FAQ',
      }),
      FAQ_RECOVERY_PHRASE_URL: str({
        desc: 'URL to FAQ about recovery phrase',
      }),
      FAQ_COPY_PASTE_RECOVERY_PHRASE_URL: str({
        desc: 'URL to FAQ about recovery phrase copy-paste best practices',
      }),
      ZENDESK_NEW_REQUEST_URL: str({
        desc: 'URL to create a new Zendesk request',
      }),
      BLOCKFROST_PROXY_URL: str({
        desc: 'Lace Blockfrost proxy base URL; per-network paths derived in code',
      }),
      BLOCKFROST_IPFS_URL: str({
        desc: 'Blockfrost IPFS base URL',
        default: 'https://ipfs.blockfrost.dev',
      }),
      MAESTRO_URL_TESTNET: str({
        desc: 'Maestro base URL',
        default: '',
      }),
      MAESTRO_URL_MAINNET: str({
        desc: 'Maestro base URL',
        default: '',
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
        default: '',
      }),
      MEMPOOLSPACE_URL_TESTNET: str({
        desc: 'Mempool.space API base URL (used by the Bitcoin fee market provider)',
        default: '',
      }),
      BITCOIN_BLOCKCHAIN_EXPLORER_URL_MAINNET: str({
        desc: 'Bitcoin blockchain explorer base URL (public website, used for transaction/address links)',
        default: 'https://mempool.space',
      }),
      BITCOIN_BLOCKCHAIN_EXPLORER_URL_TESTNET: str({
        desc: 'Bitcoin blockchain explorer base URL (public website, used for transaction/address links)',
        default: 'https://mempool.space/testnet4',
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
      COINGECKO_API_BASE_URL: str({
        desc: 'CoinGecko API base URL',
        default: '',
      }),
      MIDNIGHT_FOUNDATION_TERMS_AND_CONDITIONS_URL: str({
        desc: 'URL to Midnight Foundation Terms and Conditions',
      }),
      MIDNIGHT_GLOBAL_TERMS_AND_CONDITIONS_URL: str({
        desc: 'URL to Midnight Global Terms and Conditions',
      }),
      LACE_TERMS_OF_USE_URL: str({
        desc: 'URL to Lace Terms of Use',
      }),
      STEELSWAP_API_BASE_URL: str({
        desc: 'Steelswap API base URL',
        default: '',
      }),
      NFT_CDN_URL: str({
        desc: 'URL to LaceNFT CDN',
      }),
      CARDANO_CUBE_BASE_URL: str({ desc: 'Cardano Cube API base URL' }),
    },
  );

  const rateLimiterConfig = {
    size: 500,
    increaseAmount: 10,
    increaseInterval: Milliseconds(1000),
  };
  return {
    cexplorerUrls: {
      [Cardano.NetworkMagics.Preprod]:
        validatedEnvironment.CEXPLORER_URL_PREPROD,
      [Cardano.NetworkMagics.Preview]:
        validatedEnvironment.CEXPLORER_URL_PREVIEW,
      [Cardano.NetworkMagics.Mainnet]:
        validatedEnvironment.CEXPLORER_URL_MAINNET,
      [Cardano.NetworkMagics.Sanchonet]:
        validatedEnvironment.CEXPLORER_URL_SANCHONET,
    },
    bitcoinExplorerUrls: {
      ['mainnet']: validatedEnvironment.BITCOIN_BLOCKCHAIN_EXPLORER_URL_MAINNET,
      ['testnet4']:
        validatedEnvironment.BITCOIN_BLOCKCHAIN_EXPLORER_URL_TESTNET,
    },
    postHogUrl: validatedEnvironment.POSTHOG_API_URL,
    featureFlagCheckFrequency: Seconds(
      validatedEnvironment.FEATURE_FLAG_CHECK_FREQUENCY_SECONDS,
    ),
    extraFeatureFlags: validatedEnvironment.EXTRA_FEATURE_FLAGS,
    bitcoinProvider: {
      tipPollFrequency: Milliseconds(60000),
      historyDepth: 20,
      maestroConfig: {
        ['testnet4']: {
          clientConfig: {
            baseUrl: validatedEnvironment.MAESTRO_URL_TESTNET,
            apiVersion: 'v0',
            projectId: validatedEnvironment.MAESTRO_PROJECT_ID_TESTNET,
          },
          rateLimiterConfig,
        },
        ['mainnet']: {
          clientConfig: {
            baseUrl: validatedEnvironment.MAESTRO_URL_MAINNET,
            apiVersion: 'v0',
            projectId: validatedEnvironment.MAESTRO_PROJECT_ID_MAINNET,
          },
          rateLimiterConfig,
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
      blockfrostConfigs: blockfrostProxyConfigs({
        proxyBaseUrl: validatedEnvironment.BLOCKFROST_PROXY_URL,
        surface: 'extension',
        rateLimiterConfig,
      }),
    },
    postHogApiToken: validatedEnvironment.POSTHOG_API_TOKEN,
    defaultFeatureFlags,
    defaultMidnightTestnetNetworkId:
      validatedEnvironment.DEFAULT_MIDNIGHT_TESTNET_NETWORK_ID,
    defaultTestnetChainId: Cardano.ChainIds.Preprod,
    cookiePolicyUrl: validatedEnvironment.COOKIE_POLICY_URL,
    privacyPolicyUrl: validatedEnvironment.PRIVACY_POLICY_URL,
    termsAndConditionsUrl: validatedEnvironment.TERMS_AND_CONDITIONS_URL,
    faqUrl: validatedEnvironment.FAQ_URL,
    faqRecoveryPhraseUrl: validatedEnvironment.FAQ_RECOVERY_PHRASE_URL,
    faqCopyPasteRecoveryPhraseUrl:
      validatedEnvironment.FAQ_COPY_PASTE_RECOVERY_PHRASE_URL,
    recoveryPhraseVideoUrl: validatedEnvironment.RECOVERY_PHRASE_VIDEO_URL,
    zendeskNewRequestUrl: validatedEnvironment.ZENDESK_NEW_REQUEST_URL,
    coinGeckoApiBaseUrl: validatedEnvironment.COINGECKO_API_BASE_URL,
    midnightFoundationTermsAndConditionsUrl:
      validatedEnvironment.MIDNIGHT_FOUNDATION_TERMS_AND_CONDITIONS_URL,
    midnightGlobalTermsAndConditionsUrl:
      validatedEnvironment.MIDNIGHT_GLOBAL_TERMS_AND_CONDITIONS_URL,
    laceTermsOfUseUrl: validatedEnvironment.LACE_TERMS_OF_USE_URL,
    steelswapApiBaseUrl: validatedEnvironment.STEELSWAP_API_BASE_URL,
    nftCdnUrl: validatedEnvironment.NFT_CDN_URL,
    cardanoCubeBaseUrl: validatedEnvironment.CARDANO_CUBE_BASE_URL,
  };
};

export const appConfig: AppConfig = validateEnvironment();
