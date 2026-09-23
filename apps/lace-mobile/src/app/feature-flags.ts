import { FeatureFlagKey } from '@lace-contract/feature';

import type { FeatureFlag } from '@lace-contract/feature';
import type { RealFiFeaturePayload } from '@lace-contract/realfi-staking';

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
 */
export const defaultFeatureFlags: FeatureFlag[] = [
  { key: FeatureFlagKey('ACCOUNT_MANAGEMENT') },
  { key: FeatureFlagKey('ADA_HANDLE') },
  { key: FeatureFlagKey('ADDRESS_BOOK') },
  { key: FeatureFlagKey('ANALYTICS_POSTHOG') },
  { key: FeatureFlagKey('BITCOIN_MEMPOOL_FEE_MARKET') },
  { key: FeatureFlagKey('BLOCKCHAIN_BITCOIN') },
  { key: FeatureFlagKey('BLOCKCHAIN_CARDANO') },
  {
    key: FeatureFlagKey('BLOCKCHAIN_CARDANO_DAPP_CONNECTOR'),
  },
  { key: FeatureFlagKey('CARDANO_URI_LINKING') },
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
    // This flag enforces biometric/passcode requirement for the app.
    key: FeatureFlagKey('ENFORCE_BIOMETRIC_REQUIREMENT'),
    payload: {
      enabled: false,
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
  { key: FeatureFlagKey('MIGRATE_WALLET') },
  { key: FeatureFlagKey('NOTIFICATION_CENTER') },
  {
    // RealFi availability is per-network: a network present here is enabled;
    // `{}` uses that network's bundled bootstrap defaults, while PostHog can send
    // per-network overrides (endpoints, policy ids, pool idents, bootstrap UTxOs)
    // and gate delivery by geographical region / device type. Networks absent
    // from the payload are off. With FEATURES_POSTHOG active this entry only
    // serves first runs (empty flag storage); once PostHog flags persist, its
    // REALFI flag must target mobile for the feature to stay on.
    //
    // The time-boxed promotions (`genesisBoost`, `launchSeason`) are
    // deliberately NOT declared here — PostHog owns their schedules so they
    // can start and end without a release, and a committed default would
    // outlive its campaign in every build. Shape per network entry:
    //   "preprod": {
    //     "genesisBoost": { "activeFrom": "<ISO UTC>", "activeTo": "<ISO UTC>" },
    //     "launchSeason": {
    //       "activeFrom": "<ISO UTC>", "activeTo": "<ISO UTC>",
    //       "rewardsDashboardUrl": "<url>", "pointsProgramUrl": "<url>"
    //     }
    //   }
    key: FeatureFlagKey('REALFI'),
    payload: {
      preview: {},
      preprod: {},
    } satisfies RealFiFeaturePayload,
  },
  { key: FeatureFlagKey('SEND_FLOW') },
  {
    key: FeatureFlagKey('STAKING_CENTER'),
    payload: {
      // Promoted pool the earn-rewards target reads. Committed bootstrap defaults
      // for every network (mainnet treated no differently from preprod/preview)
      // so dev / PR / nightly builds can exercise the flow. In production PostHog
      // replaces the bootstrap flags wholesale and owns the real targets, so
      // these values never reach a live-PostHog user.
      promotedPools: {
        mainnet: [
          { id: 'pool1tcmk6at0dmkytxgq5j4u7fgsx9kytvfu7gz22lrs8hp9ztu7arw' },
        ],
        preprod: [
          { id: 'pool132jxjzyw4awr3s75ltcdx5tv5ecv6m042306l630wqjckhfm32r' },
        ],
        preview: [
          { id: 'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy' },
        ],
      },
    },
  },
  {
    key: FeatureFlagKey('SUPPORTED_CURRENCIES'),
    // The currency list itself is the static FIAT_CURRENCIES allowlist in
    // @lace-contract/token-pricing, gated by CoinGecko. This flag only carries
    // an optional manual hide-list applied on top.
    payload: {
      currency_choice_exclusions: [] as string[],
    },
  },
  {
    key: FeatureFlagKey('SWAP_CENTER'),
    payload: {},
  },
  { key: FeatureFlagKey('TOKEN_PRICING') },
  { key: FeatureFlagKey('VAULT_LEDGER') },
  { key: FeatureFlagKey('VAULT_TREZOR') },
  // Air-gapped QR signers. Bootstrap-on so dev / PR / nightly builds offer
  // them wherever hardware wallets appear (onboarding, add wallet, and as
  // migration destinations); production stays PostHog-controlled like every
  // other flag here.
  { key: FeatureFlagKey('SEED_SIGNER') },
  { key: FeatureFlagKey('KEYSTONE') },
  {
    key: FeatureFlagKey('GOVERNANCE_CENTER'),
    payload: {
      promotedDreps: {
        mainnet: [
          {
            id: 'drep1yg4mxhwlct5crvnkqpqy06l6lrszn0f4cyc5k2hv0pk8xhsvluu37',
            additional_information: {
              en: "Lace's default DRep.",
              es: 'El DRep predeterminado de Lace.',
              ja: 'Lace の既定の DRep。',
            },
          },
        ],
        // Testnet DReps so the earn-rewards target resolves on preprod/preview.
        preprod: [
          { id: 'drep1y2v8w544v5teexvycd6zqgh2686yz7050tdv834yegpt0gsnampev' },
        ],
        preview: [
          { id: 'drep1yg4mxhwlct5crvnkqpqy06l6lrszn0f4cyc5k2hv0pk8xhsvluu37' },
        ],
      },
    },
  },
  {
    key: FeatureFlagKey('EARN_REWARDS'),
    // Enablement + advertised rate — a committed bootstrap default like the
    // promoted pool/DRep above, wholesale-replaced by PostHog in production
    // (mainnet treated no differently). Percent numbers: a low–high range here,
    // but a bare number or `{ value }` resolves to a single figure too. A rate is
    // set for preprod/preview only, so mainnet shows the generic (non-rate-led)
    // headline until PostHog supplies one.
    payload: {
      rate: {
        preprod: { min: 2, max: 4 },
        preview: { min: 2, max: 4 },
      },
    },
  },
];

export default defaultFeatureFlags;
