import React from 'react';
import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Menu } from 'antd';

import { Flex, Text, ToggleSwitch } from '@input-output-hk/lace-ui-toolkit';

import styles from './SubscriptionsDropDown.module.scss';
import { NotificationsTopic } from '@src/types/notifications-center';

export interface NotificationsDropDownProps {
  topics: NotificationsTopic[];
  onTopicChange: (topic: NotificationsTopic, shouldSubscribe: boolean) => void;
  popupView?: boolean;
}

export const SubscriptionsDropDown = ({
  topics,
  onTopicChange,
  popupView
}: NotificationsDropDownProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Menu className={classnames(styles.container, { [styles.popupView]: popupView })}>
      <Flex className={styles.content} gap="$24" flexDirection="column" justifyContent="space-between">
        <Text.Label color="secondary">{t('notificationsCenter.chooseSubject')}</Text.Label>
        <Flex w="$fill" gap="$24" flexDirection="column" justifyContent="space-between">
          {topics.map((topic) => (
            <Flex w="$fill" key={topic.name} gap="$24" justifyContent="space-between">
              <Text.Label className={styles.toggleLabel} color="secondary">
                {topic.name}
              </Text.Label>
              <ToggleSwitch
                key={topic.name}
                defaultChecked={topic.subscribed}
                data-testid={`subscriptions-toggle-${topic.name}`}
                onCheckedChange={(isChecked) => onTopicChange(topic, isChecked)}
              />
            </Flex>
          ))}
        </Flex>
      </Flex>
    </Menu>
  );
};
