import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex } from '@input-output-hk/lace-ui-toolkit';

import { Button, NavigationButton } from '@lace/common';
import { SectionTitle } from '@components/Layout/SectionTitle';

import styles from './NotificationsCenter.module.scss';

export interface NotificationsCenterProps {
  onBack: () => void;
  onMarkAllAsRead: () => void;
  popupView?: boolean;
}

export const NotificationsCenter = ({
  onBack,
  onMarkAllAsRead,
  popupView
}: NotificationsCenterProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Box p="$24">
      <Flex justifyContent="space-between" mb={'$44'}>
        <Box mb={'$0'}>
          <SectionTitle
            sideText={`(${1})`}
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
  );
};
