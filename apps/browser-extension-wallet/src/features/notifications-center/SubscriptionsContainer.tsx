import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown } from 'antd';
import { Button, Box } from '@input-output-hk/lace-ui-toolkit';

import Chevron from '../../assets/icons/chevron-down.component.svg';
import cn from 'classnames';
import styles from './SubscriptionsContainer.module.scss';
import { useNotificationsCenter } from '@hooks/useNotificationsCenter';
import { SubscriptionsDropDown } from './SubscriptionsDropDown';
import { NotificationsTopic } from '@src/types/notifications-center';

export interface SubscriptionsContainerProps {
  popupView?: boolean;
}

export const SubscriptionsContainer = ({ popupView }: SubscriptionsContainerProps): React.ReactElement => {
  const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);
  const { t } = useTranslation();
  const { topics, subscribe, unsubscribe } = useNotificationsCenter();
  const handleOpenChange = (open: boolean) => {
    setIsDropdownMenuOpen(open);
  };

  const handleTopicChange = (topic: NotificationsTopic, shouldSubscribe: boolean) => {
    if (shouldSubscribe) {
      subscribe(topic.id);
    } else {
      unsubscribe(topic.id);
    }
  };

  return (
    <Dropdown
      onOpenChange={handleOpenChange}
      open={isDropdownMenuOpen}
      dropdownRender={() => (
        <SubscriptionsDropDown topics={topics} onTopicChange={handleTopicChange} popupView={popupView} />
      )}
      placement="bottomCenter"
      trigger={['click']}
    >
      <Box className={cn(styles.subscriptionsButton, { [styles.popupView]: popupView })}>
        <Button.Secondary
          w={popupView ? '$fill' : undefined}
          data-testid="subscriptions"
          label={t('notificationsCenter.subscriptions')}
          icon={
            <Chevron
              className={cn(styles.chevron, { [styles.open]: isDropdownMenuOpen })}
              data-testid={`chevron-${isDropdownMenuOpen ? 'up' : 'down'}`}
            />
          }
        />
      </Box>
    </Dropdown>
  );
};
