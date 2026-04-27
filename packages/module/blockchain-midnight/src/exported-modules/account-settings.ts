import { createAccountSettings } from '@lace-contract/account-management';
import { createUICustomisation } from '@lace-lib/util-render';

import { PublicKeysSupplier } from '../components/AccountSettingsPublicKeysSupplier';

import type { AccountSettingsUICustomisation } from '@lace-contract/account-management';

const accountSettings = () =>
  createUICustomisation<AccountSettingsUICustomisation>({
    key: 'midnight',
    uiCustomisationSelector: ({ blockchainName }) =>
      blockchainName === 'Midnight',
    getAccountSettingsOptions: ({
      accountId: _accountId,
      walletId: _walletId,
    }) =>
      createAccountSettings([
        {
          id: 'your-keys',
        },
      ]),
    PublicKeysSupplier,
  });

export default accountSettings;
