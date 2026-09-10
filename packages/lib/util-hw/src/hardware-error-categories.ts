const HARDWARE_ERROR_CATEGORIES = [
  'already-added',
  'app-not-open',
  'cancelled',
  'device-disconnected',
  'device-locked',
  'device-picker-rejected',
  'generic',
  'local-network-blocked',
  'multisig-not-supported',
  'not-supported',
  'trezor-suite-required',
  'unauthorized',
  'version-unsupported',
  'wrong-device',
  'wrong-network-app',
  'wrong-script-type',
] as const;

export type HardwareErrorCategory = (typeof HARDWARE_ERROR_CATEGORIES)[number];

const hardwareErrorCategorySet: ReadonlySet<string> = new Set(
  HARDWARE_ERROR_CATEGORIES,
);

/**
 * Narrows values from unions that widen {@link HardwareErrorCategory} with
 * non-device reasons (e.g. onboarding's CreateWalletErrorReason), so callers
 * can route device failures to the hw-error copy catalogue.
 */
export const isHardwareErrorCategory = (
  value: string | undefined,
): value is HardwareErrorCategory =>
  value !== undefined && hardwareErrorCategorySet.has(value);
