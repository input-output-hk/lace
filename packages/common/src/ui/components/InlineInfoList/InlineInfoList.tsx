import React from 'react';
import styles from './InlineInfoList.module.scss';

interface InlineInfo {
  name: string;
  value: string;
}

export interface InlineInfoListProps {
  items: InlineInfo[];
}

export const InlineInfoList = ({ items }: InlineInfoListProps): React.ReactElement => (
  <div data-testid="info-list" className={styles.inlineInfoList}>
    {items.map(({ name, value }, index) => (
      <div data-testid="info-list-item" key={index} className={styles.inlineInfo}>
        <p data-testid="info-list-item-key" className={styles.name}>
          {`${name.slice(0, 1).toUpperCase()}${name.slice(1)}`}
        </p>
        <h5 data-testid="info-list-item-value" className={styles.value}>
          {value}
        </h5>
      </div>
    ))}
  </div>
);
