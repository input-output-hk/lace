import { FeatureFlagKey } from '@lace-contract/feature';

import type { FeatureFlag } from '@lace-contract/feature';

/**
 * Default feature flags for the application.
 *
 * To override these flags for development or testing:
 * 1. Copy this entire file to feature-flags.override.ts
 * 2. Modify the flags as needed in the override file
 * 3. The override file will completely replace these default flags
 *
 * The override file is git-ignored, so your changes won't be committed.
 *
 * Note: On nightly builds, the CI workflow creates a feature-flags.override.ts
 * that replaces FEATURES_DEV with FEATURES_POSTHOG and removes TEST_API automatically.
 * (see extension-nightly-build.yml)
 */
const featureFlags: FeatureFlag[] = [
  { key: FeatureFlagKey('ACCOUNT_MANAGEMENT') },
  { key: FeatureFlagKey('ADA_HANDLE') },
  { key: FeatureFlagKey('ADDRESS_BOOK') },
  { key: FeatureFlagKey('ANALYTICS_POSTHOG') },
  { key: FeatureFlagKey('BITCOIN_MEMPOOL_FEE_MARKET') },
  { key: FeatureFlagKey('BLOCKCHAIN_BITCOIN') },
  { key: FeatureFlagKey('BLOCKCHAIN_CARDANO') },
  { key: FeatureFlagKey('BLOCKCHAIN_CARDANO_DAPP_CONNECTOR') },
  { key: FeatureFlagKey('BLOCKCHAIN_MIDNIGHT') },
  { key: FeatureFlagKey('BLOCKCHAIN_MIDNIGHT_DAPP_CONNECTOR') },
  {
    key: FeatureFlagKey('BLOCKCHAIN_MIDNIGHT_INDEXER_URLS'),
    payload: {
      undeployed: 'http://localhost:8088/api/v4/graphql',
      preprod: 'https://indexer.preprod.midnight.network/api/v4/graphql',
      preview: 'https://indexer.preview.midnight.network/api/v4/graphql',
      qanet: 'https://indexer.qanet.midnight.network/api/v4/graphql',
      mainnet: 'https://indexer.mainnet.midnight.network/api/v4/graphql',
    },
  },
  { key: FeatureFlagKey('BLOCKCHAIN_MIDNIGHT_MAINNET_SUPPORT') },
  {
    key: FeatureFlagKey('BLOCKCHAIN_MIDNIGHT_NODE_URLS'),
    payload: {
      undeployed: 'http://localhost:9944',
      preprod: 'https://rpc.preprod.midnight.network',
      preview: 'https://rpc.preview.midnight.network',
      qanet: 'https://rpc.qanet.midnight.network',
      mainnet: 'https://rpc.mainnet.midnight.network',
    },
  },
  { key: FeatureFlagKey('BLOCKCHAIN_MIDNIGHT_PREPROD_SUPPORT') },
  { key: FeatureFlagKey('BLOCKCHAIN_MIDNIGHT_PREVIEW_SUPPORT') },
  {
    key: FeatureFlagKey('BLOCKCHAIN_MIDNIGHT_REMOTE_PROOF_SERVER'),
    payload: {
      preprod: 'https://proof-server.preprod.midnight.network',
      preview: 'https://proof-server.preview.midnight.network',
    },
  },
  { key: FeatureFlagKey('BLOCKCHAIN_MIDNIGHT_UNSHIELDED') },
  {
    key: FeatureFlagKey('DAPP_EXPLORER'),
    payload: {
      availableChains: ['cardano', 'midnight'],
      // Global filters - apply to ALL platforms
      disallowedDapps: {
        legalIssues: [],
        connectivityIssues: [
          27302, 19473, 19796, 19717, 18803, 22724, 20115, 19922,
        ],
      },
      disallowedCategories: {
        legalIssues: ['high-risk', 'gambling'],
      },
      disallowedTags: {},
      // Platform-specific filters - merged with global at runtime
      web: {
        disallowedDapps: {},
        disallowedCategories: {},
        disallowedTags: {},
      },
      showStatistics: false, // used if data may be stale
    },
  },
  { key: FeatureFlagKey('FEATURES_POSTHOG') },
  {
    key: FeatureFlagKey('FONT_SELECTION'),
    payload: {
      fontFamily: 'primary',
    },
  },
  { key: FeatureFlagKey('INITIAL_NETWORK_TYPE'), payload: 'mainnet' },
  { key: FeatureFlagKey('LOG_LEVEL'), payload: 'error' },
  { key: FeatureFlagKey('MD_MIGRATION') },
  { key: FeatureFlagKey('NOTIFICATION_CENTER') },
  { key: FeatureFlagKey('SEND_FLOW') },
  { key: FeatureFlagKey('STAKING_CENTER') },
  {
    key: FeatureFlagKey('SUPPORTED_CURRENCIES'),
    payload: {
      currencies: [
        { name: 'USD', ticker: '$' },
        { name: 'EUR', ticker: '€' },
        { name: 'GBP', ticker: '£' },
        { name: 'JPY', ticker: '¥' },
        { name: 'CAD', ticker: 'C$' },
        { name: 'AUD', ticker: 'A$' },
        { name: 'CHF', ticker: 'CHF' },
        { name: 'BRL', ticker: 'R$' },
        { name: 'INR', ticker: '₹' },
        { name: 'KRW', ticker: '₩' },
        { name: 'VND', ticker: '₫' },
        { name: 'MXN', ticker: 'MXN' },
      ],
    },
  },
  {
    key: FeatureFlagKey('SWAP_CENTER'),
    payload: {
      steelswapApiUrl: 'https://steelswap.lw.iog.io',
    },
  },
  { key: FeatureFlagKey('TOKEN_PRICING') },
  { key: FeatureFlagKey('V1_MIGRATION') },
  { key: FeatureFlagKey('VAULT_LEDGER') },
  { key: FeatureFlagKey('VAULT_TREZOR') },
];

export default featureFlags;
