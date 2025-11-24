import React from 'react';
import TrashIcon from '../../../../../../assets/icons/trash-icon.component.svg';
import styles from './FormRowHeader.module.scss';
import { Button } from '@lace/common';

export interface FormRowHeaderProps {
  title: string;
  onDeleteRow: () => void;
}

export const FormRowHeader = ({ title, onDeleteRow }: FormRowHeaderProps): React.ReactElement => (
  <div className={styles.rowHeader}>
    <div className={styles.rowHeaderTitle}>
      <h5 className={styles.title} data-testid="asset-bundle-title">
        {title}
      </h5>
    </div>

    <div className={styles.actionsContainer}>
      <Button
        className={styles.removeBtn}
        onClick={onDeleteRow}
        variant="outlined"
        color="secondary"
        icon={<TrashIcon className={styles.icon} />}
        data-testid="asset-bundle-remove-button"
      />
    </div>
  </div>
);
