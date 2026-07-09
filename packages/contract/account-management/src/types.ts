import type { ComponentType, ReactElement } from 'react';

import type { TranslationKey } from '@lace-contract/i18n';
import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type {
  AnyAccount,
  WalletId,
  WalletType,
} from '@lace-contract/wallet-repo';
import type { UICustomisation } from '@lace-lib/util-render';
import type { BlockchainName } from '@lace-lib/util-store';

/**
 * Shape of public keys displayed by the account key sheet. Owned here
 * (rather than in `@lace-lib/ui-toolkit`) so this contract stays
 * UI-agnostic per ADR 28.
 */
export type PublicKeys<Key extends string> =
  | {
      type: 'multi';
      value: Array<{ nameTranslationKey: TranslationKey; value: Key }>;
    }
  | {
      type: 'single';
      value: Key;
    };

export type AccountSettingsOption = {
  id: string;
  component?: ComponentType<{ accountId: string; walletId: string }>;
};

export const createAccountSettings = (
  options: AccountSettingsOption[],
): AccountSettingsOption[] => options;

export type AccountSettingsUICustomisation = UICustomisation<
  {
    getAccountSettingsOptions: (params: {
      accountId: string;
      walletId: string;
    }) => AccountSettingsOption[];
    PublicKeysSupplier?: ComponentType<{
      account: AnyAccount;
      children: <Key extends string>(
        publicKeys: PublicKeys<Key>,
      ) => ReactElement;
    }>;
  },
  {
    blockchainName: BlockchainName;
  }
>;

export type AccountCenterWalletsUICustomisation = UICustomisation<{
  Wallets: ComponentType;
}>;

// Wallet settings item can be either just an ID or ID with custom component
export type WalletSettingsItem =
  | string
  | {
      id: string;
      component: ComponentType<{ walletId: WalletId }>;
    };

export type WalletSettingsUICustomisation = UICustomisation<
  {
    settings: WalletSettingsItem[]; // List of settings to render in order
  },
  { walletType: WalletType }
>;

export type AddAccount = InMemoryWalletIntegration['createAccounts'];
