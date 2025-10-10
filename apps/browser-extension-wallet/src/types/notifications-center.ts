import { Observable } from 'rxjs';
import { RemoteApiProperties, RemoteApiPropertyType } from '@cardano-sdk/web-extension';

export interface NotificationsTopic {
  id: string;
  name: string;
  subscribed?: boolean;
}

export interface LaceMessage {
  body: string;
  chain: string;
  format: string;
  id: string;
  publisher: string;
  title: string;
  topicId: NotificationsTopic['id'];
}

export interface LaceNotification {
  message: LaceMessage;
  read?: boolean;
}

export interface LaceNotificationWithTopicName extends LaceNotification {
  topicName: string;
}

export interface NotificationsCenterProperties {
  notifications: {
    markAsRead: (id?: string) => Promise<void>; // markAsRead() marks all as read
    notifications$: Observable<LaceNotification[]>;
    remove: (id: string) => Promise<void>;
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
  topics: {
    topics$: RemoteApiPropertyType.HotObservable,
    subscribe: RemoteApiPropertyType.MethodReturningPromise,
    unsubscribe: RemoteApiPropertyType.MethodReturningPromise
  }
};
