import React from 'react';
import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Menu } from 'antd';

import { Box, Divider, Flex, Text } from '@input-output-hk/lace-ui-toolkit';

import { EmptyState } from './EmptyState';
import { NotificationsList } from './NotificationsList';
import { useNotificationsCenter } from '@hooks/useNotificationsCenter';

import styles from './NotificationsDropDown.module.scss';
import { useHistory } from 'react-router';

export interface NotificationsDropDownProps {
  onViewAll: () => void;
  popupView?: boolean;
  onClose: () => void;
}

export const NotificationsDropDown = ({
  onViewAll,
  popupView,
  onClose
}: NotificationsDropDownProps): React.ReactElement => {
  const { t } = useTranslation();
  const { notifications, markAsRead, unreadNotifications } = useNotificationsCenter();
  const history = useHistory();

  const onGoToNotification = (id: string) => {
    markAsRead(id);
    history.push(`/notification/${id}`);
    onClose();
  };

  return (
    <Menu className={classnames(styles.container, { [styles.popupView]: popupView })} data-testid="notifications-menu">
      <div
        id="notifications-dropdown-content"
        className={classnames(styles.content, { [styles.isEmpty]: notifications?.length === 0 })}
      >
        {notifications?.length > 0 ? (
          <NotificationsList
            onClick={onGoToNotification}
            className={styles.notificationsListContainer}
            notifications={notifications}
            scrollableTarget="notifications-dropdown-content"
            dataLength={notifications.length}
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
          <Text.Body.Normal
            weight="$semibold"
            color="highlight"
            data-testid={
              notifications?.length > 0
                ? 'notifications-menu-view-all-button'
                : 'notifications-menu-manage-subscriptions-button'
            }
          >
            {t(`notificationsCenter.${notifications?.length > 0 ? 'viewAll' : 'manageSubscriptions'}`)}
          </Text.Body.Normal>
        </Box>
        {unreadNotifications > 0 && (
          <Box className={styles.btn} onClick={() => markAsRead()} p="$8">
            <Text.Body.Normal
              weight="$semibold"
              color="highlight"
              data-testid="notifications-menu-mark-all-as-read-button"
            >
              {t('notificationsCenter.markAllAsRead')}
            </Text.Body.Normal>
          </Box>
        )}
      </Flex>
    </Menu>
  );
};
