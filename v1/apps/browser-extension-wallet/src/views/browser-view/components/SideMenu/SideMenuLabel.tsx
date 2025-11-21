import styles from './SideMenuLabel.module.scss';
import classnames from 'classnames';
import React, { FC } from 'react';

interface SideMenuLabelProps {
  children: string;
  className?: string;
}

export const SideMenuLabel: FC<SideMenuLabelProps> = ({ children, className }) => (
  <p className={classnames(styles.text, className)}>{children}</p>
);
