import { MenuItemList } from '@utils/constants';
import { FC, SVGProps } from 'react';

export interface SideMenuItemConfig {
  id: MenuItemList;
  label: string;
  testId: string;
  path: string;
  regularIcon: FC<SVGProps<SVGSVGElement>>;
  hoverIcon: FC<SVGProps<SVGSVGElement>>;
  activeIcon: FC<SVGProps<SVGSVGElement>>;
  iconClassName?: string;
}
