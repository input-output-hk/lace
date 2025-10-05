import React from 'react';
import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Menu } from 'antd';

import { Box, Divider, Flex, Text } from '@input-output-hk/lace-ui-toolkit';

import { EmptyState } from './EmptyState';
import { NotificationsList } from './NotificationsList';
import { useNotificationsCenter } from '@hooks/useNotificationsCenter';

import styles from './NotificationsDropDown.module.scss';

export interface NotificationsDropDownProps {
  onViewAll: () => void;
  popupView?: boolean;
}

export const NotificationsDropDown = ({ onViewAll, popupView }: NotificationsDropDownProps): React.ReactElement => {
  const { t } = useTranslation();
  const { notifications, loadMore, isLoading, markAsRead, unreadNotifications } = useNotificationsCenter();

  return (
    <Menu className={classnames(styles.container, { [styles.popupView]: popupView })}>
      <div
        id="notifications-dropdown-content"
        className={classnames(styles.content, { [styles.isEmpty]: notifications?.length === 0 })}
      >
        {notifications?.length > 0 ? (
          <NotificationsList
            className={styles.notificationsListContainer}
            notifications={notifications}
            scrollableTarget="notifications-dropdown-content"
            dataLength={notifications.length}
            loadMore={loadMore}
            isLoading={isLoading}
            withBorder={false}
            withDivider
            popupView
          />
        ) : (
          <EmptyState />
        )}
      </div>
      <Divider my="$4" />
      <Flex justifyContent="space-between">
        <Box className={styles.btn} onClick={onViewAll} p="$8">
          <Text.Body.Normal weight="$bold" color="highlight">
            <span>{t(`notificationsCenter.${notifications?.length > 0 ? 'viewAll' : 'manageSubscriptions'}`)}</span>
          </Text.Body.Normal>
        </Box>
        {unreadNotifications > 0 && (
          <Box className={styles.btn} onClick={() => markAsRead()} p="$8">
            <Text.Body.Normal weight="$bold" color="highlight">
              <span>{t('notificationsCenter.markAllAsRead')}</span>
            </Text.Body.Normal>
          </Box>
        )}
      </Flex>
    </Menu>
  );
};
