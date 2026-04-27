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
