import type { TranslationKey } from '@lace-contract/i18n';

/**
 * Thrown by the mobile request bridge when the user dismisses the discovery
 * sheet. Surfaces as `device-picker-rejected` via `classifyHardwareError`.
 */
export class HwConnectionCancelledError extends Error {
  public constructor() {
    super('Hardware wallet connection cancelled');
    this.name = 'HwConnectionCancelledError';
  }
}

/**
 * Thrown by the mobile request bridge when device discovery errors out
 * (e.g. BLE permissions denied). Carries the translation key so the
 * onboarding/account-management UIs can render a meaningful subtitle.
 */
export class HwSearchFailedError extends Error {
  public readonly translationKey: TranslationKey;
  public constructor(translationKey: TranslationKey) {
    super(`Hardware wallet search failed: ${translationKey}`);
    this.name = 'HwSearchFailedError';
    this.translationKey = translationKey;
  }
}
