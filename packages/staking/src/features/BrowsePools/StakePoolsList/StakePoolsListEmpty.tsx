import { Flex, Text } from '@lace/ui';
import React from 'react';
import { useTranslation } from 'react-i18next';
import Empty from '../../../assets/images/empty.svg';
import * as styles from './StakePoolsListEmpty.css';

export type StakePoolsListEmptyProps = {
  title?: string | React.ReactElement;
};

export const StakePoolsListEmpty = ({ title }: StakePoolsListEmptyProps): React.ReactElement => {
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
    >
      <Empty data-testid="stake-pool-table-empty-image" className={styles.icon} />
      <Text.Body.Small className={styles.text} weight="$medium" data-testid="stake-pool-table-empty-message">
        {title || t('browsePools.stakePoolTableBrowser.emptyMessage')}
      </Text.Body.Small>
    </Flex>
  );
};
