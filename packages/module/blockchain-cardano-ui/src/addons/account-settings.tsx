import { createAccountSettings } from '@lace-contract/account-management';
import { AccountId } from '@lace-contract/wallet-repo';
import { createUICustomisation } from '@lace-lib/util-render';
import React from 'react';

import { AccountSettingCollateral } from '../components/AccountSettingCollateral';
import { HdWalletSyncRow } from '../pages/AccountSettings/HdWalletSyncRow';
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
        {
          id: 'hd-wallet-sync',
          component: () => <HdWalletSyncRow accountId={AccountId(accountId)} />,
        },
      ]),
    PublicKeysSupplier,
  });

export default accountSettings;
