import React from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import styles from '../ActivityDetail/TransactionDetails.module.scss';

type TimestampProps = {
  includedDate?: string;
  includedTime?: string;
};

export const Timestamp = ({ includedDate, includedTime }: TimestampProps): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div data-testid="tx-date" className={cn(styles.details, styles.timestampContainer)}>
      <div className={cn(styles.title, styles.timestamp)} data-testid="tx-timestamp-title">
        {t('core.activityDetails.timestamp')}
      </div>
      <div data-testid="tx-timestamp" className={styles.detail}>
        <span>{includedDate}</span>
        <span>&nbsp;{includedTime}</span>
      </div>
    </div>
  );
};
