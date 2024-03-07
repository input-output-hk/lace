/* eslint-disable no-magic-numbers */
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

// TODO: add proper data mappers, eg: strings, urls, elements, arrays etc
export const DetailRow = ({ title, info, details, dataTestId }: DetailsRowProps): React.ReactElement => (
  <div data-testid={dataTestId} className={styles.details}>
    <div className={styles.title}>
      {title}
      {info && <InfoItem title={info} />}
    </div>
    <div className={styles.detail}>
      {details.map((detail, idx) => (
        <span key={`${title}-details-${idx}`}>
          {typeof detail === 'string' && detail}
          {typeof detail === 'object' &&
            (detail.length === 2 ? <DetailRowSubitems item={detail[0]} subitem={detail[1]} /> : detail)}
        </span>
      ))}
    </div>
  </div>
);
