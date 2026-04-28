import { getAccountIndex } from '@lace-contract/account-management';

import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type { HwBlockchainSupport } from '@lace-contract/onboarding-v2';
import type { AnyAccount, WalletType } from '@lace-contract/wallet-repo';
import type { BlockchainName } from '@lace-lib/util-store';

export const MAX_ACCOUNT_INDEX = 49;

/**
 * Translation keys for the Add Account feature
 */
export const TRANSLATION_KEYS = {
  title: 'v2.account-details.add-account.title',
  description: 'v2.account-details.add-account.description',
  nameInputLabel: 'v2.account-details.add-account.name-input-label',
  buttonPrimary: 'v2.account-details.add-account.button.primary',
  buttonCancel: 'v2.account-details.add-account.button.cancel',
  appearanceStatic: 'v2.account-details.add-account.appearance.static',
  appearanceAnimated: 'v2.account-details.add-account.appearance.animated',
  appearanceFeatured: 'v2.account-details.add-account.appearance.featured',
  appearanceLabel: 'v2.account-details.add-account.appearance.label',
  walletLabel: 'v2.account-details.add-account.wallet-label',
  authConfirmButton: 'v2.account-management.addAccount',
  authMessage: 'authentication-prompt.message.add-account',
  hwDescription: 'v2.account-details.add-account.hw.connect-instruction',
  allIndicesUsedMessage: 'v2.account-details.add-account.all-indices-used',
  accountIndexItemUsed:
    'v2.account-details.add-account.account-index-item-used',
} as const;

export const SUPPORTED_ACCOUNT_BLOCKCHAINS = [
  'Bitcoin',
  'Cardano',
  'Midnight',
] as const satisfies readonly BlockchainName[];

export const formatAccountIndex = (index: number): string =>
  `#${index.toString().padStart(3, '0')}`;

export const withInUseSuffix = (text: string, usedLabel: string): string =>
  `${text} ${usedLabel}`;

export const formatUsedAccountIndex = (
  index: number,
  usedLabel: string,
): string => withInUseSuffix(formatAccountIndex(index), usedLabel);

export const getAccountIndexText = (
  index: number,
  usedIndices: Set<number>,
  usedLabel: string,
): string => {
  return usedIndices.has(index)
    ? formatUsedAccountIndex(index, usedLabel)
    : formatAccountIndex(index);
};

export const generateAccountIndexDropdownItems = (
  usedIndices: Set<number>,
  usedLabel: string,
): Array<{ id: string; text: string; value: number; disabled?: boolean }> =>
  Array.from({ length: MAX_ACCOUNT_INDEX + 1 }, (_, index) => index).map(
    index => ({
      id: index.toString(),
      text: getAccountIndexText(index, usedIndices, usedLabel),
      value: index,
      disabled: usedIndices.has(index),
    }),
  );

/**
 * Calculates the next available account index from the used indices
 * Returns undefined if all indices are used
 */
export const calculateNextAccountIndex = (usedIndices: Set<number>) => {
  for (let index = 0; index <= MAX_ACCOUNT_INDEX; index++) {
    if (!usedIndices.has(index)) return index;
  }
  return undefined;
};

/**
 * Gets the set of used account indices for a specific blockchain
 */
export const getUsedAccountIndices = (accounts: AnyAccount[]) =>
  new Set(accounts.map(getAccountIndex));

/**
 * Returns all available blockchains from loaded in-memory wallet integrations.
 * This allows adding accounts for any supported blockchain, regardless of
 * which blockchains were selected during wallet onboarding.
 */
export const getAvailableBlockchainOptions = (
  loadedInMemoryWalletIntegrations: InMemoryWalletIntegration[] | undefined,
): BlockchainName[] => {
  if (!loadedInMemoryWalletIntegrations) {
    return [];
  }

  return loadedInMemoryWalletIntegrations.map(
    integration => integration.blockchainName,
  );
};

/**
 * Returns unique supported blockchains for a given hardware wallet type,
 * resolved dynamically from loaded HW blockchain support addons.
 */
export const getHwBlockchainOptions = (
  hwBlockchainSupport: HwBlockchainSupport[][] | undefined,
  walletType: WalletType | undefined,
): BlockchainName[] => {
  if (!hwBlockchainSupport || !walletType) return [];
  const blockchains = hwBlockchainSupport
    .flat()
    .filter(s => s.walletType === walletType)
    .map(s => s.blockchainName);
  return [...new Set(blockchains)];
};

/**
 * Validates if the account form can be submitted
 */
export const isAccountFormValid = (
  accountName: string,
  selectedBlockchain: BlockchainName,
  blockchainOptions: BlockchainName[],
): boolean => {
  return (
    accountName.trim() !== '' && blockchainOptions.includes(selectedBlockchain)
  );
};

/**
 * Creates the authentication prompt configuration for adding an account
 */
export const createAuthenticationConfig = () => ({
  cancellable: true,
  confirmButtonLabel: TRANSLATION_KEYS.authConfirmButton,
  message: TRANSLATION_KEYS.authMessage,
});
