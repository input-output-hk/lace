import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { Icon } from '@lace-lib/ui-toolkit';
import React from 'react';

import type { AvailableAddons } from '..';
import type { TabMenuItems } from '@lace-contract/app';
import type { ContextualLaceInit } from '@lace-contract/module';

const tabMenuItems: ContextualLaceInit<TabMenuItems, AvailableAddons> = () => ({
  menuItems: [
    {
      id: 'tab-menu-item-buy',
      action: () => {
        NavigationControls.sheets.navigate(SheetRoutes.Buy);
      },
      icons: {
        Active: () => <Icon name="Plus" />,
        Hovered: () => <Icon name="Plus" />,
        Normal: () => <Icon name="Plus" />,
      },
      label: 'v2.menu.buy',
      type: 'navigation-action',
    },
    {
      id: 'tab-menu-item-send',
      action: () => {
        NavigationControls.sheets.navigate(SheetRoutes.Send);
      },
      icons: {
        Active: () => <Icon name="ArrowUp" />,
        Hovered: () => <Icon name="ArrowUp" />,
        Normal: () => <Icon name="ArrowUp" />,
      },
      label: 'v2.menu.send',
      type: 'navigation-action',
    },
    {
      id: 'tab-menu-item-receive',
      action: () => {
        NavigationControls.sheets.navigate(SheetRoutes.Receive);
      },
      icons: {
        Active: () => <Icon name="ArrowDown" />,
        Hovered: () => <Icon name="ArrowDown" />,
        Normal: () => <Icon name="ArrowDown" />,
      },
      label: 'v2.menu.receive',
      type: 'navigation-action',
    },
  ],
});

export default tabMenuItems;
