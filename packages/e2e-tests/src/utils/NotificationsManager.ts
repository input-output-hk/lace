import { browser } from '@wdio/globals';
import { switchToWindowWithLace } from './window';
import { readFromFile } from './fileUtils';

export interface NotificationMessage {
  id: string;
  title: string;
  body: string;
  publisher: string;
  chain: string;
  format: string;
  topicId: string;
}

export interface Notification {
  message: NotificationMessage;
  read?: boolean;
}

export interface Topic {
  id: string;
  name: string;
  isSubscribed?: boolean;
}

export interface NotificationCenterState {
  notifications: Notification[];
  topics: Topic[];
}

export class NotificationsManager {
  private static notificationCenterScript: string | undefined = undefined;

  /**
   * Loads the notifications-center.js script content
   */
  private static loadScript(): string {
    if (!this.notificationCenterScript) {
      const scriptPath = '../../tools/notifications-center.js';
      this.notificationCenterScript = readFromFile(import.meta.dirname, scriptPath);
    }
    return this.notificationCenterScript;
  }

  /**
   * Injects the notifications-center.js script into the browser
   */
  static async inject(): Promise<void> {
    try {
      await switchToWindowWithLace(0);
      const script = this.loadScript();
      await browser.execute(script);
    } catch (error) {
      throw new Error(`Failed to inject notifications script: ${(error as Error).message}`);
    }
  }

  /**
   * Initializes the notification center with topics and notifications
   * @param topics - Array of topics
   * @param notifications - Array of notifications
   * @returns Result message
   */
  static async init(topics: Topic[], notifications: Notification[]): Promise<string> {
    await switchToWindowWithLace(0);

    const topicsJson = JSON.stringify(topics);
    const notificationsJson = JSON.stringify(notifications);

    const result = await browser.execute(
      `
      return (async () => {
        const topics = ${topicsJson};
        const notifications = ${notificationsJson};
        return await e2eNotificationsCenter.init(topics, notifications);
      })()
      `
    );

    return result as string;
  }

  /**
   * Adds a notification to the notifications center
   * @param notification - The notification to add
   */
  static async add(notification: Notification): Promise<void> {
    await switchToWindowWithLace(0);

    const notificationJson = JSON.stringify(notification);

    await browser.execute(
      `
      return (async () => {
        const notification = ${notificationJson};
        return await e2eNotificationsCenter.add(notification);
      })()
      `
    );
  }

  /**
   * Dumps the current state of notifications and topics
   * @returns Current state with notifications and topics
   */
  static async dump(): Promise<NotificationCenterState> {
    await switchToWindowWithLace(0);

    const state = await browser.execute(
      `
      return (async () => {
        return await e2eNotificationsCenter.dump();
      })()
      `
    );

    return state as NotificationCenterState;
  }

  /**
   * Initializes the notification center by injecting the script and setting up data
   * This is a convenience method that combines inject and init
   * @param topics - Array of topics
   * @param notifications - Array of notifications
   * @returns Result message
   */
  static async injectAndInit(topics: Topic[], notifications: Notification[]): Promise<string> {
    await this.inject();
    return await this.init(topics, notifications);
  }
}
