import { RemoteApiPropertyType } from '@lace-sdk/extension-messaging';

import type {
  LaceNotification,
  NotificationsTopic,
} from '@lace-contract/notification-center';
import type { RemoteApiProperties } from '@lace-sdk/extension-messaging';
import type { Observable } from 'rxjs';

export type {
  LaceMessage,
  LaceNotification,
  NotificationsTopic,
} from '@lace-contract/notification-center';

export interface NotificationsCenterProperties {
  notifications: {
    markAsRead: (id?: string) => Promise<void>;
    notifications$: Observable<LaceNotification[]>;
    remove: (id: string) => Promise<void>;
  };
  test: {
    add: (notification: LaceNotification) => Promise<void>;
    init: (data: {
      topics: NotificationsTopic[];
      notifications: LaceNotification[];
    }) => Promise<void>;
  };
  topics: {
    subscribe: (topicId: NotificationsTopic['id']) => Promise<void>;
    topics$: Observable<NotificationsTopic[]>;
    unsubscribe: (topicId: NotificationsTopic['id']) => Promise<void>;
  };
}

export const notificationsCenterProperties: RemoteApiProperties<NotificationsCenterProperties> =
  {
    notifications: {
      markAsRead: RemoteApiPropertyType.MethodReturningPromise,
      notifications$: RemoteApiPropertyType.HotObservable,
      remove: RemoteApiPropertyType.MethodReturningPromise,
    },
    test: {
      add: RemoteApiPropertyType.MethodReturningPromise,
      init: RemoteApiPropertyType.MethodReturningPromise,
    },
    topics: {
      subscribe: RemoteApiPropertyType.MethodReturningPromise,
      topics$: RemoteApiPropertyType.HotObservable,
      unsubscribe: RemoteApiPropertyType.MethodReturningPromise,
    },
  };
