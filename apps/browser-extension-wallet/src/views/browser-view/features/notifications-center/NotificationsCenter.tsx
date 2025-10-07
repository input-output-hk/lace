/* eslint-disable unicorn/no-useless-undefined */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex } from '@input-output-hk/lace-ui-toolkit';

import { Button, NavigationButton } from '@lace/common';
import { SectionTitle } from '@components/Layout/SectionTitle';
import { NotificationsList } from '@src/features/notifications-center/NotificationsList';
import { useNotificationsCenter } from '@hooks/useNotificationsCenter';

import styles from './NotificationsCenter.module.scss';
import { WarningModal } from '@src/views/browser-view/components/WarningModal/WarningModal';
import { LACE_APP_ID } from '@src/utils/constants';
import { EmptyState } from '@src/features/notifications-center/EmptyState';
import { useHistory } from 'react-router';
import { Layout, SectionLayout } from '../../components/Layout';
import { EducationalList } from '../../components';
import { getEducationalList } from '@src/views/browser-view/features/assets/components/AssetEducationalList/AssetEducationalList';
import { SubscriptionsContainer } from '@src/features/notifications-center/SubscriptionsContainer';

export const NotificationsCenter = (): React.ReactElement => {
  const { t } = useTranslation();
  const history = useHistory();
  const educationalItems = getEducationalList(t);
  const [isRemoveNotificationModalVisible, setIsRemoveNotificationModalVisible] = useState(false);
  const { notifications, markAsRead, remove, unreadNotifications } = useNotificationsCenter();
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

  const goToNotification = (id: string) => {
    history.push(`/notification/${id}`);
  };

  return (
    <Layout>
      <SectionLayout
        sidePanelContent={
          <EducationalList items={educationalItems} title={t('browserView.sidePanel.aboutYourWallet')} />
        }
      >
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
          <Box mb="$16">
            <Flex alignItems="center" justifyContent="space-between" className={styles.header}>
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
              <Flex gap="$20">
                <SubscriptionsContainer />
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
            </Flex>
          </Box>
          {notifications?.length > 0 ? (
            <NotificationsList
              notifications={notifications}
              scrollableTarget={LACE_APP_ID}
              dataLength={notifications.length}
              onRemove={onShowRemoveNotificationModal}
              onClick={goToNotification}
            />
          ) : (
            <Box mt="$120">
              <EmptyState />
            </Box>
          )}
        </div>
      </SectionLayout>
    </Layout>
  );
};
