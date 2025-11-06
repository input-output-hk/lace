import { LaceMessage, LaceNotification, NotificationsTopic } from '@src/types/notifications-center';
import PubNub from 'pubnub';
import { ReplaySubject } from 'rxjs';

const SUBSCRIBE_KEY = process.env.PUBNUB_SUBSCRIBE_KEY;
const USER_ID = process.env.PUBNUB_USER_ID;

export class NotificationsService {
  private pubnub: PubNub;
  private notifications: LaceNotification[] = [];
  private topics: (NotificationsTopic & { subscription?: PubNub.Subscription })[] = [];

  topics$ = new ReplaySubject<NotificationsTopic[]>(1);
  notifications$ = new ReplaySubject<LaceNotification[]>(1);

  constructor() {
    this.pubnub = new PubNub({
      subscribeKey: SUBSCRIBE_KEY,
      userId: USER_ID
    });

    this.pubnub.addListener({
      message: (message) => {
        // eslint-disable-next-line no-console
        console.log('[DEBUG] message', message);
        const { title, body, chain, id } = message.message as unknown as LaceMessage;
        this.notifications = [
          {
            message: {
              title,
              body,
              chain,
              format: 'plain',
              id,
              publisher: 'Midnight Foundation',
              topicId: message.channel
            },
            read: false
          },
          ...this.notifications
        ];
        this.emitNotifications();
      }
    });

    // TODO: get topics every 5 minutes
    this.fetchTopics();
  }

  private async fetchTopics(): Promise<void> {
    const response = await this.pubnub.objects.getAllChannelMetadata({
      include: {
        totalCount: true
      }
    });

    const newTopics = response.data.map((item) => ({
      id: item.id,
      name: item.name,
      subscribed: this.topics.find((t) => t.id === item.id)?.subscribed ?? false
    }));

    this.topics = newTopics;
    this.emitTopics();
  }

  subscribe(topicId: NotificationsTopic['id']): void {
    const subscription = this.pubnub.channel(topicId).subscription();
    subscription.subscribe();
    this.topics = this.topics.map((t) => (t.id === topicId ? { ...t, subscribed: true, subscription } : t));
    this.emitTopics();
  }

  unsubscribe(topicId: NotificationsTopic['id']): void {
    const topic = this.topics.find((t) => t.id === topicId);
    if (topic) {
      topic.subscription?.unsubscribe();
      topic.subscription = undefined;
      topic.subscribed = false;
    }
    this.emitTopics();
  }

  markAsRead(id?: string): void {
    for (const notification of this.notifications) if (notification.message.id === id || !id) notification.read = true;

    this.emitNotifications();
  }

  remove(id: string): void {
    this.notifications = this.notifications.filter((notification) => notification.message.id !== id);

    this.emitNotifications();
  }

  private emitNotifications(): void {
    this.notifications$.next(this.notifications);
  }

  private emitTopics(): void {
    this.topics$.next(this.topics.map((t) => ({ id: t.id, name: t.name, subscribed: t.subscribed })));
  }
}
