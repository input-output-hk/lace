import styles from './SideMenuLabel.module.scss';
import classnames from 'classnames';
import React, { FC, forwardRef } from 'react';

interface SideMenuLabelProps {
  children: string;
  className?: string;
  ref?: React.Ref<HTMLParagraphElement>;
}

export const SideMenuLabel: FC<SideMenuLabelProps> = forwardRef(({ children, className }, ref) => (
  <p ref={ref} className={classnames(styles.text, className)}>
    {children}
  </p>
));
