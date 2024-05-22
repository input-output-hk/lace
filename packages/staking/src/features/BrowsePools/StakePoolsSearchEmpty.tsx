import { Flex, Text } from '@lace/ui';
import React from 'react';
import { useTranslation } from 'react-i18next';
import Empty from '../../assets/images/empty.svg';
import * as styles from './StakePoolsSearchEmpty.css';

export const StakePoolsSearchEmpty = (): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Flex
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      mt="$40"
      h="$fill"
      w="$fill"
      data-testid="stake-pool-table-empty"
      className={styles.wrapper}
    >
      <Empty data-testid="stake-pool-table-empty-image" className={styles.icon} />
      <Text.Body.Small className={styles.text} weight="$medium" data-testid="stake-pool-table-empty-message">
        {t('browsePools.stakePoolTableBrowser.emptyMessage')}
      </Text.Body.Small>
    </Flex>
  );
};
