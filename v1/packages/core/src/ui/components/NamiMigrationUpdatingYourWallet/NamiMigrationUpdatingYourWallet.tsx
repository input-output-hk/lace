import React, { VFC } from 'react';
import { Card, Flex, Loader, Text } from '@input-output-hk/lace-ui-toolkit';
import styles from './NamiMigrationUpdatingYourWallet.module.scss';
import { useTranslation } from 'react-i18next';

export const NamiMigrationUpdatingYourWallet: VFC = () => {
  const { t } = useTranslation();
  return (
    <Card.Elevated className={styles.card}>
      <Flex mt="$60" alignItems="center" gap="$148" flexDirection="column">
        <Text.Heading>{t('core.nami.migration.updating.heading')}</Text.Heading>
        <Loader />
      </Flex>
    </Card.Elevated>
  );
};
