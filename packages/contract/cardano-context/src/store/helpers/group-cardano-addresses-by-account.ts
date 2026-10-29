import groupBy from 'lodash/groupBy';

import { isCardanoAddressOfSupportedNetwork } from '../../util';

import type { CardanoAddressData } from '../../types';
import type { Cardano } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * Filters a list of addresses, returning only Cardano addresses that
 * correspond to the specified network ID.
 *
 * @param addresses - The list of addresses to be filtered.
 * @param chainId - The Cardano network ID to filter the addresses by.
 * @returns A filtered list of addresses that belong to the specified network ID.
 */
export const filterCardanoAddressesForNetwork = (
  addresses: AnyAddress[],
  chainId: Cardano.ChainId,
): AnyAddress<CardanoAddressData>[] =>
  addresses.filter(address =>
    isCardanoAddressOfSupportedNetwork(address, chainId),
  );

/**
 * Retrieves a list of Cardano addresses filtered by account ID and chain ID.
 *
 * @param addresses - The list of addresses to be filtered.
 * @param accountId - The account identifier used to filter addresses.
 * @param chainId - The chain ID specifying the target Cardano network.
 * @returns A filtered list of Cardano addresses
 * matched by the specified account ID and chain ID.
 */
export const getAccountAddresses = (
  addresses: AnyAddress[],
  accountId: AccountId,
  chainId: Cardano.ChainId,
): AnyAddress<CardanoAddressData>[] =>
  filterCardanoAddressesForNetwork(addresses, chainId).filter(
    address => address.accountId === accountId,
  );

/**
 * Groups a list of Cardano addresses by their associated reward accounts.
 *
 * This function filters the provided addresses to include only those that match
 * the given Cardano chain ID and then groups the filtered addresses by their
 * reward account. The reward account is extracted from the address's data.
 *
 * @param addresses - The list of addresses to be processed.
 * @param chainId - The Cardano chain ID used to filter the addresses.
 * @returns A record where
 *          the keys are account IDs and the values are arrays of addresses
 *          associated with those accounts.
 */
export const groupCardanoAddressesByAccount = (
  addresses: AnyAddress[],
  chainId: Cardano.ChainId,
): Record<AccountId, AnyAddress<CardanoAddressData>[]> => {
  return groupBy(
    filterCardanoAddressesForNetwork(addresses, chainId),
    addr => addr.accountId,
  );
};
