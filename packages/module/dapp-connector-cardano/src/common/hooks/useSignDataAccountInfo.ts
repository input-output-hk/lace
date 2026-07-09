import { useMemo } from 'react';

import { useLaceSelector } from './storeHooks';

import type { SignDataAccountInfo } from '../types/sign-data-account';

/**
 * Resolves account info for the Sign Data UI from the per-dApp session mapping.
 * Returns undefined when the origin has no session entry or the account is not
 * found in the active network accounts.
 *
 * `name` here is the raw account name — no concatenated "[At risk]" suffix.
 * The compromise indicator surfaces via `<AccountSecurityAlertInline>` in the
 * SignDataContent JSX, keyed off `accountId`.
 */
export const useSignDataAccountInfo = (
  dappOrigin?: string,
): SignDataAccountInfo | undefined => {
  const allAccounts = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const sessionAccountByOrigin = useLaceSelector(
    'cardanoDappConnector.selectSessionAccountByOrigin',
  );

  return useMemo((): SignDataAccountInfo | undefined => {
    if (!dappOrigin) return undefined;
    const accountId = sessionAccountByOrigin[dappOrigin];
    if (!accountId) return undefined;
    const account = allAccounts.find(a => a.accountId === accountId);
    if (!account) return undefined;
    return {
      name: account.metadata.name,
      avatarUri: account.metadata.avatarUri,
      accountId: account.accountId,
    };
  }, [dappOrigin, allAccounts, sessionAccountByOrigin]);
};
