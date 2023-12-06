/** Defines an allowed feature flags */
export type FeatureFlag =
  | 'ADA_HANDLE'
  | 'COMBINED_PASSWORD_NAME_STEP_COMPONENT'
  | 'DAPP_CONNECTOR'
  | 'DATA_CHECK'
  | 'DIFFERENT_MNEMONIC_LENGTHS'
  | 'HIDE_MY_BALANCE'
  | 'MATOMO_ANALYTICS_FOR_OPTED_OUT'
  | 'MULTI_CURRENCY'
  | 'MULTI_DELEGATION_STAKING_ACTIVITY'
  | 'MULTI_DELEGATION_STAKING_LEDGER'
  | 'MULTI_DELEGATION_STAKING_TREZOR'
  | 'MULTI_WALLET'
  | 'NFT_FOLDERS'
  | 'PASSWORD_VERIFICATION'
  | 'POSTHOG_ANALYTICS_FOR_OPTED_OUT'
  | 'POSTHOG_ANALYTICS'
  | 'TOKEN_PRICING'
  | 'TREZOR_HW';

/**
 * Checks if a feature is enabled.
 * @param name Defines the feature name.
 *
 * @throws Error in case feature flag is not defined.
 * @returns Boolean value of the feature flag.
 */
export const isFeatureEnabled = (name: FeatureFlag): boolean => {
  if (!process.env[`USE_${name}`]) {
    throw new Error(`'USE_${name}' is not set`);
  }
  return process.env[`USE_${name}`] === 'true';
};
