import {
  notificationCenterActions,
  notificationCenterReducers,
  notificationCenterSelectors,
} from '@lace-contract/notification-center';
import { beforeEach, describe, expect, it } from 'vitest';

import type { NotificationsCenterState } from '@lace-contract/notification-center';
import type {
  LaceNotification,
  NotificationsTopic,
} from '@lace-contract/notification-center';

const actions = notificationCenterActions.notificationCenter;
const selectors = notificationCenterSelectors.notificationCenter;
const reducer = notificationCenterReducers.notificationCenter;

describe('notifications center slice', () => {
  let state: NotificationsCenterState;
  let mockNotification: LaceNotification;
  let mockTopic: NotificationsTopic;

  const secondNotification: LaceNotification = {
    message: {
      id: 'notification-2',
      title: 'Second Notification',
      body: 'This is a second test notification',
      publisher: 'Test Publisher',
      chain: 'Cardano',
      format: 'text',
      topicId: 'topic-2',
    },
  };

  beforeEach(() => {
    state = {
      notifications: [],
      topics: [],
    };

    mockNotification = {
      message: {
        id: 'notification-1',
        title: 'Test Notification',
        body: 'This is a test notification',
        publisher: 'Test Publisher',
        chain: 'Cardano',
        format: 'text',
        topicId: 'topic-1',
      },
    };

    mockTopic = {
      id: 'topic-1',
      name: 'Test Topic',
    };
  });

  describe('reducers', () => {
    describe('addNotification', () => {
      it('should add a new notification to the state', () => {
        const action = actions.addNotification(mockNotification);
        const newState = reducer(state, action);

        expect(newState.notifications).toHaveLength(1);
        expect(newState.notifications[0]).toEqual(mockNotification);
      });

      it('should add multiple notifications to the state', () => {
        const action1 = actions.addNotification(mockNotification);
        const action2 = actions.addNotification(secondNotification);

        const state1 = reducer(state, action1);
        const state2 = reducer(state1, action2);

        expect(state2.notifications).toHaveLength(2);
        expect(state2.notifications[0]).toEqual(secondNotification);
        expect(state2.notifications[1]).toEqual(mockNotification);
      });
    });

    describe('markNotificationAsRead', () => {
      beforeEach(() => {
        state.notifications = [mockNotification];
      });

      it('should mark a notification as read when it exists', () => {
        const action = actions.markNotificationAsRead({ id: 'notification-1' });
        const newState = reducer(state, action);

        expect(newState.notifications[0].read).toBe(true);
      });

      it('should not modify notifications when marking non-existent notification as read', () => {
        const action = actions.markNotificationAsRead({ id: 'non-existent' });
        const newState = reducer(state, action);

        expect(newState.notifications[0].read).toBeFalsy();
        expect(newState.notifications).toEqual(state.notifications);
      });

      it('should not modify other notifications when marking one as read', () => {
        state.notifications = [mockNotification, secondNotification];

        const action = actions.markNotificationAsRead({ id: 'notification-1' });
        const newState = reducer(state, action);

        expect(newState.notifications[0].read).toBe(true);
        expect(newState.notifications[1].read).toBeUndefined();
      });

      it('should mark all subscribed notifications as read', () => {
        state.notifications = [mockNotification, secondNotification];
        state.topics = [
          { id: 'topic-1', name: 'Topic 1', subscribed: true },
          { id: 'topic-2', name: 'Topic 2', subscribed: true },
        ];

        const action = actions.markAllNotificationsAsRead();
        const newState = reducer(state, action);

        expect(newState.notifications[0].read).toBe(true);
        expect(newState.notifications[1].read).toBe(true);
      });

      it('should only mark notifications from subscribed topics as read', () => {
        state.notifications = [mockNotification, secondNotification];
        state.topics = [
          { id: 'topic-1', name: 'Topic 1', subscribed: true },
          { id: 'topic-2', name: 'Topic 2' },
        ];

        const action = actions.markAllNotificationsAsRead();
        const newState = reducer(state, action);

        expect(newState.notifications[0].read).toBe(true);
        expect(newState.notifications[1].read).toBeUndefined();
      });
    });

    describe('removeNotification', () => {
      beforeEach(() => {
        state.notifications = [mockNotification];
      });

      it('should remove a notification when it exists', () => {
        const action = actions.removeNotification({ id: 'notification-1' });
        const newState = reducer(state, action);

        expect(newState.notifications).toHaveLength(0);
      });

      it('should not modify notifications when removing non-existent notification', () => {
        const action = actions.removeNotification({ id: 'non-existent' });
        const newState = reducer(state, action);

        expect(newState.notifications).toHaveLength(1);
        expect(newState.notifications).toEqual(state.notifications);
      });

      it('should only remove the specified notification', () => {
        state.notifications = [mockNotification, secondNotification];

        const action = actions.removeNotification({ id: 'notification-1' });
        const newState = reducer(state, action);

        expect(newState.notifications).toHaveLength(1);
        expect(newState.notifications[0]).toEqual(secondNotification);
      });
    });

    describe('subscribeToTopic', () => {
      beforeEach(() => {
        state.topics = [mockTopic];
      });

      it('should mark a topic as subscribed when it exists', () => {
        const action = actions.subscribeToTopic({ topicId: 'topic-1' });
        const newState = reducer(state, action);

        expect(newState.topics[0].subscribed).toBe(true);
      });

      it('should not modify topics when subscribing to non-existent topic', () => {
        const action = actions.subscribeToTopic({ topicId: 'non-existent' });
        const newState = reducer(state, action);

        expect(newState.topics[0].subscribed).toBeFalsy();
        expect(newState.topics).toEqual(state.topics);
      });

      it('should not modify other topics when subscribing to one', () => {
        const secondTopic: NotificationsTopic = {
          id: 'topic-2',
          name: 'Second Topic',
          subscribed: false,
        };

        state.topics = [mockTopic, secondTopic];

        const action = actions.subscribeToTopic({ topicId: 'topic-1' });
        const newState = reducer(state, action);

        expect(newState.topics[0].subscribed).toBe(true);
        expect(newState.topics[1].subscribed).toBe(false);
      });
    });

    describe('unsubscribeFromTopic', () => {
      beforeEach(() => {
        state.topics = [{ ...mockTopic, subscribed: true }];
      });

      it('should remove subscription from a topic when it exists', () => {
        const action = actions.unsubscribeFromTopic({ topicId: 'topic-1' });
        const newState = reducer(state, action);

        expect(newState.topics[0].subscribed).toBeUndefined();
      });

      it('should not modify topics when unsubscribing from non-existent topic', () => {
        const action = actions.unsubscribeFromTopic({
          topicId: 'non-existent',
        });
        const newState = reducer(state, action);

        expect(newState.topics[0].subscribed).toBe(true);
        expect(newState.topics).toEqual(state.topics);
      });

      it('should not modify other topics when unsubscribing from one', () => {
        const secondTopic: NotificationsTopic = {
          id: 'topic-2',
          name: 'Second Topic',
          subscribed: true,
        };

        state.topics = [{ ...mockTopic, subscribed: true }, secondTopic];

        const action = actions.unsubscribeFromTopic({ topicId: 'topic-1' });
        const newState = reducer(state, action);

        expect(newState.topics[0].subscribed).toBeUndefined();
        expect(newState.topics[1].subscribed).toBe(true);
      });
    });
  });

  describe('selectors', () => {
    describe('selectAllNotifications', () => {
      it('should return all notifications from state', () => {
        state.notifications = [mockNotification];
        const rootState = { notificationCenter: state };

        const selected = selectors.selectAllNotifications(rootState);

        expect(selected).toEqual(state.notifications);
        expect(selected).toHaveLength(1);
        expect(selected[0]).toEqual(mockNotification);
      });

      it('should return empty array when no notifications exist', () => {
        const rootState = { notificationCenter: state };
        const selected = selectors.selectAllNotifications(rootState);

        expect(selected).toEqual([]);
        expect(selected).toHaveLength(0);
      });

      it('should return multiple notifications', () => {
        state.notifications = [mockNotification, secondNotification];
        const rootState = { notificationCenter: state };

        const selected = selectors.selectAllNotifications(rootState);

        expect(selected).toHaveLength(2);
        expect(selected[0]).toEqual(mockNotification);
        expect(selected[1]).toEqual(secondNotification);
      });
    });

    describe('selectAllTopics', () => {
      it('should return all topics from state', () => {
        state.topics = [mockTopic];
        const rootState = { notificationCenter: state };

        const selected = selectors.selectAllTopics(rootState);

        expect(selected).toEqual(state.topics);
        expect(selected).toHaveLength(1);
        expect(selected[0]).toEqual(mockTopic);
      });

      it('should return empty array when no topics exist', () => {
        const rootState = { notificationCenter: state };
        const selected = selectors.selectAllTopics(rootState);

        expect(selected).toEqual([]);
        expect(selected).toHaveLength(0);
      });

      it('should return multiple topics', () => {
        const secondTopic: NotificationsTopic = {
          id: 'topic-2',
          name: 'Second Topic',
          subscribed: true,
        };

        state.topics = [mockTopic, secondTopic];
        const rootState = { notificationCenter: state };

        const selected = selectors.selectAllTopics(rootState);

        expect(selected).toHaveLength(2);
        expect(selected[0]).toEqual(mockTopic);
        expect(selected[1]).toEqual(secondTopic);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty state correctly', () => {
      expect(state.notifications).toHaveLength(0);
      expect(state.topics).toHaveLength(0);
    });

    it('should handle actions on empty state gracefully', () => {
      const removeAction = actions.removeNotification({ id: 'non-existent' });
      const markReadAction = actions.markNotificationAsRead({
        id: 'non-existent',
      });
      const subscribeAction = actions.subscribeToTopic({
        topicId: 'non-existent',
      });
      const unsubscribeAction = actions.unsubscribeFromTopic({
        topicId: 'non-existent',
      });

      const state1 = reducer(state, removeAction);
      const state2 = reducer(state1, markReadAction);
      const state3 = reducer(state2, subscribeAction);
      const finalState = reducer(state3, unsubscribeAction);

      expect(finalState).toEqual(state);
    });

    it('should maintain immutability of state', () => {
      const originalState = { ...state };
      originalState.notifications = [...state.notifications];
      originalState.topics = [...state.topics];

      const action = actions.addNotification(mockNotification);
      const newState = reducer(state, action);

      expect(newState).not.toBe(state);
      expect(newState.notifications).not.toBe(state.notifications);
      expect(state).toEqual(originalState);
    });

    it('should handle notifications with undefined read property', () => {
      const notificationWithoutRead: LaceNotification = {
        message: {
          id: 'notification-no-read',
          title: 'Notification Without Read',
          body: 'This notification has no read property',
          publisher: 'Test Publisher',
          chain: 'Cardano',
          format: 'text',
          topicId: 'topic-1',
        },
      };

      state.notifications = [notificationWithoutRead];

      const action = actions.markNotificationAsRead({
        id: 'notification-no-read',
      });
      const newState = reducer(state, action);

      expect(newState.notifications[0].read).toBe(true);
    });

    it('should handle topics with undefined subscribed property', () => {
      const topicWithoutSubscribed: NotificationsTopic = {
        id: 'topic-no-subscribed',
        name: 'Topic Without Subscribed',
      };

      state.topics = [topicWithoutSubscribed];

      const action = actions.subscribeToTopic({
        topicId: 'topic-no-subscribed',
      });
      const newState = reducer(state, action);

      expect(newState.topics[0].subscribed).toBe(true);
    });
  });
});
