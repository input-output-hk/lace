import React from 'react';
import styles from './DetailRow.module.scss';

type CertificateTypeNameProps = {
  title: string;
  details: string[];
};

export const DetailRow = ({ title, details }: CertificateTypeNameProps): React.ReactElement => (
  <div className={styles.details}>
    <div className={styles.title}>{title}</div>
    <div className={styles.detail}>
      {details.map((detail, idx) => (
        <span key={`${title}-details-${idx}`}>{detail}</span>
      ))}
    </div>
  </div>
);
