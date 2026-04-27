import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { createUICustomisation } from '@lace-lib/util-render';

import type { SettingsPageUICustomisation } from '@lace-contract/app';

const settingsPageUICustomisation = () =>
  createUICustomisation<SettingsPageUICustomisation>({
    key: 'midnight',
    SettingsOptions: [
      {
        id: 'midnight',
        titleKey: 'v2.pages.settings.options.midnight',
        icon: 'Midnight',
        onPress: () => {
          NavigationControls.sheets.navigate(SheetRoutes.MidnightSettings);
        },
      },
    ],
  });

export default settingsPageUICustomisation;
