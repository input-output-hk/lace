import { type TabRoutes, type TabScreenProps } from '@lace-lib/navigation';
import { NotificationsPageTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useNotificationCenter } from './useNotificationCenter';

export const NotificationCenterPage = ({
  navigation,
}: TabScreenProps<TabRoutes.NotificationCenter>) => {
  const {
    title,
    notifications,
    subscriptionTopics,
    onMarkAllAsRead,
    onSubscriptionChange,
    onNotificationPress,
  } = useNotificationCenter({ navigation });

  return (
    <NotificationsPageTemplate
      title={title}
      notifications={notifications}
      subscriptionTopics={subscriptionTopics}
      onMarkAllAsRead={onMarkAllAsRead}
      onSubscriptionChange={onSubscriptionChange}
      onNotificationPress={onNotificationPress}
    />
  );
};

export default NotificationCenterPage;
