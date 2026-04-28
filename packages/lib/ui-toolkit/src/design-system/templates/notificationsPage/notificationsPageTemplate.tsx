import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Column, Row, Text } from '../../atoms';
import { DropdownMenu, NotificationCard } from '../../molecules';
import { PageContainerTemplate } from '../pageContainerTemplate/pageContainerTemplate';

import type { IconName } from '../../atoms';
import type { DropdownMenuItem } from '../../molecules';

export type NotificationItem = {
  id: string;
  headerTitle: string;
  headerIcon: IconName;
  bodyTitle: string;
  isRead: boolean;
};

export type SubscriptionTopic = {
  id: string;
  name: string;
  subscribed?: boolean;
};

export type NotificationsPageTemplateProps = {
  title: string;
  notifications: NotificationItem[];
  subscriptionTopics: SubscriptionTopic[];
  onMarkAllAsRead: () => void;
  onSubscriptionChange: (key: string) => void;
  onNotificationPress?: (id: string) => void;
  testID?: string;
};

export const NotificationsPageTemplate = ({
  title,
  notifications,
  subscriptionTopics,
  onMarkAllAsRead,
  onSubscriptionChange,
  onNotificationPress,
  testID = 'notifications-page',
}: NotificationsPageTemplateProps) => {
  const { t } = useTranslation();

  const menuItems = useMemo<DropdownMenuItem[]>(() => {
    return [
      {
        id: 'mark-all-read',
        text: t('v2.notifications.page.markAllAsRead'),
        leftIcon: 'Tick',
      },
      {
        id: 'subscriptions-header',
        text: t('v2.notifications.page.subscriptions'),
        disabled: true,
      },
      ...subscriptionTopics.map(({ id, name, subscribed }) => ({
        id: id,
        text: name,
        toggle: {
          value: subscribed ?? false,
          onValueChange: () => {
            onSubscriptionChange(id);
          },
        },
      })),
    ];
  }, [subscriptionTopics, t, onSubscriptionChange]);

  const handleSelectItem = useCallback(
    (index: number) => {
      if (index === 0) {
        onMarkAllAsRead();
        return;
      }
      const topic = subscriptionTopics[index - 2];
      if (topic) onSubscriptionChange(topic.id);
    },
    [onMarkAllAsRead, onSubscriptionChange, subscriptionTopics],
  );

  return (
    <PageContainerTemplate testID={testID}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}>
        <Column style={styles.content}>
          <Row
            alignItems="center"
            style={styles.header}
            testID={`${testID}-header`}>
            <Text.L
              variant="primary"
              style={styles.headerTitle}
              testID={`${testID}-title`}>
              {title}
            </Text.L>
            <View style={styles.dropdownWrapper}>
              <DropdownMenu
                title={t('v2.notifications.page.dropdown.more')}
                items={menuItems}
                onSelectItem={handleSelectItem}
                dropdownWidth={240}
                testID={`${testID}-more-menu`}
              />
            </View>
          </Row>
        </Column>
        <>
          {notifications.length === 0 ? (
            <Column style={styles.emptyState} testID={`${testID}-empty-state`}>
              <Text.M variant="secondary">
                {t('v2.notifications.page.noNotifications')}
              </Text.M>
            </Column>
          ) : (
            <Column style={styles.listContent}>
              {notifications.map(notification => (
                <NotificationCard
                  key={notification.id}
                  headerTitle={notification.headerTitle}
                  headerIcon={notification.headerIcon}
                  bodyTitle={notification.bodyTitle}
                  isRead={notification.isRead}
                  onPress={
                    onNotificationPress
                      ? () => {
                          onNotificationPress(notification.id);
                        }
                      : undefined
                  }
                  testID={`${testID}-notification-${notification.id}`}
                />
              ))}
            </Column>
          )}
        </>
      </ScrollView>
    </PageContainerTemplate>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    justifyContent: 'center',
  },
  content: {
    gap: spacing.M,
  },
  header: {
    paddingVertical: spacing.M,
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
  },
  dropdownWrapper: {
    width: 140,
  },
  listContent: {
    alignItems: 'center',
    paddingBottom: spacing.XXXXL,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.L,
  },
});
