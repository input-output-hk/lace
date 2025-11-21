/* eslint-disable react/no-multi-comp */
/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types, promise/catch-or-return, sonarjs/cognitive-complexity, no-magic-numbers, unicorn/no-null */
import React, { useState, useCallback } from 'react';
import { ContentLayout } from '@src/components/Layout';
import { useTranslation } from 'react-i18next';
import { WarningModal } from '@src/views/browser-view/components';
import { useNotificationsCenter } from '@hooks/useNotificationsCenter';
import { NotificationsList } from './NotificationsList';
import { EmptyState } from './EmptyState';
import { Box, Flex } from '@input-output-hk/lace-ui-toolkit';
import { NavigationButton } from '@lace/common';
import { useHistory } from 'react-router';
import { SectionTitle } from '@components/Layout/SectionTitle';
import { SubscriptionsContainer } from './SubscriptionsContainer';
import styles from './NotificationsCenter.module.scss';

const listWrapperStyles = { width: '100%' };

const NotificationsCenterContent = (): React.ReactElement => {
  const { t } = useTranslation();
  const [isRemoveNotificationModalVisible, setIsRemoveNotificationModalVisible] = useState(false);
  const { notifications, remove, markAsRead } = useNotificationsCenter();
  const [notificationIdToRemove, setNotificationIdToRemove] = useState<string | undefined>();
  const history = useHistory();

  const onShowRemoveNotificationModal = (id: string) => {
    setNotificationIdToRemove(id);
    setIsRemoveNotificationModalVisible(true);
  };

  const onHideRemoveNotificationModal = useCallback(() => {
    setNotificationIdToRemove(undefined);
    setIsRemoveNotificationModalVisible(false);
  }, [setNotificationIdToRemove, setIsRemoveNotificationModalVisible]);

  const onGoToNotification = useCallback(
    (id: string) => {
      markAsRead(id);
      history.push(`/notification/${id}`);
    },
    [markAsRead, history]
  );

  return (
    <>
      <Flex w="$fill" flexDirection="column" gap="$20">
        <SubscriptionsContainer popupView />
        <div style={listWrapperStyles}>
          {notifications?.length > 0 ? (
            <NotificationsList
              onClick={onGoToNotification}
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
      </Flex>
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
        isPopupView
      />
    </>
  );
};

export const NotificationsCenter = (): React.ReactElement => {
  const { t } = useTranslation();
  const { notifications } = useNotificationsCenter();
  const history = useHistory();

  const isInitialLoad = typeof notifications === 'undefined';

  return (
    <ContentLayout
      title={
        <SectionTitle
          isPopup
          title={
            <Flex className={styles.navigationButton} py="$4" alignItems="center" gap="$8">
              <NavigationButton icon="arrow" onClick={() => history.goBack()} />
              {t('notificationsCenter.title')}
            </Flex>
          }
          sideText={`(${notifications?.length ?? 0})`}
          data-testid="section-title"
        />
      }
      isLoading={isInitialLoad}
    >
      <NotificationsCenterContent />
    </ContentLayout>
  );
};
