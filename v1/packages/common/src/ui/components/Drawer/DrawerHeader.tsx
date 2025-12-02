import React from 'react';
import cn from 'classnames';
import styles from './DrawerHeader.module.scss';

export interface DrawerHeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  popupView?: boolean;
}

export const DrawerHeader = ({ title, subtitle, popupView }: DrawerHeaderProps): React.ReactElement => (
  <>
    {title && (
      <div
        data-testid="drawer-header-title"
        className={cn({ [styles.title]: typeof title === 'string', [styles.popupView]: popupView })}
      >
        {title}
      </div>
    )}
    {subtitle && (
      <div className={cn(styles.subtitle, { [styles.popupView]: popupView })} data-testid="drawer-header-subtitle">
        {subtitle}
      </div>
    )}
  </>
);
