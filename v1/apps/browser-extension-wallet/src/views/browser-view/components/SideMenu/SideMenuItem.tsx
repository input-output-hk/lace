import React, { FC } from 'react';
import classnames from 'classnames';
import styles from './SideMenuItem.module.scss';
import { Menu, MenuItemProps } from 'antd';

export const SideMenuItem: FC<MenuItemProps> = ({ className, ...restProps }) => (
  <Menu.Item {...restProps} className={classnames(styles.menuItem, className)} />
);
