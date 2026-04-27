import { FeatureFlagKey } from '@lace-contract/feature';
import { exposeApi, ChannelName } from '@lace-sdk/extension-messaging';
import { firstValueFrom, Observable, of } from 'rxjs';
import { runtime } from 'webextension-polyfill';

import { notificationsCenterProperties } from '../types';

import type { SideEffect } from '..';
import type {
  LaceNotification,
  NotificationsCenterProperties,
  NotificationsTopic,
} from '../types';

export const exposeNotificationsCenterApi: SideEffect = (
  _,
  {
    features: { selectLoadedFeatures$ },
    notificationCenter: { selectAllNotifications$, selectAllTopics$ },
  },
  { logger, actions },
) =>
  new Observable(subscriber => {
    const checkTestAPIEnabled = async () => {
      const { featureFlags } = await firstValueFrom(selectLoadedFeatures$);
      const testAPI = FeatureFlagKey('TEST_API');

      if (featureFlags.every(flag => flag.key !== testAPI)) {
        const message = 'This feature is enabled only for tests';

        logger.error(message);
        throw new Error(message);
      }
    };

    const api: NotificationsCenterProperties = {
      notifications: {
        markAsRead: async (id?: string) => {
          if (id) {
            logger.debug(`Marking notification ${id} as read`);
            subscriber.next(
              actions.notificationCenter.markNotificationAsRead({ id }),
            );
          } else {
            logger.debug(`Marking all notifications as read`);
            subscriber.next(
              actions.notificationCenter.markAllNotificationsAsRead(),
            );
          }
        },
        notifications$: selectAllNotifications$,
        remove: async (id: string) => {
          logger.debug(`Removing notification ${id}`);
          subscriber.next(
            actions.notificationCenter.removeNotification({ id }),
          );
        },
      },
      test: {
        add: async (notification: LaceNotification) => {
          await checkTestAPIEnabled();

          const topics = await firstValueFrom(selectAllTopics$);
          const topic = topics.find(t => t.id === notification.message.topicId);

          if (!topic?.subscribed) return;

          logger.debug('Adding notification', notification);
          subscriber.next(
            actions.notificationCenter.addNotification(notification),
          );
        },
        init: async (data: {
          topics: NotificationsTopic[];
          notifications: LaceNotification[];
        }) => {
          await checkTestAPIEnabled();

          logger.debug('Initializing notifications center', data);
          subscriber.next(actions.notificationCenter.initData(data));
        },
      },
      topics: {
        subscribe: async (topicId: string) => {
          logger.debug(`Subscribing to topic ${topicId}`);
          subscriber.next(
            actions.notificationCenter.subscribeToTopic({ topicId }),
          );
        },
        topics$: selectAllTopics$,
        unsubscribe: async (topicId: string) => {
          logger.debug(`Unsubscribing from topic ${topicId}`);
          subscriber.next(
            actions.notificationCenter.unsubscribeFromTopic({ topicId }),
          );
        },
      },
    };

    const exposed = exposeApi(
      {
        api$: of(api),
        baseChannel: ChannelName('notification-center'),
        properties: notificationsCenterProperties,
      },
      { logger, runtime },
    );

    return () => {
      exposed.shutdown();
    };
  });

export const initializeSideEffects = () => [exposeNotificationsCenterApi];
