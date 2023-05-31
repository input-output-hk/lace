import React from 'react';
import styles from './EducationalList.module.scss';
import { EducationalListRowProps, EducationalListRow } from './EducationalListRow';

export interface EducationalListProps {
  items: Array<EducationalListRowProps>;
  title?: string | React.ReactNode;
}

export const EducationalList = ({ items, title }: EducationalListProps): React.ReactElement => {
  const header =
    typeof title === 'string' ? (
      <h1 className={styles.title} data-testid="educational-list-title">
        {title}
      </h1>
    ) : (
      title
    );
  return (
    <div className={styles.listContainer} data-testid="educational-list">
      {header}
      {items.map((row, idx) => (
        <EducationalListRow key={`${row.title}-${idx}`} {...row} />
      ))}
    </div>
  );
};
