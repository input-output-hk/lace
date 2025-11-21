import React from 'react';
import styles from './InsufficientFundsWarning.module.scss';
import { ReactComponent as WarningIcon } from '../../assets/icons/warning-icon.component.svg';
import Icon from '@ant-design/icons';

export interface DappTransactionProps {
  translations: string;
}

export const InsufficientFundsWarning = ({ translations }: DappTransactionProps): React.ReactElement => (
  <div className={styles.warningAlert}>
    <Icon component={WarningIcon} />
    <p>{translations}</p>
  </div>
);
