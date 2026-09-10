import type { VaultCapabilities } from '@lace-contract/vault';

/**
 * Which vault capability each account-settings entry needs before the shared
 * account-details screen offers it. An entry absent from this map is always
 * offered — it launches nothing the vault arm has to serve.
 *
 * `customize-account` renames an account, which the shell-host arm serves only
 * when the host advertises its account-rename manager view — a host predating it
 * would answer the request with the plain wallet list (ADR 52).
 */
const ACCOUNT_SETTING_CAPABILITY: Readonly<
  Record<string, keyof VaultCapabilities>
> = {
  'customize-account': 'renameAccount',
};

/**
 * Whether the active vault arm has claimed a ceremony. `undefined` capabilities
 * mean the addon promise has not resolved, which reads as NOT available: the
 * entry appears when the promise lands rather than flashing an entry the arm
 * cannot serve (ADR 52).
 */
export const isVaultCapabilityEnabled = (
  capabilities: VaultCapabilities | undefined,
  capability: keyof VaultCapabilities,
): boolean => capabilities?.[capability] === true;

/** Whether an account-settings entry may be offered by the active vault arm. */
export const isAccountSettingAvailable = (
  settingId: string,
  capabilities: VaultCapabilities | undefined,
): boolean => {
  const capability = ACCOUNT_SETTING_CAPABILITY[settingId];
  return (
    capability === undefined ||
    isVaultCapabilityEnabled(capabilities, capability)
  );
};
