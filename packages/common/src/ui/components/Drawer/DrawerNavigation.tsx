import React from 'react';
import styles from './DrawerNavigation.module.scss';
import { NavigationButton } from '../NavigationButton';

export interface DrawerNavigationProps {
  title?: string | React.ReactElement;
  onArrowIconClick?: () => void;
  onCloseIconClick?: () => void;
  leftActions?: string | React.ReactElement;
  rightActions?: string | React.ReactElement;
}

export const DrawerNavigation = ({
  onArrowIconClick,
  onCloseIconClick,
  leftActions,
  rightActions,
  title
}: DrawerNavigationProps): React.ReactElement => (
  <div data-testid="drawer-navigation" className={styles.navigation}>
    {leftActions || <div>{onArrowIconClick && <NavigationButton icon="arrow" onClick={onArrowIconClick} />}</div>}
    {title && (
      <div data-testid="drawer-navigation-title" className={styles.title}>
        {title}
      </div>
    )}
    {rightActions || <div>{onCloseIconClick && <NavigationButton icon="cross" onClick={onCloseIconClick} />}</div>}
  </div>
);
