import { createUICustomisation } from '@lace-lib/util-render';

import { openWizardRef } from '../open-wizard-ref';

import type { SettingsPageUICustomisation } from '@lace-contract/app';

const settingsPageUICustomisation = () =>
  createUICustomisation<SettingsPageUICustomisation>({
    key: 'migrate-wallet',
    SettingsOptions: [
      {
        id: 'migrate-wallet',
        titleKey: 'migrate-wallet.settings.title',
        icon: 'ArrowTurnForward',
        onPress: () => {
          openWizardRef.current?.('settings');
        },
      },
    ],
  });

export default settingsPageUICustomisation;
