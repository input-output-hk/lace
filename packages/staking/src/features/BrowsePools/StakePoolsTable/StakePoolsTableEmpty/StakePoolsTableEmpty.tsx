import React from 'react';
import { useTranslation } from 'react-i18next';
import Empty from '../../../../assets/images/empty.svg';
import * as styles from './StakePoolsTableEmpty.css';

export type StakePoolsTableEmptyProps = {
  title?: string | React.ReactElement;
};

export const StakePoolsTableEmpty = ({ title }: StakePoolsTableEmptyProps): React.ReactElement => {
  const { t: translate } = useTranslation();

  return (
    <div data-testid="stake-pool-table-empty" className={styles.container}>
      <Empty data-testid="stake-pool-table-empty-image" className={styles.icon} />
      <div data-testid="stake-pool-table-empty-message" className={styles.text}>
        {title || translate('browsePools.stakePoolTableBrowser.emptyMessage')}
      </div>
    </div>
  );
};
