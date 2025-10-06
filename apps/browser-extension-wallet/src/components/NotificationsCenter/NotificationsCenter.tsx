import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex } from '@input-output-hk/lace-ui-toolkit';

import { Button, NavigationButton } from '@lace/common';
import { SectionTitle } from '@components/Layout/SectionTitle';
import { LaceNotification, NotificationsTopic } from '@src/types/notifications-center';

import styles from './NotificationsCenter.module.scss';
import { WarningModal } from '@src/views/browser-view/components/WarningModal/WarningModal';

export interface NotificationsCenterProps {
  notifications: LaceNotification[];
  onBack: () => void;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  popupView?: boolean;
  topics: NotificationsTopic[];
  unreadNotifications: number;
}

export const NotificationsCenter = ({
  onBack,
  onMarkAllAsRead,
  popupView,
  unreadNotifications
}: NotificationsCenterProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isRemoveNotificationModalVisible, setIsRemoveNotificationModalVisible] = useState(false);

  const onRemoveNotification = () => {
    // TODO: implement remove notification
    // eslint-disable-next-line no-console
    console.log('remove notification');
    setIsRemoveNotificationModalVisible(false);
  };

  return (
    <>
      <WarningModal
        visible={isRemoveNotificationModalVisible}
        header={t('notificationsCenter.removeNotification')}
        content={t('notificationsCenter.removeNotification.description')}
        onCancel={() => setIsRemoveNotificationModalVisible(false)}
        cancelLabel={t('notificationsCenter.removeNotification.cancel')}
        confirmLabel={t('notificationsCenter.removeNotification.confirm')}
        onConfirm={onRemoveNotification}
        isPopupView={popupView}
      />
      <Box p="$24">
        <Flex justifyContent="space-between" mb={'$44'}>
          <Box mb={'$0'}>
            <SectionTitle
              sideText={unreadNotifications > 0 ? `(${unreadNotifications})` : undefined}
              title={
                <Flex alignItems="center" gap="$8">
                  <NavigationButton icon="arrow" onClick={onBack} />
                  {t('notificationsCenter.title')}
                </Flex>
              }
            />
          </Box>
          {!popupView && (
            <Button
              className={styles.button}
              block
              color="gradient"
              data-testid="notifications-bell"
              onClick={onMarkAllAsRead}
            >
              {t('notificationsCenter.markAllAsRead')}
            </Button>
          )}
        </Flex>
        Notifications Center (Placeholder content)
      </Box>
    </>
  );
};
