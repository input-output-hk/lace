import { Flex, Text } from '@lace/ui';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_POOLS_COUNT } from '../store/delegationPortfolio';
import styles from './GetStartedSteps.module.scss';

export const GetStartedSteps = (): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <Flex flexDirection="column" gap="$32">
      <Text.Heading>{t('overview.noStaking.getStarted')}</Text.Heading>
      <Text.Body.Normal>{t('overview.noStaking.followSteps')}</Text.Body.Normal>
      <Flex flexDirection="column" gap="$32">
        <ol className={styles.stepsList}>
          <li className={styles.stepItem}>{t('overview.noStaking.searchForPool')}</li>
          <li className={styles.stepItem}>{t('overview.noStaking.selectPools', { maxPools: MAX_POOLS_COUNT })}</li>
        </ol>
      </Flex>
    </Flex>
  );
};
