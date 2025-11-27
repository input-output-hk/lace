import React from 'react';
import cn from 'classnames';
import Icon from '@ant-design/icons';
import styles from './ErrorPane.module.scss';
import { ReactComponent as ErrorIcon } from '../../assets/icons/warning-icon.component.svg';

export interface ErrorPaneProps {
  error: string;
  className?: string;
}

export const ErrorPane = ({ error, className }: ErrorPaneProps): React.ReactElement => (
  <div data-testid="error-pane" className={cn(styles.error, className)}>
    <Icon className={styles.icon} component={ErrorIcon} />
    {error}
  </div>
);
