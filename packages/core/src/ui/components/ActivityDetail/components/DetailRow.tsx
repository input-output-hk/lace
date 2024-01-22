import React from 'react';
import styles from './DetailRow.module.scss';

type DetailsRowProps = {
  title: string;
  dataTestId?: string;
  details: string[];
};

export const DetailRow = ({ title, details, dataTestId }: DetailsRowProps): React.ReactElement => (
  <div data-testid={dataTestId} className={styles.details}>
    <div className={styles.title}>{title}</div>
    <div className={styles.detail}>
      {details.map((detail, idx) => (
        <span key={`${title}-details-${idx}`}>{detail}</span>
      ))}
    </div>
  </div>
);
