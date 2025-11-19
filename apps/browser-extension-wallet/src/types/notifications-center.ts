import { Observable } from 'rxjs';
import { RemoteApiProperties, RemoteApiPropertyType } from '@cardano-sdk/web-extension';

export interface NotificationsTopic {
  id: string;
  name: string;
  publisher: string;
  isSubscribed?: boolean;
}

export interface LaceMessage {
  body: string;
  chain?: string;
  format?: string;
  id: string;
  title: string;
  topicId: NotificationsTopic['id'];
}

export interface LaceNotification {
  message: LaceMessage;
  read?: boolean;
}

export interface LaceNotificationWithTopicName extends LaceNotification {
  topicName: string;
  publisher: string;
}

export interface NotificationsCenterProperties {
  notifications: {
    markAsRead: (id?: string) => Promise<void>; // markAsRead() marks all as read
    notifications$: Observable<LaceNotification[]>;
    remove: (id: string) => Promise<void>;
  };
  test: {
    add: (notification: LaceNotification) => Promise<void>;
    init: (data: { notifications: LaceNotification[]; topics: NotificationsTopic[] }) => Promise<void>;
  };
  topics: {
    subscribe: (topicId: NotificationsTopic['id']) => Promise<void>;
    topics$: Observable<NotificationsTopic[]>;
    unsubscribe: (topicId: NotificationsTopic['id']) => Promise<void>;
  };
}

export const notificationsCenterProperties: RemoteApiProperties<NotificationsCenterProperties> = {
  notifications: {
    markAsRead: RemoteApiPropertyType.MethodReturningPromise,
    notifications$: RemoteApiPropertyType.HotObservable,
    remove: RemoteApiPropertyType.MethodReturningPromise
  },
  test: {
    add: RemoteApiPropertyType.MethodReturningPromise,
    init: RemoteApiPropertyType.MethodReturningPromise
  },
  topics: {
    subscribe: RemoteApiPropertyType.MethodReturningPromise,
    topics$: RemoteApiPropertyType.HotObservable,
    unsubscribe: RemoteApiPropertyType.MethodReturningPromise
  }
};
