import { createAccountSettings } from '@lace-contract/account-management';
import { createUICustomisation } from '@lace-lib/util-render';

import { useLaceSelector } from '../hooks';

import type { AccountSettingsUICustomisation } from '@lace-contract/account-management';
import type { AnyAddress } from '@lace-contract/addresses';

const PublicKeysSupplier: AccountSettingsUICustomisation['PublicKeysSupplier'] =
  ({ account, children }) => {
    const [address] = useLaceSelector(
      'addresses.selectByAccountId',
      account.accountId,
    ) as [AnyAddress | undefined];

    if (!address) return null;
    return children({ type: 'single', value: address.address });
  };

const accountSettings = () =>
  createUICustomisation<AccountSettingsUICustomisation>({
    key: 'bitcoin',
    uiCustomisationSelector: ({ blockchainName }) =>
      blockchainName === 'Bitcoin',
    getAccountSettingsOptions: ({
      accountId: _accountId,
      walletId: _walletId,
    }) =>
      createAccountSettings([
        {
          id: 'customize-account',
        },
        {
          id: 'your-keys',
        },
      ]),
    PublicKeysSupplier,
  });

export default accountSettings;
