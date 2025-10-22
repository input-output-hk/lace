export interface NotificationDetailsContent {
  topic: string;
  title: string;
  text: string;
  publisher: string;
}

// TODO: update this data when the notifications are updated, it should be synced with https://input-output.atlassian.net/browse/LW-13598

const glacierDropNotification: NotificationDetailsContent = {
  topic: 'Topic One',
  title: 'The Glacier Drop phase 2 is live',
  publisher: 'Midnight',
  text: 'The Glacier Drop phase 2 is live'
};

const newVersionNotification: NotificationDetailsContent = {
  topic: 'Topic Two',
  title: 'The new node version XYZ is out',
  publisher: 'Midnight',
  text: 'The new node version XYZ is out'
};

const governanceNotification: NotificationDetailsContent = {
  topic: 'Topic One',
  title: 'The governance council has opened voting for governance action number 26',
  publisher: 'Governance',
  text: 'The governance council has opened voting for governance action number 26. NIGHT holders are welcome to cast their votes until Aug-31 via the portal at https://governance.midnight.network'
};

export const getNotificationDetailsByTitle = (title: string): NotificationDetailsContent => {
  const expectedNotifications = [glacierDropNotification, newVersionNotification, governanceNotification];
  for (const notification of expectedNotifications) {
    if (notification.title === title) {
      return notification;
    }
  }
  throw new Error(`Notification with title "${title}" not found`);
};
