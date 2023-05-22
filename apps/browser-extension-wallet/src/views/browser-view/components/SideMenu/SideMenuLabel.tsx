import styles from './SideMenuLabel.module.scss';
import classnames from 'classnames';
import React, { FC } from 'react';

interface SideMenuLabelProps {
  children: string;
  className?: string;
}

export const SideMenuLabel: FC<SideMenuLabelProps> = ({ children, className }) => (
  // to be able to target this element inside the VerticalNavigationBar.module.scss the concealable-menu-label class needs to be added
  <p className={classnames(styles.text, className, 'concealable-menu-label')}>{children}</p>
);
