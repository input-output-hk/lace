import { runtime } from 'webextension-polyfill';
import { of } from 'rxjs';
import { exposeApi } from '@cardano-sdk/web-extension';

import {
  NotificationsCenterProperties,
  notificationsCenterProperties,
  NotificationsTopic
} from '@src/types/notifications-center';
import { logger } from '@lace/common';
import { NotificationsService } from './notifications-service';

const exposeNotificationsCenterAPI = (): void => {
  const notificationsService = new NotificationsService();
  exposeApi<NotificationsCenterProperties>(
    {
      api$: of({
        notifications: {
          markAsRead: async (id?: string): Promise<void> => notificationsService.markAsRead(id),
          notifications$: notificationsService.notifications$,
          remove: async (id: string): Promise<void> => notificationsService.remove(id)
        },
        topics: {
          topics$: notificationsService.topics$,
          subscribe: async (topic: Pick<NotificationsTopic, 'id'>): Promise<void> =>
            notificationsService.subscribe(topic),
          unsubscribe: async (topic: Pick<NotificationsTopic, 'id'>): Promise<void> =>
            notificationsService.unsubscribe(topic)
        }
      }),
      baseChannel: 'notifications-center',
      properties: notificationsCenterProperties
    },
    { logger, runtime }
  );
};

if (!(globalThis as unknown as { LMP_BUNDLE: boolean }).LMP_BUNDLE) exposeNotificationsCenterAPI();
