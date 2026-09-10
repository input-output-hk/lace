import { toContractAddress } from '@lace-contract/cardano-context';

import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  CardanoAddressData,
  CardanoBip32AccountProps,
} from '@lace-contract/cardano-context';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type {
  AccountId,
  InMemoryWalletAccount,
  WalletId,
} from '@lace-contract/wallet-repo';

export type CardanoAccountParams = {
  accountId: AccountId;
  walletId: WalletId;
  accountIndex: number;
  chainId: Cardano.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  blockchainNetworkId: BlockchainNetworkId;
  networkType: 'mainnet' | 'testnet';
  name?: string;
};

/**
 * An in-memory Cardano account, shaped like blockchain-cardano's
 * buildAccountsForNetworks output. Shared by the marble unit tests (mock
 * values) and the e2e harness (real derived values) so both track one shape.
 */
export const buildCardanoAccount = ({
  accountId,
  walletId,
  accountIndex,
  chainId,
  extendedAccountPublicKey,
  blockchainNetworkId,
  networkType,
  name = 'Imported wallet (migrated)',
}: CardanoAccountParams): InMemoryWalletAccount<CardanoBip32AccountProps> => ({
  accountId,
  walletId,
  accountType: 'InMemory',
  blockchainName: 'Cardano',
  networkType,
  blockchainNetworkId,
  metadata: { name },
  blockchainSpecific: { chainId, accountIndex, extendedAccountPublicKey },
});

/**
 * An addresses-store record for a Cardano address, as `selectByAccountId`
 * returns them. Shared for the same reason as {@link buildCardanoAccount}.
 */
export const buildCardanoAddressRecord = ({
  accountId,
  address,
  data,
}: {
  accountId: AccountId;
  address: string;
  data: CardanoAddressData;
}): AnyAddress<CardanoAddressData> => ({
  accountId,
  blockchainName: 'Cardano',
  address: address as unknown as AnyAddress<CardanoAddressData>['address'],
  data,
});

/**
 * Maps a derived GroupedAddress to the addresses-store record's data shape,
 * reusing the contract's canonical address mapping.
 */
export const addressData = (
  grouped: GroupedAddress,
  networkMagic: Cardano.NetworkMagic,
): CardanoAddressData => {
  // toContractAddress always sets data, though the base type allows it to be
  // undefined.
  const { data } = toContractAddress(grouped, networkMagic);
  if (!data) throw new Error('toContractAddress produced no address data');
  return data;
};
