import { createAccountSettings } from '@lace-contract/account-management';
import { createUICustomisation } from '@lace-lib/util-render';
import React from 'react';

import { AccountSettingCollateral } from '../components/AccountSettingCollateral';
import { extractCardanoPublicExtendedKey } from '../utils/extract-cardano-public-key';

import type { AccountSettingsUICustomisation } from '@lace-contract/account-management';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const getPublicKey = (account: AnyAccount) => {
  try {
    return extractCardanoPublicExtendedKey(account) ?? null;
  } catch {
    return null;
  }
};

const PublicKeysSupplier: AccountSettingsUICustomisation['PublicKeysSupplier'] =
  ({ account, children }) => {
    const publicKey = getPublicKey(account);

    if (!publicKey) return null;
    return children({ type: 'single', value: publicKey });
  };

const accountSettings = () =>
  createUICustomisation<AccountSettingsUICustomisation>({
    key: 'cardano',
    uiCustomisationSelector: ({ blockchainName }) =>
      blockchainName === 'Cardano',
    getAccountSettingsOptions: ({ accountId, walletId }) =>
      createAccountSettings([
        {
          id: 'customize-account',
        },
        {
          id: 'your-keys',
        },
        {
          id: 'collateral',
          component: () => (
            <AccountSettingCollateral
              accountId={accountId}
              walletId={walletId}
            />
          ),
        },
      ]),
    PublicKeysSupplier,
  });

export default accountSettings;
