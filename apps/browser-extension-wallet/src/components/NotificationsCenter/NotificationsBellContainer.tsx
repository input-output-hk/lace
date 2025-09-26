import React, { useState } from 'react';
import { NotificationsBell } from './NotificationsBell';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { ExperimentName } from '@lib/scripts/types/feature-flags';
export interface NotificationsCenterContainerProps {
  popupView?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const NotificationsBellContainer = ({ popupView }: NotificationsCenterContainerProps): React.ReactElement => {
  const posthog = usePostHogClientContext();

  // TODO Connect with notifications center
  const [notificationsCount, setNotificationsCount] = useState(0);

  // TODO Connect with notifications center
  const handleClick = () => {
    // eslint-disable-next-line no-magic-numbers
    setNotificationsCount(notificationsCount === 11 ? 0 : notificationsCount + 1);
  };

  return (
    posthog?.isFeatureFlagEnabled(ExperimentName.NOTIFICATIONS_CENTER) && (
      <NotificationsBell notificationsCount={notificationsCount} onClick={handleClick} popupView={popupView} />
    )
  );
};
