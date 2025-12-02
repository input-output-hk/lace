import React from 'react';
import styles from '../ActivityDetail/TransactionDetails.module.scss';

type DetailProps = {
  title: string;
  titleTestId: string;
  detailTestId: string;
  detail?: string;
};

export const Detail = ({ title, detail, titleTestId, detailTestId }: DetailProps): React.ReactElement => (
  <div className={styles.details}>
    <div className={styles.title} data-testid={titleTestId}>
      {title}
    </div>
    {detail && (
      <div data-testid={detailTestId} className={styles.detail}>
        {detail}
      </div>
    )}
  </div>
);
