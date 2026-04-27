import { NotificationDetailsPageTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useNotificationDetails } from './useNotificationDetails';

import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';

export const NotificationDetailsPage = ({
  navigation,
  route: { params },
}: StackScreenProps<StackRoutes.NotificationDetails>) => {
  const { notificationId } = params ?? {};
  const { notificationItemParams } = useNotificationDetails({
    navigation,
    notificationId,
  });

  return <NotificationDetailsPageTemplate {...notificationItemParams} />;
};

export default NotificationDetailsPage;
