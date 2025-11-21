/* eslint-disable react/no-multi-comp */
/* eslint-disable unicorn/no-useless-undefined */
import React, { useState, useEffect, useCallback } from 'react';
import { WarningModal } from '@src/views/browser-view/components';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router';
import { useNotificationsCenter } from '@hooks/useNotificationsCenter';
import { walletRoutePaths } from '@routes';
import { NotificationDetails } from './NotificationDetails';
import { Flex, Box } from '@input-output-hk/lace-ui-toolkit';
import { Button, NavigationButton } from '@lace/common';
import { ContentLayout } from '@components/Layout';
import styles from './NotificationDetailsContainer.module.scss';

export const NotificationDetailsContent = (): React.ReactElement => {
  const { t } = useTranslation();
  const history = useHistory();
  const { notifications, remove } = useNotificationsCenter();
  const [notificationIdToRemove, setNotificationIdToRemove] = useState<string | undefined>();
  const { id: notificationId } = useParams<{ id: string }>();
  const notification = notifications?.find(({ message }) => message.id === notificationId);

  useEffect(() => {
    if (!notification && notifications) {
      history.goBack();
    }
  }, [notification, history, notifications]);

  const onRemoveNotification = useCallback(() => {
    setNotificationIdToRemove(notificationId);
  }, [notificationId]);

  if (!notification) {
    return <></>;
  }

  return (
    <>
      <WarningModal
        visible={!!notificationIdToRemove}
        header={t('notificationsCenter.removeNotification')}
        content={t('notificationsCenter.removeNotification.description')}
        onCancel={() => setNotificationIdToRemove(undefined)}
        cancelLabel={t('notificationsCenter.removeNotification.cancel')}
        confirmLabel={t('notificationsCenter.removeNotification.confirm')}
        onConfirm={() => {
          remove(notificationIdToRemove);
          setNotificationIdToRemove(undefined);
        }}
      />
      <NotificationDetails notification={notification} onRemoveNotification={onRemoveNotification} popupView />
    </>
  );
};

export const NotificationDetailsContainer = (): React.ReactElement => {
  const { t } = useTranslation();
  const history = useHistory();

  const onBack = useCallback(() => {
    history.goBack();
  }, [history]);

  const onViewAllNotification = useCallback(() => {
    history.push(walletRoutePaths.notifications);
  }, [history]);

  return (
    <ContentLayout>
      <Flex justifyContent="space-between" alignItems="center" gap="$8">
        <Box className={styles.navigationButton}>
          <NavigationButton icon="arrow" onClick={onBack} />
        </Box>
        <Button color="gradient" data-testid="view-all-button" onClick={onViewAllNotification}>
          {t('notificationsCenter.viewAll')}
        </Button>
      </Flex>
      <NotificationDetailsContent />
    </ContentLayout>
  );
};
