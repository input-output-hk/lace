import React from 'react';
import styles from './NotificationListItem.module.scss';
import { Flex, Text, Button, Box, IconButton } from '@input-output-hk/lace-ui-toolkit';
import TrashOutlineComponent from '../../assets/icons/browser-view/trash-icon.component.svg';
import { useTranslation } from 'react-i18next';
import classnames from 'classnames';

export type LaceMessage = {
  id: string;
  topic: string;
  title: string;
  body: string;
  format: string;
};

export type LaceNotification = {
  message: LaceMessage;
  read?: boolean;
};

export interface NotificationListItemProps {
  id: string;
  title: string;
  isRead?: boolean;
  popupView?: boolean;
  topicName: string;
  publisher: string;
  onRemove?: (id: string) => void;
  onClick: () => void;
  withBorder?: boolean;
}

export const NotificationListItem = ({
  id,
  title,
  isRead = false,
  popupView = false,
  topicName,
  onRemove,
  onClick,
  withBorder = true
}: NotificationListItemProps): React.ReactElement => {
  const { t } = useTranslation();

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onRemove?.(id);
  };

  const TitleTextComponent = popupView ? Text.Body.Small : Text.Body.Large;
  const removeButton = popupView ? (
    <IconButton.Primary
      icon={<TrashOutlineComponent className={styles.icon} />}
      onClick={handleRemove}
      color="secondary"
      data-testid="notification-list-item-remove-button"
    />
  ) : (
    <Button.Secondary
      size="small"
      icon={<TrashOutlineComponent className={styles.icon} />}
      label={popupView ? '' : t('notificationsCenter.notificationListItem.remove')}
      color="secondary"
      onClick={handleRemove}
      data-testid="notification-list-item-remove-button"
    />
  );

  return (
    <Box
      h={popupView ? '$80' : '$96'}
      onClick={onClick}
      className={classnames(styles.container, withBorder && styles.withBorder)}
      p="$20"
      w="$fill"
    >
      <Flex className={styles.content} justifyContent="space-between" alignItems="flex-start" flexDirection="column">
        <Flex alignItems="center" gap="$4" className={styles.copy}>
          {!isRead && <div className={styles.dot} data-testid="notification-list-item-dot" />}
          <Text.Body.Small weight="$medium" color="secondary" data-testid="notification-list-item-publisher">
            {topicName}
          </Text.Body.Small>
        </Flex>
        <TitleTextComponent weight="$semibold" className={styles.copy} data-testid="notification-list-item-title">
          {title}
        </TitleTextComponent>
      </Flex>
      <Flex className={styles.actions} alignItems="center" justifyContent="center">
        {typeof onRemove === 'function' && removeButton}
      </Flex>
    </Box>
  );
};
