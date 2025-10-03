import { Observable } from 'rxjs';
import { RemoteApiProperties, RemoteApiPropertyType } from '@cardano-sdk/web-extension';

export interface LaceMessage {
  body: string;
  chain: string;
  format: string;
  id: string;
  publisher: string;
  title: string;
  topic: string;
}

export interface LaceNotification {
  message: LaceMessage;
  read?: boolean;
}

export interface NotificationsTopic {
  name: string;
  subscribed?: boolean;
}

export interface NotificationsCenterProperties {
  notifications: {
    markAsRead: (id?: string) => Promise<void>; // markAsRead() marks all as read
    notifications$: Observable<LaceNotification[]>;
    remove: (id: string) => Promise<void>;
  };
  topics: {
    topics$: Observable<NotificationsTopic[]>;
    subscribe: (topic: string) => Promise<void>;
    unsubscribe: (topic: string) => Promise<void>;
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
