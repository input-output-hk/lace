/* eslint-disable unicorn/no-useless-undefined */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex } from '@input-output-hk/lace-ui-toolkit';

import { Button, NavigationButton } from '@lace/common';
import { SectionTitle } from '@components/Layout/SectionTitle';
import { NotificationsList } from './NotificationsList';
import { useNotificationsCenter } from '@hooks/useNotificationsCenter';

import styles from './NotificationsCenter.module.scss';
import { WarningModal } from '@src/views/browser-view/components/WarningModal/WarningModal';
import { LACE_APP_ID } from '@src/utils/constants';
import { EmptyState } from './EmptyState';
import { useHistory } from 'react-router';

export const NotificationsCenter = (): React.ReactElement => {
  const { t } = useTranslation();
  const history = useHistory();
  const [isRemoveNotificationModalVisible, setIsRemoveNotificationModalVisible] = useState(false);
  const { notifications, loadMore, markAsRead, remove, unreadNotifications, isLoading } = useNotificationsCenter();
  const [notificationIdToRemove, setNotificationIdToRemove] = useState<string | undefined>();

  const onBack = () => {
    history.goBack();
  };

  const onShowRemoveNotificationModal = (id: string) => {
    setNotificationIdToRemove(id);
    setIsRemoveNotificationModalVisible(true);
  };

  const onHideRemoveNotificationModal = () => {
    setNotificationIdToRemove(undefined);
    setIsRemoveNotificationModalVisible(false);
  };

  return (
    <>
      <WarningModal
        visible={isRemoveNotificationModalVisible}
        header={t('notificationsCenter.removeNotification')}
        content={t('notificationsCenter.removeNotification.description')}
        onCancel={onHideRemoveNotificationModal}
        cancelLabel={t('notificationsCenter.removeNotification.cancel')}
        confirmLabel={t('notificationsCenter.removeNotification.confirm')}
        onConfirm={() => {
          remove(notificationIdToRemove);
          onHideRemoveNotificationModal();
        }}
      />
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box mb="$16" pl="$12">
          <Flex h="$48" alignItems="center" justifyContent="space-between">
            <Box mb={'$0'}>
              <SectionTitle
                sideText={`(${unreadNotifications})`}
                classname={styles.sectionTitle}
                title={
                  <Flex alignItems="center" gap="$8">
                    <NavigationButton icon="arrow" onClick={onBack} />
                    {t('notificationsCenter.title')}
                  </Flex>
                }
              />
            </Box>
            {unreadNotifications > 0 && (
              <Button
                className={styles.button}
                block
                color="gradient"
                data-testid="notifications-bell"
                onClick={() => markAsRead()}
              >
                {t('notificationsCenter.markAllAsRead')}
              </Button>
            )}
          </Flex>
        </Box>
        {notifications?.length > 0 ? (
          <NotificationsList
            notifications={notifications}
            scrollableTarget={LACE_APP_ID}
            dataLength={notifications.length}
            loadMore={loadMore}
            onRemove={onShowRemoveNotificationModal}
            isLoading={isLoading}
          />
        ) : (
          <Box mt="$120">
            <EmptyState />
          </Box>
        )}
      </div>
    </>
  );
};
