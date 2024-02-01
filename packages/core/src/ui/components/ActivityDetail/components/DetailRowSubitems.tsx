import React from 'react';
import styles from './DetailRow.module.scss';

export interface DetailRowSubitems {
  item: string;
  subitem: string;
  dataTestId?: string;
}
export const DetailRowSubitems = ({ item, subitem, dataTestId }: DetailRowSubitems): React.ReactElement => (
  <div className={styles.subitems}>
    <span data-testid={`${dataTestId}-details-item`}>{item}</span>
    <span data-testid={`${dataTestId}-details-subitem`} className={styles.subitem}>
      {subitem}
    </span>
  </div>
);
