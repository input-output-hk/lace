import { createSelector, createSlice } from '@reduxjs/toolkit';

import type { LaceNotification, NotificationsTopic } from './types';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

export interface NotificationsCenterState {
  notifications: LaceNotification[];
  topics: NotificationsTopic[];
}

const initialState: NotificationsCenterState = {
  notifications: [],
  topics: [],
};

const selectSubscribedTopicIds = createSelector(
  (state: NotificationsCenterState) => state.topics,
  topics =>
    new Set(topics.filter(topic => topic.subscribed).map(topic => topic.id)),
);

const notificationsCenterSlice = createSlice({
  name: 'notificationCenter',
  initialState,
  reducers: {
    addNotification: (state, action: { payload: LaceNotification }) => {
      state.notifications.unshift(action.payload);
    },
    initData: (
      state,
      action: {
        payload: {
          topics: NotificationsTopic[];
          notifications: LaceNotification[];
        };
      },
    ) => {
      state.topics = action.payload.topics;
      state.notifications = action.payload.notifications;
    },
    markAllNotificationsAsRead: state => {
      const subscribedTopicIds = selectSubscribedTopicIds(state);
      for (const n of state.notifications) {
        if (subscribedTopicIds.has(n.message.topicId)) n.read = true;
      }
    },
    markNotificationAsRead: (state, action: { payload: { id: string } }) => {
      const notification = state.notifications.find(
        n => n.message.id === action.payload.id,
      );
      if (notification) notification.read = true;
    },
    removeNotification: (state, action: { payload: { id: string } }) => {
      state.notifications = state.notifications.filter(
        n => n.message.id !== action.payload.id,
      );
    },
    subscribeToTopic: (state, action: { payload: { topicId: string } }) => {
      const topic = state.topics.find(t => t.id === action.payload.topicId);
      if (topic) topic.subscribed = true;
    },
    unsubscribeFromTopic: (state, action: { payload: { topicId: string } }) => {
      const topic = state.topics.find(t => t.id === action.payload.topicId);
      if (topic) delete topic.subscribed;
    },
  },
  selectors: {
    selectAllNotifications: (state: NotificationsCenterState) =>
      state.notifications,
    selectAllTopics: (state: NotificationsCenterState) => state.topics,
    selectNotificationById: (
      state: NotificationsCenterState,
      notificationId: string,
    ) => state.notifications.find(n => n.message.id === notificationId),
    selectNotificationsBySubscribedTopics: createSelector(
      (state: NotificationsCenterState) => state.notifications,
      (state: NotificationsCenterState) => selectSubscribedTopicIds(state),
      (notifications, subscribedTopicIds) =>
        notifications.filter(n => subscribedTopicIds.has(n.message.topicId)),
    ),
    selectUnreadNotificationsCount: createSelector(
      (state: NotificationsCenterState) => state.notifications,
      (state: NotificationsCenterState) => selectSubscribedTopicIds(state),
      (notifications, subscribedTopicIds) =>
        notifications.filter(
          n => !n.read && subscribedTopicIds.has(n.message.topicId),
        ).length,
    ),
  },
});

export const notificationCenterReducers = {
  [notificationsCenterSlice.name]: notificationsCenterSlice.reducer,
};

export const notificationCenterActions = {
  notificationCenter: notificationsCenterSlice.actions,
};

export const notificationCenterSelectors = {
  notificationCenter: notificationsCenterSlice.selectors,
};

export type NotificationCenterStoreState = StateFromReducersMapObject<
  typeof notificationCenterReducers
>;
