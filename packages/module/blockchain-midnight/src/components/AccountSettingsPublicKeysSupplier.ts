import { useLaceSelector } from '../hooks';

import type { AccountSettingsUICustomisation } from '@lace-contract/account-management';
import type { MidnightAccountId } from '@lace-contract/midnight-context';

export const PublicKeysSupplier: AccountSettingsUICustomisation['PublicKeysSupplier'] =
  ({ account, children }) => {
    const publicKeys = useLaceSelector(
      'midnightContext.selectPublicKeysByAccountId',
      account.accountId as MidnightAccountId,
    );

    if (!publicKeys) return null;
    return children({
      type: 'multi',
      value: [
        {
          nameTranslationKey:
            'v2.account-settings.your-keys.encryption-public-key',
          value: publicKeys.encryption,
        },
        {
          nameTranslationKey: 'v2.account-settings.your-keys.coin-public-key',
          value: publicKeys.coin,
        },
      ],
    });
  };
