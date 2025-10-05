/* eslint-disable unicorn/numeric-separators-style */
/* eslint-disable no-magic-numbers */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NotificationListItemProps, LaceNotification } from './NotificationListItem';
import { v4 as uuidv4 } from 'uuid';

const notificationTemplates: LaceNotification[] = [
  {
    message: {
      id: '1',
      topic: 'transaction',
      title: 'Transaction Confirmed',
      body: 'Your transaction of 150 ADA has been successfully confirmed and added to the blockchain.',
      format: 'json'
    },
    read: false
  },
  {
    message: {
      id: '2',
      topic: 'staking',
      title: 'Staking Rewards Received',
      body: 'You have received 2.5 ADA in staking rewards from your delegation to Pool ABC123.',
      format: 'json'
    },
    read: false
  },
  {
    message: {
      id: '3',
      topic: 'delegation',
      title: 'Delegation Updated',
      body: 'Your stake has been successfully delegated to a new stake pool. Changes will take effect in the next epoch.',
      format: 'json'
    },
    read: true
  },
  {
    message: {
      id: '4',
      topic: 'reward',
      title: 'Epoch Rewards',
      body: 'Epoch 425 rewards have been distributed. You earned 1.8 ADA from staking.',
      format: 'json'
    },
    read: true
  },
  {
    message: {
      id: '5',
      topic: 'warning',
      title: 'Low Balance Warning',
      body: 'Your wallet balance is running low. Consider adding more funds for transaction fees.',
      format: 'json'
    },
    read: false
  },
  {
    message: {
      id: '6',
      topic: 'info',
      title: 'Wallet Update Available',
      body: 'A new version of Lace wallet is available with improved security features.',
      format: 'json'
    },
    read: true
  },
  {
    message: {
      id: '7',
      topic: 'success',
      title: 'Backup Created',
      body: 'Your wallet backup has been successfully created and saved to your device.',
      format: 'json'
    },
    read: true
  },
  {
    message: {
      id: '8',
      topic: 'error',
      title: 'Transaction Failed',
      body: 'Your transaction could not be processed due to insufficient funds. Please check your balance.',
      format: 'json'
    },
    read: false
  },
  {
    message: {
      id: '9',
      topic: 'transaction',
      title: 'NFT Received',
      body: 'You have received a new NFT: "Cardano Art Collection #42" in your wallet.',
      format: 'json'
    },
    read: false
  },
  {
    message: {
      id: '10',
      topic: 'staking',
      title: 'Pool Performance Update',
      body: 'Your stake pool has performed well this epoch with 99.8% uptime.',
      format: 'json'
    },
    read: true
  }
];

export const useNotifications = (): {
  notifications: NotificationListItemProps[];
  loadMore: () => void;
  setMarkAllAsRead: () => void;
  removeNotification: (id: string) => void;
  unreadCount: number;
  isLoading: boolean;
} => {
  const [notifications, setNotifications] = useState<NotificationListItemProps[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const setMarkAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, isRead: true } : notification))
    );
  }, []);

  const setMarkAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const getNotificatins = useCallback(
    (list: LaceNotification[]) =>
      list.map((template) => {
        const id = `notification-${uuidv4()}`;
        return {
          id,
          title: template.message.title,
          publisher: template.message.topic,
          isRead: template.read,
          onClick: () => {
            // eslint-disable-next-line no-console
            console.log(`Clicked notification ${id}`);
          },
          onMarkAsRead: () => {
            setMarkAsRead(id);
          }
        };
      }),
    [setMarkAsRead]
  );

  const loadMore = useCallback(() => {
    if (isLoading) return;
    setIsLoading(true);
    const API_DELAY_MS = 1000;
    setTimeout(() => {
      setNotifications((prev) => [...(prev ?? []), ...getNotificatins(notificationTemplates)]);
      setIsLoading(false);
    }, API_DELAY_MS);
  }, [getNotificatins, isLoading]);

  useEffect(() => {
    setNotifications(getNotificatins(notificationTemplates));
  }, [getNotificatins]);

  const unreadCount = useMemo(
    () => notifications?.filter((notification) => !notification.isRead).length ?? 0,
    [notifications]
  );

  return { notifications, loadMore, setMarkAllAsRead, removeNotification, unreadCount, isLoading };
};
