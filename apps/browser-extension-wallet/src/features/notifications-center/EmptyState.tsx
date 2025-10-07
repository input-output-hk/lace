import React from 'react';
import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';
import styles from './EmptyState.module.scss';
import SmileyFaceIcon from '../../assets/icons/smiley-face.component.svg';

export const EmptyState = (): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Flex flexDirection="column" gap="$20" alignItems="center" justifyContent="center" data-testid="empty-state">
      <SmileyFaceIcon className={styles.icon} />
      <Flex alignItems="center" flexDirection="column" gap="$0">
        <Text.Body.Large>{t('notificationsCenter.emptyState.title')}</Text.Body.Large>
        <Text.Body.Small color="secondary">{t('notificationsCenter.emptyState.description')}</Text.Body.Small>
      </Flex>
    </Flex>
  );
};
