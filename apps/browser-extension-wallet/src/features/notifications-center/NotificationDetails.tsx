import React from 'react';

import { useTranslation } from 'react-i18next';

import { Flex, Button as LaceButton, Text, Box, Divider } from '@input-output-hk/lace-ui-toolkit';
import TrashOutlineComponent from '../../assets/icons/browser-view/trash-icon.component.svg';
import { LaceNotificationWithTopicName } from '@src/types/notifications-center';
import styles from './NotificationDetails.module.scss';
import { textToLink } from '@src/utils/text-to-link';
import { useExternalLinkOpener } from '@providers';

export interface NotificationDetailsProps {
  notification: LaceNotificationWithTopicName;
  onRemoveNotification?: () => void;
  popupView?: boolean;
}

export const NotificationDetails = ({
  notification,
  onRemoveNotification,
  popupView
}: NotificationDetailsProps): React.ReactElement => {
  const { t } = useTranslation();
  const openExternalLink = useExternalLinkOpener();
  const TopicNameTextComponent = popupView ? Text.Body.Small : Text.Body.Normal;
  const bodyText = textToLink(notification.message.body, openExternalLink);
  const bodyTextComponent = popupView ? (
    <Text.Label data-testid="notification-details-body">{bodyText}</Text.Label>
  ) : (
    <Text.Body.Large weight="$semibold" data-testid="notification-details-body">
      {bodyText}
    </Text.Body.Large>
  );

  return (
    <Flex py="$20" flexDirection="column" w="$fill">
      <Flex px={popupView ? '$20' : '$0'} flexDirection="column" w="$fill">
        <Text.Heading weight="$bold" color="secondary" data-testid="notification-details-title">
          {notification.message.title}
        </Text.Heading>
        <Box mt={popupView ? '$8' : '$18'}>
          <TopicNameTextComponent weight="$semibold" data-testid="notification-details-topic-name">
            {notification.topicName}
          </TopicNameTextComponent>
        </Box>
        <Divider w="$fill" mt={popupView ? '$16' : '$18'} mb={popupView ? '$16' : '$32'} />
        {notification.message.format === 'plain' ? (
          bodyTextComponent
        ) : (
          <pre>{JSON.stringify(notification.message.body)}</pre>
        )}
      </Flex>
      {typeof onRemoveNotification === 'function' && (
        <Flex mt="$32" className={styles.actions} w="$fill">
          <LaceButton.Secondary
            w="$fill"
            size="medium"
            color="secondary"
            label={t('notificationsCenter.removeNotification.confirm')}
            icon={<TrashOutlineComponent className={styles.icon} />}
            onClick={onRemoveNotification}
            data-testid="remove-button"
          />
        </Flex>
      )}
    </Flex>
  );
};
