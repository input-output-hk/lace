import React from 'react';
import { Image } from 'antd';
import { useTranslation } from 'react-i18next';
import Empty from '../../../../../../assets/icons/empty.svg';
import styles from './StakePoolsTableEmpty.module.scss';

export type StakePoolsTableEmptyProps = {
  title?: string | React.ReactElement;
};

export const StakePoolsTableEmpty = ({ title }: StakePoolsTableEmptyProps): React.ReactElement => {
  const { t: translate } = useTranslation();

  return (
    <div data-testid="stake-pool-table-empty" className={styles.container}>
      <Image data-testid="stake-pool-table-empty-image" preview={false} src={Empty} />
      <div data-testid="stake-pool-table-empty-message" className={styles.text}>
        {title || translate('browserView.staking.stakePoolsTable.emptyMessage')}
      </div>
    </div>
  );
};
