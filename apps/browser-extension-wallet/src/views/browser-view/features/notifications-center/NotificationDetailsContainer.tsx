/* eslint-disable react/no-multi-comp */
/* eslint-disable unicorn/no-useless-undefined */
import React, { useState, useEffect, useCallback } from 'react';

import { SectionLayout, WarningModal, EducationalList } from '@src/views/browser-view/components';
import { useTranslation } from 'react-i18next';

import { useHistory, useParams } from 'react-router';
import { useNotificationsCenter } from '@hooks/useNotificationsCenter';
import { walletRoutePaths } from '@routes';
import { NotificationDetails } from '../../../../features/notifications-center/NotificationDetails';
import { Flex, Button as LaceButton, Box } from '@input-output-hk/lace-ui-toolkit';
import TrashOutlineComponent from '../../../../assets/icons/browser-view/trash-icon.component.svg';
import { Button, NavigationButton } from '@lace/common';
import { SectionTitle } from '@components/Layout/SectionTitle';

import { Layout } from '@src/views/browser-view/components/Layout';

import styles from './NotificationsCenter.module.scss';
import { getEducationalList } from '../assets/components/AssetEducationalList/AssetEducationalList';

const NotificationDetailsContent = (): React.ReactElement => {
  const { t } = useTranslation();
  const history = useHistory();
  const { notifications, remove } = useNotificationsCenter();
  const [notificationIdToRemove, setNotificationIdToRemove] = useState<string | undefined>();
  const { id: notificationId } = useParams<{ id: string }>();
  const notification = notifications?.find(({ message }) => message.id === notificationId);

  const onBack = useCallback(() => {
    history.goBack();
  }, [history]);

  const onViewAllNotification = useCallback(() => {
    history.push(walletRoutePaths.notifications);
  }, [history]);

  useEffect(() => {
    if (!notification && notifications) {
      history.goBack();
    }
  }, [notification, history, notifications]);

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
      <Flex alignItems="center" justifyContent="space-between" className={styles.header}>
        <Box mb={'$0'}>
          <SectionTitle
            classname={styles.sectionTitle}
            title={
              <Flex className={styles.navigationButton} alignItems="center">
                <NavigationButton icon="arrow" onClick={onBack} />
              </Flex>
            }
          />
        </Box>
        <Flex className={styles.actions} gap="$20">
          <LaceButton.Secondary
            size="medium"
            onClick={() => setNotificationIdToRemove(notificationId)}
            data-testid="remove-button"
            label={t('notificationsCenter.removeNotification.confirm')}
            color="secondary"
            icon={<TrashOutlineComponent className={styles.icon} data-testid="trash-icon" />}
          />
          <Button
            className={styles.button}
            block
            color="gradient"
            data-testid="view-all-button"
            onClick={onViewAllNotification}
          >
            {t('notificationsCenter.notificationDetails.viewAll')}
          </Button>
        </Flex>
      </Flex>
      <NotificationDetails notification={notification} />
    </>
  );
};

export const NotificationDetailsContainer = (): React.ReactElement => {
  const { t } = useTranslation();
  const educationalItems = getEducationalList(t);

  return (
    <Layout>
      <SectionLayout
        sidePanelContent={
          <EducationalList items={educationalItems} title={t('browserView.sidePanel.aboutYourWallet')} />
        }
      >
        <NotificationDetailsContent />
      </SectionLayout>
    </Layout>
  );
};
