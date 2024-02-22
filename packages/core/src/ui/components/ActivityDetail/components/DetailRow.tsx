import React from 'react';
import styles from './DetailRow.module.scss';
import { DetailRowSubitems } from './DetailRowSubitems';
import { InfoItem } from './InfoItem';

type DetailsRowProps = {
  title: string;
  info?: string;
  dataTestId?: string;
  details: (string | [string, string])[];
};

export const DetailRow = ({ title, info, details, dataTestId }: DetailsRowProps): React.ReactElement => (
  <div data-testid={dataTestId} className={styles.details}>
    <div className={styles.title}>
      {title}
      {info && <InfoItem title={info} />}
    </div>
    <div className={styles.detail}>
      {details.map((detail, idx) => (
        <span key={`${title}-details-${idx}`}>
          {typeof detail === 'string' ? detail : <DetailRowSubitems item={detail[0]} subitem={detail[1]} />}
        </span>
      ))}
    </div>
  </div>
);
