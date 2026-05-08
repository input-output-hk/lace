import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { createUICustomisation } from '@lace-lib/util-render';

import type { SettingsPageUICustomisation } from '@lace-contract/app';

const settingsPageUICustomisation = () =>
  createUICustomisation<SettingsPageUICustomisation>({
    key: 'app-lock-sources',
    SettingsOptions: [
      {
        id: 'app-lock-sources-settings',
        titleKey: 'v2.app-lock.sources.title',
        icon: 'LockKey',
        onPress: () => {
          NavigationControls.sheets.navigate(SheetRoutes.LockSettings);
        },
      },
    ],
  });

export default settingsPageUICustomisation;
