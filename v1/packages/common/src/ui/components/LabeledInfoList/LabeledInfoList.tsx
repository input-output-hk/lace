import React from 'react';
import styles from './LabeledInfoList.module.scss';

export interface LabeledInfo {
  name: string;
  value: string;
}

export interface LabeledInfoListProps {
  items: LabeledInfo[];
}

export const LabeledInfoList = ({ items }: LabeledInfoListProps): React.ReactElement => (
  <div className={styles.labeledInfoList}>
    {items.map(({ name, value }, index) => (
      <div key={index} className={styles.labeledInfo}>
        <h5>{name}</h5>
        <p>{value}</p>
      </div>
    ))}
  </div>
);
