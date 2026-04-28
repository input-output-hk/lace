import { useAnalytics } from '@lace-contract/analytics';
import {
  StackRoutes,
  type TabRoutes,
  type TabScreenProps,
} from '@lace-lib/navigation';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { IconName } from '@lace-lib/ui-toolkit';

export const useNotificationCenter = ({
  navigation,
}: {
  navigation: TabScreenProps<TabRoutes.NotificationCenter>['navigation'];
}) => {
  const { trackEvent } = useAnalytics();
  const notificationsBySubscribedTopics = useLaceSelector(
    'notificationCenter.selectNotificationsBySubscribedTopics',
  );
  const subscriptionTopics = useLaceSelector(
    'notificationCenter.selectAllTopics',
  );
  const markAllAsRead = useDispatchLaceAction(
    'notificationCenter.markAllNotificationsAsRead',
  );
  const subscribeToTopic = useDispatchLaceAction(
    'notificationCenter.subscribeToTopic',
  );
  const unsubscribeFromTopic = useDispatchLaceAction(
    'notificationCenter.unsubscribeFromTopic',
  );
  const markNotificationAsRead = useDispatchLaceAction(
    'notificationCenter.markNotificationAsRead',
  );

  const laceNotifications = useMemo(() => {
    return notificationsBySubscribedTopics.map(notification => ({
      id: notification.message.id,
      headerIcon: 'Notification' as IconName,
      headerTitle: notification.message.title,
      bodyTitle: notification.message.body,
      isRead: notification.read ?? false,
    }));
  }, [notificationsBySubscribedTopics]);

  const { t } = useTranslation();
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleSubscriptionChange = (key: string) => {
    trackEvent('notification | subscription | press');
    if (subscriptionTopics.find(t => t.id === key)?.subscribed) {
      unsubscribeFromTopic({ topicId: key });
    } else {
      subscribeToTopic({ topicId: key });
    }
  };

  const headerTtitle = t('v2.notifications.page.title');

  const handleMarkNotificationAsRead = (id: string) => {
    markNotificationAsRead({ id });
  };

  const onNotificationPress = useCallback(
    (id: string) => {
      trackEvent('notification | notification | press');
      handleMarkNotificationAsRead(id);
      navigation.navigate(StackRoutes.NotificationDetails, {
        notificationId: id,
      });
    },
    [navigation, handleMarkNotificationAsRead, trackEvent],
  );

  return {
    title: headerTtitle,
    notifications: laceNotifications,
    subscriptionTopics,
    onMarkAllAsRead: handleMarkAllAsRead,
    onSubscriptionChange: handleSubscriptionChange,
    onNotificationPress,
  };
};
