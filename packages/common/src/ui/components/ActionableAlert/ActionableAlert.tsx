import React from 'react';
import { Button } from '../Button';
import styles from './ActionableAlert.module.scss';
import { ReactComponent as AlertIcon } from '../../assets/icons/alert.component.svg';

export interface ActionableAlertProps {
  message: string;
  actionText: string;
  onClick: () => void;
}

export const ActionableAlert = ({ message, actionText, onClick }: ActionableAlertProps): React.ReactElement => (
  <div className={styles.actionableAlert}>
    <AlertIcon className={styles.icon} />
    <div className={styles.message}>{message}</div>
    <div>
      <Button onClick={onClick}>{actionText}</Button>
    </div>
  </div>
);
