import { createAccountSettings } from '@lace-contract/account-management';
import { AccountId } from '@lace-contract/wallet-repo';
import { createUICustomisation } from '@lace-lib/util-render';
import React from 'react';

import { PublicKeysSupplier } from '../components/AccountSettingsPublicKeysSupplier';
import { ResetSyncStateRow } from '../components/ResetSyncStateRow';

import type { AccountSettingsUICustomisation } from '@lace-contract/account-management';

const accountSettings = () =>
  createUICustomisation<AccountSettingsUICustomisation>({
    key: 'midnight',
    uiCustomisationSelector: ({ blockchainName }) =>
      blockchainName === 'Midnight',
    getAccountSettingsOptions: ({ accountId }) =>
      createAccountSettings([
        {
          id: 'customize-account',
        },
        {
          id: 'your-keys',
        },
        {
          id: 'reset-sync-state',
          component: () => (
            <ResetSyncStateRow accountId={AccountId(accountId)} />
          ),
        },
      ]),
    PublicKeysSupplier,
  });

export default accountSettings;
