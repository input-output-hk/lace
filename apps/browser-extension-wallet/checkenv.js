require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: './.env.defaults'
});

const env = [
  'ADA_PRICE_POLLING_IN_SEC',
  'AVAILABLE_CHAINS',
  'DEFAULT_CHAIN',
  'DROP_CONSOLE_IN_PRODUCTION',
  'SAVED_PRICE_DURATION_IN_MINUTES',
  'TOKEN_PRICE_POLLING_IN_SEC',
  'WALLET_INTERVAL_IN_SEC',
  'WALLET_NAME',
  'WALLET_SYNC_TIMEOUT_IN_SEC'
];

const flags = [
  'USE_ADA_HANDLE',
  'USE_COMBINED_PASSWORD_NAME_STEP_COMPONENT',
  'USE_DAPP_CONNECTOR',
  'USE_DATA_CHECK',
  'USE_DIFFERENT_MNEMONIC_LENGTHS',
  'USE_HIDE_MY_BALANCE',
  'USE_MATOMO_ANALYTICS_FOR_OPTED_OUT',
  'USE_MULTI_CURRENCY',
  'USE_MULTI_DELEGATION_STAKING_ACTIVITY',
  'USE_MULTI_DELEGATION_STAKING_LEDGER',
  'USE_MULTI_DELEGATION_STAKING_TREZOR',
  'USE_MULTI_WALLET',
  'USE_NFT_FOLDERS',
  'USE_PASSWORD_VERIFICATION',
  'USE_POSTHOG_ANALYTICS_FOR_OPTED_OUT',
  'USE_POSTHOG_ANALYTICS',
  'USE_TOKEN_PRICING',
  'USE_TREZOR_HW'
];

const inAppUrls = [
  'CATALYST_APP_STORE_URL',
  'CATALYST_GOOGLE_PLAY_URL',
  'COOKIE_POLICY_URL',
  'DISCORD_URL',
  'EMAIL_ADDRESS',
  'FAQ_URL',
  'GITHUB_URL',
  'HELP_URL',
  'MEDIUM_URL',
  'PRIVACY_POLICY_URL',
  'TERMS_OF_USE_URL',
  'TWITTER_URL',
  'WEBSITE_URL',
  'YOUTUBE_RECOVERY_PHRASE_VIDEO_URL',
  'YOUTUBE_URL'
];

const urls = [
  'ADA_HANDLE_URL_MAINNET',
  'ADA_HANDLE_URL_PREPROD',
  'ADA_HANDLE_URL_PREVIEW',
  'CARDANO_SERVICES_URL_MAINNET',
  'CARDANO_SERVICES_URL_PREPROD',
  'CARDANO_SERVICES_URL_PREVIEW',
  'CEXPLORER_URL_MAINNET',
  'CEXPLORER_URL_PREPROD',
  'CEXPLORER_URL_PREVIEW',
  'CEXPLORER_URL_SANCHONET',
  'LACE_EXTENSION_KEY',
  'LACE_EXTENSION_UNINSTALL_REDIRECT_URL',
  'MATOMO_API_ENDPOINT',
  'POSTHOG_DEV_TOKEN_MAINNET',
  'POSTHOG_DEV_TOKEN_PREPROD',
  'POSTHOG_DEV_TOKEN_PREVIEW',
  'PRODUCTION_MODE_TRACKING',
  'PUBLIC_POSTHOG_HOST'
];

const checkEnv = (env, flags, inAppUrls, urls) => {
  const missing = [];
  const envs = [...env, ...flags, ...inAppUrls, ...urls];

  for (let i = 0; i < envs.length; i++) {
    if (!process.env[envs[i]]) {
      missing.push(envs[i]);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  console.info('Environment variables are set correctly.');
};

checkEnv(env, flags, inAppUrls, urls);
