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
    <Menu
      className={classnames(styles.container, { [styles.popupView]: popupView })}
      data-testid="subscriptions-dropdown"
    >
      <Flex className={styles.content} gap="$24" flexDirection="column" justifyContent="space-between">
        <Text.Label color="secondary" data-testid="subscriptions-dropdown-description">
          {t('notificationsCenter.chooseSubject')}
        </Text.Label>
        <Flex w="$fill" gap="$24" flexDirection="column" justifyContent="space-between">
          {(topics ?? []).map((topic) => (
            <Flex
              className={styles.switch}
              w="$fill"
              key={topic.id}
              gap="$24"
              alignItems="center"
              justifyContent="space-between"
            >
              <Text.Body.Normal
                weight="$medium"
                className={styles.toggleLabel}
                color="secondary"
                data-testid="subscriptions-toggle-topic-name"
              >
                {topic.name}
              </Text.Body.Normal>
              <ToggleSwitch
                key={topic.id}
                defaultChecked={topic.isSubscribed}
                testId={`subscriptions-${topic.id}-`}
                onCheckedChange={(isChecked) => onTopicChange(topic, isChecked)}
              />
            </Flex>
          ))}
        </Flex>
      </Flex>
    </Menu>
  );
};
