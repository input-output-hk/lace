import { createAccountSettings } from '@lace-contract/account-management';
import {
  BitcoinNetworkId,
  bitcoinExtendedPublicKeyForNetwork,
} from '@lace-contract/bitcoin-context';
import { createUICustomisation } from '@lace-lib/util-render';

import type { AccountSettingsUICustomisation } from '@lace-contract/account-management';
import type { BitcoinAnyAccountProps } from '@lace-contract/bitcoin-context';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const isBitcoinAccount = (
  account: AnyAccount,
): account is AnyAccount & {
  blockchainName: 'Bitcoin';
  blockchainSpecific: BitcoinAnyAccountProps;
} => account.blockchainName === 'Bitcoin';

// Stored keys are not consistently serialized for the account's network
// (in-memory: always 'xpub...'; hardware: the device serialization), so the
// displayed key is normalized to the account's network. Normalization is
// best-effort: on an unresolvable network or unparseable key the raw stored
// key is shown instead, because returning nothing renders the Your Keys
// sheet completely blank (AccountKey only renders inside children).
const resolveDisplayKey = (
  account: AnyAccount & { blockchainSpecific: BitcoinAnyAccountProps },
): string | undefined => {
  const xpub =
    account.blockchainSpecific.extendedAccountPublicKeys?.nativeSegWit;
  if (!xpub) return undefined;
  const network = BitcoinNetworkId.getBitcoinNetwork(
    account.blockchainNetworkId,
  );
  if (!network) return xpub;
  try {
    return bitcoinExtendedPublicKeyForNetwork(xpub, network);
  } catch {
    return xpub;
  }
};

const PublicKeysSupplier: AccountSettingsUICustomisation['PublicKeysSupplier'] =
  ({ account, children }) => {
    if (!isBitcoinAccount(account)) return null;

    const xpub = resolveDisplayKey(account);
    if (!xpub) return null;

    return children({ type: 'single', value: xpub });
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
