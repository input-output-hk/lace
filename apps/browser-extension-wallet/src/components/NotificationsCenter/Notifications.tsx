/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types, promise/catch-or-return, sonarjs/cognitive-complexity, no-magic-numbers, unicorn/no-null */
import React, { useState } from 'react';
import { ContentLayout } from '@src/components/Layout';
import { useTranslation } from 'react-i18next';
import { WarningModal } from '@src/views/browser-view/components';
import { useNotifications } from './mockNotifications';
import { NotificationsList } from './NotificationsList';
import { EmptyState } from './EmptyState';
import { Box, Flex } from '@input-output-hk/lace-ui-toolkit';
import { NavigationButton } from '@lace/common';
import { useHistory } from 'react-router';
import { SectionTitle } from '@components/Layout/SectionTitle';

export const NotificationsCenter = (): React.ReactElement => {
  const { t } = useTranslation();
  const [isRemoveNotificationModalVisible, setIsRemoveNotificationModalVisible] = useState(false);
  const { notifications, loadMore, removeNotification, unreadCount, isLoading } = useNotifications();
  const [notificationIdToRemove, setNotificationIdToRemove] = useState<string | undefined>();
  const history = useHistory();

  const onShowRemoveNotificationModal = (id: string) => {
    setNotificationIdToRemove(id);
    setIsRemoveNotificationModalVisible(true);
  };

  const onHideRemoveNotificationModal = () => {
    setNotificationIdToRemove(undefined);
    setIsRemoveNotificationModalVisible(false);
  };

  const isInitialLoad = typeof notifications === 'undefined';

  return (
    <ContentLayout
      title={
        <SectionTitle
          isPopup
          title={
            <Flex alignItems="center" gap="$8">
              <NavigationButton icon="arrow" onClick={() => history.goBack()} />
              {t('notificationsCenter.title')}
            </Flex>
          }
          sideText={`(${unreadCount})`}
          data-testid="notifications-center-title"
        />
      }
      isLoading={isInitialLoad}
    >
      <div>
        {notifications?.length > 0 ? (
          <NotificationsList
            isLoading={isLoading}
            hasMore
            loadMore={loadMore}
            notifications={notifications}
            scrollableTarget="contentLayout"
            dataLength={notifications.length}
            onRemove={onShowRemoveNotificationModal}
            popupView
          />
        ) : (
          <Box mt="$96">
            <EmptyState />
          </Box>
        )}
      </div>
      <WarningModal
        visible={isRemoveNotificationModalVisible}
        header={t('notificationsCenter.removeNotification')}
        content={t('notificationsCenter.removeNotification.description')}
        onCancel={onHideRemoveNotificationModal}
        cancelLabel={t('notificationsCenter.removeNotification.cancel')}
        confirmLabel={t('notificationsCenter.removeNotification.confirm')}
        onConfirm={() => {
          removeNotification(notificationIdToRemove);
          onHideRemoveNotificationModal();
        }}
        isPopupView
      />
    </ContentLayout>
  );
};
