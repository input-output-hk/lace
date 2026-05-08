import { isSidePanelApiAvailable } from '@lace-contract/views';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { createUICustomisation } from '@lace-lib/util-render';

import type { SettingsPageUICustomisation } from '@lace-contract/app';

const settingsPageUICustomisation = () =>
  createUICustomisation<SettingsPageUICustomisation>({
    key: 'views-extension-default-open-mode',
    // Hide the entry on hosts that don't ship `chrome.sidePanel` (older
    // Chromium forks that silently ignore the required permission).
    // Switching modes is meaningless when only one mode is usable.
    SettingsOptions: isSidePanelApiAvailable()
      ? [
          {
            id: 'default-view-mode',
            titleKey: 'v2.pages.settings.options.default-view-mode',
            icon: 'ArrowExpand',
            onPress: () => {
              NavigationControls.sheets.navigate(SheetRoutes.DefaultOpenMode);
            },
          },
        ]
      : [],
  });

export default settingsPageUICustomisation;
