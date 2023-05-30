import { MenuItemList } from '@utils/constants';
import { SVGFactory } from 'react';

export interface SideMenuItemConfig {
  id: MenuItemList;
  label: string;
  testId: string;
  path: string;
  regularIcon: SVGFactory;
  hoverIcon: SVGFactory;
  activeIcon: SVGFactory;
  iconClassName?: string;
}
