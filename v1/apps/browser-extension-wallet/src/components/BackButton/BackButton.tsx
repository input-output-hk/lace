import React from 'react';
import { Button } from '@lace/common';
import styles from './BackButton.module.scss';
import arrowBack from '../../assets/icons/back-icon.svg';

export interface BackButtonProps {
  label: string;
  onBackClick: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  dataTestid?: string;
}

export const BackButton = ({
  label = 'Back',
  onBackClick,
  dataTestid = 'back-btn'
}: BackButtonProps): React.ReactElement => (
  <div data-testid="receive-toolbar" className={styles.BackButtonContainer}>
    <Button data-testid={dataTestid} onClick={onBackClick}>
      {label}
      <img className={styles.icon} src={arrowBack} />
    </Button>
  </div>
);
