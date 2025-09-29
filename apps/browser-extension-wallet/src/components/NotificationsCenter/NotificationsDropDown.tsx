import React from 'react';
import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Menu } from 'antd';

import { Divider, Flex, Text } from '@input-output-hk/lace-ui-toolkit';

import { NotificationsAllClear } from './NotificationsAllClear';

import styles from './NotificationsDropDown.module.scss';

export interface NotificationsDropDownProps {
  notifications: string[];
  onMarkAllAsRead: () => void;
  onViewAll: () => void;
  popupView?: boolean;
}

export const NotificationsDropDown = ({
  notifications,
  onMarkAllAsRead,
  onViewAll,
  popupView
}: NotificationsDropDownProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Menu className={classnames(styles.container, { [styles.popupView]: popupView })}>
      <div className={styles.content}>
        {notifications.length > 0 ? <div>Placeholder content</div> : <NotificationsAllClear />}
      </div>
      <Divider my="$4" />
      <Flex justifyContent="space-between">
        <Text.Body.Normal>
          <a onClick={onViewAll}>
            {t(`notificationsCenter.${notifications.length > 0 ? 'viewAll' : 'manageSubscriptions'}`)}
          </a>
        </Text.Body.Normal>
        {notifications.length > 0 && (
          <Text.Body.Normal>
            <a onClick={onMarkAllAsRead}>{t('notificationsCenter.markAllAsRead')}</a>
          </Text.Body.Normal>
        )}
      </Flex>
    </Menu>
  );
};
