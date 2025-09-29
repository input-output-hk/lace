import React from 'react';
import { useTranslation } from 'react-i18next';

import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';

import styles from './NotificationsAllClear.module.scss';

import HappyFaceIcon from '@lace/core/src/ui/assets/icons/happy-face.component.svg';

export const NotificationsAllClear = (): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Flex flexDirection="column" alignItems="center" justifyContent="center" gap="$8">
      <HappyFaceIcon className={styles.icon} />
      <Text.Body.Large>{t('notificationsCenter.allClear.title')}</Text.Body.Large>
      <Text.Body.Small>{t('notificationsCenter.allClear.description')}</Text.Body.Small>
    </Flex>
  );
};
