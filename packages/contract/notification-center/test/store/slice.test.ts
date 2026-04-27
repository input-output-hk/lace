import { describe, expect, it } from 'vitest';

import { notificationCenterActions as actions } from '../../src/index';
import { notificationCenterReducers } from '../../src/store/slice';

import type { NotificationsCenterState } from '../../src/store/slice';
import type { LaceNotification } from '../../src/store/types';

const mockNotification: LaceNotification = {
  message: {
    body: 'Transaction confirmed.',
    chain: 'cardano',
    format: 'text',
    id: 'notif-1',
    publisher: 'Test',
    title: 'Test Notification',
    topicId: 'topic-1',
  },
  read: false,
};

describe('notificationCenter slice', () => {
  const initialState: NotificationsCenterState = {
    notifications: [mockNotification],
    topics: [{ id: 'topic-1', name: 'Cardano', subscribed: true }],
  };

  describe('markNotificationAsRead', () => {
    it('marks a notification as read', () => {
      const state = notificationCenterReducers.notificationCenter(
        initialState,
        actions.notificationCenter.markNotificationAsRead({ id: 'notif-1' }),
      );
      expect(state.notifications[0].read).toBe(true);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('marks all notifications as read', () => {
      const state = notificationCenterReducers.notificationCenter(
        initialState,
        actions.notificationCenter.markAllNotificationsAsRead(),
      );
      expect(state.notifications.every(n => n.read)).toBe(true);
    });
  });

  describe('addNotification', () => {
    it('prepends a notification', () => {
      const newNotif: LaceNotification = {
        ...mockNotification,
        message: { ...mockNotification.message, id: 'notif-2' },
      };
      const state = notificationCenterReducers.notificationCenter(
        initialState,
        actions.notificationCenter.addNotification(newNotif),
      );
      expect(state.notifications[0].message.id).toBe('notif-2');
    });
  });

  describe('removeNotification', () => {
    it('removes a notification by id', () => {
      const state = notificationCenterReducers.notificationCenter(
        initialState,
        actions.notificationCenter.removeNotification({ id: 'notif-1' }),
      );
      expect(state.notifications).toHaveLength(0);
    });
  });
});
