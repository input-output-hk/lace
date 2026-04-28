import { useMemo } from 'react';

import { useUICustomisation } from './useUICustomisation';

export interface AccountWithBlockchain {
  blockchainName: string;
}

export interface UseAccountSupportsNftsOptions {
  accounts: AccountWithBlockchain[];
}

export interface UseAccountSupportsNftsResult {
  /** Check if a specific account supports NFTs */
  accountSupportsNfts: (account: AccountWithBlockchain) => boolean;
  /** Whether ANY account in the list supports NFTs */
  hasAnyAccountNftSupport: boolean;
}

/**
 * Hook to determine NFT support based on account blockchain customizations.
 *
 * Checks UI customizations loaded via addons to determine whether specific
 * blockchains support NFTs. Blockchains like Midnight may disable NFT
 * functionality through their UI customization configuration.
 *
 * @param options.accounts - Array of accounts to check for NFT support
 *
 * @returns
 * - `accountSupportsNfts`: Checks if a specific account's blockchain supports NFTs.
 *   Returns true if no matching customization is found (default behavior).
 * - `hasAnyAccountNftSupport`: Whether any account in the list supports NFTs.
 */
export const useAccountSupportsNfts = (
  options: UseAccountSupportsNftsOptions,
): UseAccountSupportsNftsResult => {
  const { accounts } = options;
  const accountUICustomisations = useUICustomisation(
    'addons.loadAccountUICustomisations',
  );

  const accountSupportsNfts = useMemo(
    () =>
      (account: AccountWithBlockchain): boolean => {
        const customisation = accountUICustomisations.find(c =>
          c.uiCustomisationSelector({ blockchainName: account.blockchainName }),
        );
        return customisation?.supportsNfts ?? true;
      },
    [accountUICustomisations],
  );

  const hasAnyAccountNftSupport = useMemo(
    () => accounts.some(account => accountSupportsNfts(account)),
    [accounts, accountSupportsNfts],
  );

  return { accountSupportsNfts, hasAnyAccountNftSupport };
};
