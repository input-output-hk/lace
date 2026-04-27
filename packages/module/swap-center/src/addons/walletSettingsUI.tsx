import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { createUICustomisation } from '@lace-lib/util-render';

import type { SettingsPageUICustomisation } from '@lace-contract/app';

const settingsPageUICustomisation = () =>
  createUICustomisation<SettingsPageUICustomisation>({
    key: 'liquidity-sources',
    SettingsOptions: [
      {
        id: 'liquidity-sources-settings',
        titleKey: 'v2.swap.liquidity-sources.settings-title',
        icon: 'FlowConnection',
        onPress: () => {
          NavigationControls.sheets.navigate(SheetRoutes.SwapLiquiditySources);
        },
      },
    ],
  });

export default settingsPageUICustomisation;
