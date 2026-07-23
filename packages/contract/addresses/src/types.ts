import type { AddressAlias, AddressAliasType } from './value-objects';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Address } from '@lace-lib/core';
import type { Timestamp, Option, Uri } from '@lace-lib/util';
import type { BlockchainAssigned, BlockchainName } from '@lace-lib/util-store';
import type { Observable } from 'rxjs';

export type { Address };

export interface AnyBlockchainAddress<Data = unknown> {
  address: Address;
  name?: string;
  data?: Data;
}

export type AnyAddress<Data = unknown> = BlockchainAssigned<
  AnyBlockchainAddress<Data> & {
    accountId: AccountId;
  }
>;

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
