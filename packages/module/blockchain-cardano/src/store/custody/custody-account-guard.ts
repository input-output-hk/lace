import { Cardano } from '@cardano-sdk/core';
import { classifyCustodyAddress } from '@lace-lib/cardano-custody';

import type { AnyAddress } from '@lace-contract/addresses';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * An ordinary builder was asked to spend from a Cardano custody account.
 * Its UTxOs are locked by the custody script, and a key-signed build would
 * be one the chain refuses; only the custody builder spends them.
 */
export class CardanoCustodyAccountRefusedError extends Error {
  public readonly code = 'custody-account';

  public constructor(accountId: AccountId) {
    super(
      `Account ${accountId} is a Cardano custody account; build its transactions with the custody builder`,
    );
    this.name = 'CardanoCustodyAccountRefusedError';
  }
}

const isCustodyAddress = (address: string): boolean => {
  const parsed = Cardano.Address.fromString(address);
  return !!parsed && classifyCustodyAddress(parsed).kind !== 'other';
};

/**
 * Throws when any of the account's Cardano addresses pays a supported
 * custody account validator, with any stake part or none.
 *
 * @throws `CardanoCustodyAccountRefusedError`
 */
export const refuseCustodyAccount = (
  accountId: AccountId,
  addresses: readonly AnyAddress[],
): void => {
  const isCustodyAccount = addresses.some(
    address =>
      address.accountId === accountId &&
      address.blockchainName === 'Cardano' &&
      isCustodyAddress(address.address),
  );
  if (isCustodyAccount) throw new CardanoCustodyAccountRefusedError(accountId);
};
