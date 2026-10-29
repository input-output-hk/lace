import type { AddressAlias, AddressAliasType } from './value-objects';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Address } from '@lace-lib/core';
import type { Timestamp, Option, Uri } from '@lace-lib/util';
import type { BlockchainAssigned, BlockchainName } from '@lace-lib/util-store';
import type { Observable } from 'rxjs';

export type { Address };

/** An address with an optional name and chain-specific `data`. */
export interface AnyBlockchainAddress<Data = unknown> {
  address: Address;
  name?: string;
  data?: Data;
}

/** An address in wallet state: the account it belongs to, its blockchain, and chain-specific `data`. */
export type AnyAddress<Data = unknown> = BlockchainAssigned<
  AnyBlockchainAddress<Data> & {
    accountId: AccountId;
  }
>;

/**
 * The result of resolving an alias (such as an ADA Handle) to an address: the
 * alias and its type, the address it resolved to on the given blockchain and
 * network, when it was resolved, and an optional image for the alias.
 *
 * @typeParam TAlias - The alias format.
 * @typeParam TAliasType - The alias type.
 * @typeParam TAddress - The address type the alias resolves to.
 */
export type AddressAliasResolution<
  TAlias extends AddressAlias = AddressAlias,
  TAliasType extends AddressAliasType = AddressAliasType,
  TAddress extends Address = Address,
> = {
  alias: TAlias;
  aliasType: TAliasType;
  resolvedAddress: TAddress;
  resolvedAt: Timestamp;
  image?: Uri;
  blockchainName: BlockchainName;
  networkId: BlockchainNetworkId;
};

/**
 * Resolves one alias format (such as ADA Handles) to addresses. A module
 * provides one per naming service; callers try each resolver whose
 * `looksLikeAlias` accepts the input.
 *
 * @typeParam TAlias - The alias format this resolver accepts.
 * @typeParam TAliasType - The alias type it reports.
 * @typeParam TAddress - The address type aliases resolve to.
 */
export type AddressAliasResolver<
  TAlias extends AddressAlias = AddressAlias,
  TAliasType extends AddressAliasType = AddressAliasType,
  TAddress extends Address = Address,
> = {
  /** Type guard: check if input matches this alias format */
  looksLikeAlias: (input: string) => input is TAlias;

  /** Resolve alias to address. Returns None if not found. */
  resolveAlias: (
    alias: TAlias,
    networkId: BlockchainNetworkId,
  ) => Observable<Option<AddressAliasResolution<TAlias, TAliasType, TAddress>>>;
};
