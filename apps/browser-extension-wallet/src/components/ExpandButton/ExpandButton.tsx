import React from 'react';
import ExpandIcon from '../../assets/icons/expand.component.svg';

import styles from './ExpandButton.module.scss';

export const ExpandButton = ({ label, onClick }: { label: string; onClick: () => void }): React.ReactElement => (
  <a onClick={onClick} href="#" className={styles.button} data-testid="expand-button">
    <ExpandIcon className={styles.icon} />
    <span className={styles.text}>{label}</span>
  </a>
);
