import React from 'react';
import { Menu, MenuProps } from 'antd';
import classnames from 'classnames';
import { MenuItemList } from '@utils/constants';
import { SideMenuItemConfig } from '@types';
import { useTranslate } from '@lace/core';
import { SideMenuLabel } from './SideMenuLabel';
import { SideMenuItem } from '@views/browser/components/SideMenu/SideMenuItem';
import styles from './SideMenuContent.module.scss';

export interface SideMenuContentProps {
  menuItems: SideMenuItemConfig[];
  activeItemId: string;
  hoveredItemId: string;
  onClick: MenuProps['onClick'];
  onMouseEnter: (item: MenuItemList) => void;
  onMouseLeave: () => void;
  withLabel?: boolean;
  // required for desktop-specific styling
  menuItemClassName?: string;
}

const getIcon = (item: SideMenuItemConfig, activeItemId: string, hoveredItemId: string) => {
  if (activeItemId === item.path) {
    return item.activeIcon;
  }

  if (hoveredItemId === item.id) {
    return item.hoverIcon;
  }

  return item.regularIcon;
};

export const SideMenuContent = ({
  menuItems,
  activeItemId,
  hoveredItemId,
  onClick,
  onMouseEnter,
  onMouseLeave,
  menuItemClassName,
  withLabel = true
}: SideMenuContentProps): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <Menu data-testid="side-menu" selectedKeys={[activeItemId]} onClick={onClick} mode="inline">
      {menuItems.map((menuItem) => (
        <SideMenuItem
          onMouseEnter={() => onMouseEnter(menuItem.id)}
          onMouseLeave={onMouseLeave}
          data-testid={menuItem.testId}
          key={menuItem.path}
          className={classnames(styles.menuItem, menuItemClassName, { [styles.center]: !withLabel })}
        >
          {React.createElement(getIcon(menuItem, activeItemId, hoveredItemId), {
            className: classnames(styles.icon, menuItem.iconClassName)
          })}
          {withLabel && <SideMenuLabel>{t(menuItem.label)}</SideMenuLabel>}
        </SideMenuItem>
      ))}
    </Menu>
  );
};
