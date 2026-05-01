import { FeatureFlagKey } from '@lace-contract/feature';

import type { FeatureFlag } from '@lace-contract/feature';

/**
 * Default feature flags for the mobile application.
 *
 * This file is the production-safe default. It must never include flags that
 * expose debug APIs (FEATURES_DEV, TEST_API) or are otherwise unsafe in production.
 *
 * For local development, copy this file to `feature-flags.override.ts` and modify
 * as needed (e.g. swap FEATURES_POSTHOG for FEATURES_DEV, add TEST_API). Metro's
 * resolver automatically prefers the override when it exists. The override is
 * git-ignored so your changes won't be committed.
 *
 * When adding a new flag here, remove it from the experimental list in
 * `test/feature-flag-compatibility.test.ts`.
 *
 * Other options: VAULT_LEDGER
 */
export const defaultFeatureFlags: FeatureFlag[] = [
  { key: FeatureFlagKey('ADA_HANDLE') },
  { key: FeatureFlagKey('ADDRESS_BOOK') },
  { key: FeatureFlagKey('ANALYTICS_POSTHOG') },
  { key: FeatureFlagKey('FEATURES_POSTHOG') },
  { key: FeatureFlagKey('SEND_FLOW') },
  { key: FeatureFlagKey('INITIAL_NETWORK_TYPE'), payload: 'mainnet' },
  { key: FeatureFlagKey('LOG_LEVEL'), payload: 'error' },
  { key: FeatureFlagKey('BLOCKCHAIN_CARDANO'), payload: 'preprod' },
  { key: FeatureFlagKey('ACCOUNT_MANAGEMENT') },
  { key: FeatureFlagKey('BLOCKCHAIN_BITCOIN') },
  { key: FeatureFlagKey('BITCOIN_MEMPOOL_FEE_MARKET') },
  {
    // This flag enforces biometric/passcode requirement for the app.
    key: FeatureFlagKey('ENFORCE_BIOMETRIC_REQUIREMENT'),
    payload: {
      enabled: false,
    },
  },
  {
    key: FeatureFlagKey('FONT_SELECTION'),
    payload: {
      fontFamily: 'primary',
    },
  },
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
    key: FeatureFlagKey('DAPP_EXPLORER'),
    payload: {
      availableChains: ['cardano'],
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
      ios: {
        disallowedDapps: {},
        disallowedCategories: {
          appStoreIssues: ['collectibles', 'exchanges'],
        },
        disallowedTags: {
          appStoreIssues: ['nft'],
        },
      },
      android: {
        disallowedDapps: {},
        disallowedCategories: {},
        disallowedTags: {},
      },
      showStatistics: false, // used if data may be stale
    },
  },
  {
    key: FeatureFlagKey('BLOCKCHAIN_CARDANO_DAPP_CONNECTOR'),
  },
  { key: FeatureFlagKey('CARDANO_URI_LINKING') },
  {
    key: FeatureFlagKey('TOKEN_PRICING'),
  },
  { key: FeatureFlagKey('STAKING_CENTER') },
  { key: FeatureFlagKey('NOTIFICATION_CENTER') },
  { key: FeatureFlagKey('MD_MIGRATION') },
  {
    key: FeatureFlagKey('SWAP_CENTER'),
    payload: {
      steelswapApiUrl: 'https://steelswap.lw.iog.io',
    },
  },
];

export default defaultFeatureFlags;
