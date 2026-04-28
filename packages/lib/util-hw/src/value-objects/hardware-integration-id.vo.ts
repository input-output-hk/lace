import type { Tagged } from 'type-fest';

/**
 * Links a hardware onboarding UI option ({@link HardwareOnboardingOption})
 * with its service-worker operations ({@link HwWalletConnector}).
 */
export type HardwareIntegrationId = Tagged<string, 'HardwareIntegrationId'>;
export const HardwareIntegrationId = (value: string): HardwareIntegrationId =>
  value as HardwareIntegrationId;
