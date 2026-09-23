import { Cardano } from '@cardano-sdk/core';
import {
  CardanoPaymentKeyHash,
  CardanoStakeKeyHash,
} from '@lace-lib/cnight-dust-designation';

import type { AnyAddress } from '@lace-contract/addresses';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * Payment + stake credentials of a Cardano account, plus the address they were
 * read from (the account's primary address, which also serves as the change
 * destination).
 *
 * The cNIGHT validator checks BOTH credentials: the stake key hash is written
 * into the datum's `c_wallet` and both hashes go into `required_signers`.
 */
export type AccountKeyHashes = {
  primaryAddress: Cardano.PaymentAddress;
  paymentKeyHash: CardanoPaymentKeyHash;
  stakeKeyHash: CardanoStakeKeyHash;
};

const hexToBytes = (hex: string): Uint8Array => {
  // Fail fast on malformed hex rather than silently coercing non-hex / odd-length
  // input to wrong bytes (`parseInt` → NaN → 0). This feeds key-hash construction
  // and tx building, so a bad value must not produce an unintended signed tx.
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error(`Invalid hex string: "${hex}"`);
  }
  return Uint8Array.from(
    (hex.match(/.{1,2}/g) ?? []).map(byte => parseInt(byte, 16)),
  );
};

/**
 * Read the account's credentials off its primary Cardano address.
 *
 * Throws when the account has no Cardano address or its address carries no
 * stake credential — an enterprise address cannot satisfy the validator's
 * `check_auth`, so there is no designation to build or index for it.
 */
export const resolveAccountKeyHashes = (
  addresses: readonly AnyAddress[],
  accountId: AccountId,
): AccountKeyHashes => {
  const primary = addresses.find(
    address =>
      address.accountId === accountId && address.blockchainName === 'Cardano',
  );
  if (!primary) throw new Error('No Cardano addresses found for account');

  const baseAddress = Cardano.Address.fromString(
    primary.address as string,
  )?.asBase();
  if (!baseAddress) {
    throw new Error('Account address is not a base (payment+stake) address');
  }

  return {
    primaryAddress: Cardano.PaymentAddress(primary.address as string),
    paymentKeyHash: CardanoPaymentKeyHash(
      hexToBytes(baseAddress.getPaymentCredential().hash),
    ),
    stakeKeyHash: CardanoStakeKeyHash(
      hexToBytes(baseAddress.getStakeCredential().hash),
    ),
  };
};

export { hexToBytes };
