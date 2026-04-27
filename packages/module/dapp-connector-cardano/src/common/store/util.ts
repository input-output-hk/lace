import { Cardano } from '@cardano-sdk/core';
import { Ed25519KeyHashHex } from '@cardano-sdk/crypto';

import { APIError, APIErrorCode } from '../api-error';

import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { AnyAddress } from '@lace-contract/addresses';
import type { CardanoAddressData } from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * Detect type of hex encoded addr and convert to PaymentAddress or RewardAddress.
 *
 * @param addr - When hex encoded, it can be a PaymentAddress, RewardAddress or DRepKeyHash
 * @returns PaymentAddress | RewardAddress DRepKeyHash is converted to a type 6 address
 * @throws APIError if the address format is invalid
 */
export const addrToSignWith = (
  addr: Cardano.PaymentAddress | Cardano.RewardAccount | string,
): Cardano.PaymentAddress | Cardano.RewardAccount => {
  try {
    return Cardano.isRewardAccount(addr)
      ? Cardano.RewardAccount(addr)
      : Cardano.PaymentAddress(addr);
  } catch {
    const drepKeyHash = Ed25519KeyHashHex(addr);
    const drepId = Cardano.DRepID.cip129FromCredential({
      hash: drepKeyHash,
      type: Cardano.CredentialType.KeyHash,
    });
    const drepAddr = Cardano.DRepID.toAddress(drepId)?.toAddress();
    if (!drepAddr) {
      throw new APIError(
        APIErrorCode.InternalError,
        'Invalid address format for signing',
      );
    }
    return drepAddr.toBech32();
  }
};

/**
 * Safely converts an address to PaymentAddress or RewardAddress, returning the original input on failure.
 *
 * @param addr - When hex encoded, it can be a PaymentAddress, RewardAddress or DRepKeyHash
 * @returns PaymentAddress | RewardAddress | original string if conversion fails
 */
export const safeAddrToSignWith = (
  addr: Cardano.PaymentAddress | Cardano.RewardAccount | string,
): Cardano.PaymentAddress | Cardano.RewardAccount | string => {
  try {
    return addrToSignWith(addr);
  } catch {
    return addr;
  }
};

/**
 * Transforms AnyAddress<CardanoAddressData> to GroupedAddress format
 * required by the SDK's cip30signData function.
 *
 * @param addresses - Array of all addresses
 * @param accountId - Optional account ID to filter addresses
 * @returns Array of GroupedAddress objects for the SDK
 */
export const transformToGroupedAddresses = (
  addresses: AnyAddress[],
  accountId?: AccountId,
): GroupedAddress[] => {
  const filtered = addresses.filter(
    (
      addr,
    ): addr is AnyAddress<CardanoAddressData> & {
      data: CardanoAddressData;
    } =>
      addr.data !== undefined &&
      (accountId === undefined || addr.accountId === accountId),
  );
  return filtered.map(addr => ({
    type: addr.data.type,
    index: addr.data.index,
    networkId: addr.data.networkId,
    accountIndex: addr.data.accountIndex,
    address: Cardano.PaymentAddress(addr.address),
    rewardAccount: addr.data.rewardAccount as unknown as Cardano.RewardAccount,
    stakeKeyDerivationPath: addr.data.stakeKeyDerivationPath,
  }));
};
