import { isCardanoCustodyAccount } from '@lace-contract/cardano-context';
import { AccountIdentityKey } from '@lace-contract/wallet-repo';

import type { CardanoAnyAccountProps } from '@lace-contract/cardano-context';
import type { AnyAccount, WalletIdentity } from '@lace-contract/wallet-repo';

const getAccountIdentityKey = (
  account: AnyAccount,
): AccountIdentityKey | undefined => {
  if (account.blockchainName !== 'Cardano') return undefined;
  // The script, not the device key, is the identity: one device key can own
  // many custody accounts and also back an ordinary wallet.
  if (isCardanoCustodyAccount(account)) {
    const { chainId, stakeScriptHash } = account.blockchainSpecific;
    return AccountIdentityKey(
      `cardano-custody:${
        chainId.networkMagic
      }:${stakeScriptHash.toLowerCase()}`,
    );
  }
  const blockchainSpecific =
    account.blockchainSpecific as CardanoAnyAccountProps;
  if (
    'extendedAccountPublicKey' in blockchainSpecific &&
    blockchainSpecific.extendedAccountPublicKey
  ) {
    return AccountIdentityKey(blockchainSpecific.extendedAccountPublicKey);
  }
  return undefined;
};

export const createWalletIdentity = (): WalletIdentity => ({
  blockchainName: 'Cardano',
  getAccountIdentityKey,
});

export default createWalletIdentity;
