import { Cip1852ExtendedAccountPublicKey } from '@lace-contract/cardano-context';

import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { CardanoAnyAccountProps } from '@lace-contract/cardano-context';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const isCardanoAccount = (
  account: AnyAccount,
): account is AnyAccount & {
  blockchainName: 'Cardano';
  blockchainSpecific: CardanoAnyAccountProps;
} => account.blockchainName === 'Cardano';

const hasBip32ExtendedKey = (
  blockchainSpecific: CardanoAnyAccountProps,
): blockchainSpecific is CardanoAnyAccountProps & {
  extendedAccountPublicKey: Bip32PublicKeyHex;
} =>
  'extendedAccountPublicKey' in blockchainSpecific &&
  blockchainSpecific.extendedAccountPublicKey !== undefined;

export const extractCardanoPublicExtendedKey = (
  account: AnyAccount,
): Cip1852ExtendedAccountPublicKey | undefined => {
  if (!isCardanoAccount(account)) {
    throw new Error(`Unsupported blockchain: ${account.blockchainName}`);
  }

  const { blockchainSpecific } = account;

  if (hasBip32ExtendedKey(blockchainSpecific)) {
    return Cip1852ExtendedAccountPublicKey.fromBip32PublicKeyHex(
      blockchainSpecific.extendedAccountPublicKey,
    );
  }

  return undefined;
};
