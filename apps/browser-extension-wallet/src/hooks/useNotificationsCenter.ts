import { useMemo, useCallback } from 'react';
import { runtime } from 'webextension-polyfill';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { consumeRemoteApi } from '@cardano-sdk/web-extension';
import { logger, useObservable, PostHogAction } from '@lace/common';
import {
  LaceNotificationWithTopicName,
  notificationsCenterProperties,
  NotificationsCenterProperties,
  NotificationsTopic
} from '@src/types/notifications-center';
import { useAnalyticsContext } from '@providers';

const notificationsCenterApi = consumeRemoteApi<NotificationsCenterProperties>(
  {
    baseChannel: 'notifications-center',
    properties: notificationsCenterProperties
  },
  { logger, runtime }
);

(globalThis as Record<string, unknown>).notificationsCenterApi = notificationsCenterApi;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useNotificationsCenter = () => {
  const { markAsRead, notifications$, remove } = notificationsCenterApi.notifications;
  const { topics$, subscribe: originalSubscribe, unsubscribe: originalUnsubscribe } = notificationsCenterApi.topics;
  const analytics = useAnalyticsContext();

  const notificationsWithTopics$ = useMemo(
    () =>
      combineLatest([notifications$, topics$]).pipe(
        map(([notifications, topics]) =>
          notifications.map(({ message, ...rest }): LaceNotificationWithTopicName => {
            const topic = topics.find(({ id }) => id === message.topicId);
            const topicName = topic?.name || message.topicId;
            const publisher = topic?.publisher || topicName;
            return { ...rest, message, topicName, publisher };
          })
        )
      ),
    [notifications$, topics$]
  );

  const notifications = useObservable<LaceNotificationWithTopicName[]>(notificationsWithTopics$);
  const topics = useObservable<NotificationsTopic[]>(topics$);

  const unreadNotifications = useMemo(
    () => notifications?.reduce((unreadCounter, { read }) => unreadCounter + (read ? 0 : 1), 0) ?? 0,
    [notifications]
  );

  const subscribe = useCallback(
    async (topicId: NotificationsTopic['id']) => {
      // Calculate current subscribed topics before the change
      const currentSubscribedTopicIds = topics?.filter((topic) => topic.isSubscribed).map((topic) => topic.id) || [];

      await originalSubscribe(topicId);

      // Add the newly subscribed topic if not already in the list
      const updatedSubscribedTopics = currentSubscribedTopicIds.includes(topicId)
        ? currentSubscribedTopicIds
        : [...currentSubscribedTopicIds, topicId];

      await analytics.sendEventToPostHog(PostHogAction.NotificationsSubscribe, {
        // eslint-disable-next-line camelcase
        topic_id: topicId,
        // eslint-disable-next-line camelcase
        $set: { subscribed_topics: updatedSubscribedTopics }
      });
    },
    [originalSubscribe, topics, analytics]
  );

  const unsubscribe = useCallback(
    async (topicId: NotificationsTopic['id']) => {
      // Calculate current subscribed topics before the change
      const currentSubscribedTopicIds = topics?.filter((topic) => topic.isSubscribed).map((topic) => topic.id) || [];

      await originalUnsubscribe(topicId);

      // Remove the unsubscribed topic
      const updatedSubscribedTopics = currentSubscribedTopicIds.filter((id) => id !== topicId);

      await analytics.sendEventToPostHog(PostHogAction.NotificationsUnsubscribe, {
        // eslint-disable-next-line camelcase
        topic_id: topicId,
        // eslint-disable-next-line camelcase
        $set: { subscribed_topics: updatedSubscribedTopics }
      });
    },
    [originalUnsubscribe, topics, analytics]
  );

  return {
    notifications,
    unreadNotifications,
    topics,
    subscribe,
    unsubscribe,
    markAsRead,
    remove
  };
};
