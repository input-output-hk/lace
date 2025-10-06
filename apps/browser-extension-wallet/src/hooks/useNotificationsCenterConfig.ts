import { ExperimentName } from '@lib/scripts/types/feature-flags';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';

export interface NotificationsCenterConfig {
  isNotificationsCenterEnabled: boolean;
}

export const useNotificationsCenterConfig = (): NotificationsCenterConfig => {
  const posthog = usePostHogClientContext();

  return { isNotificationsCenterEnabled: posthog?.isFeatureFlagEnabled(ExperimentName.NOTIFICATIONS_CENTER) ?? false };
};
