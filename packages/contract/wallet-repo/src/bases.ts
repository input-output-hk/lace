import type { AccountMetadata, WalletMetadata } from './types';
import type { AccountId, WalletId } from './value-objects';
import type { BlockchainNetworkId, NetworkType } from '@lace-contract/network';
import type { BlockchainName } from '@lace-lib/util-store';

/** What every account carries, whatever its kind. */
export type AccountBase<BlockchainSpecific> = {
  accountId: AccountId;
  walletId: WalletId;
  blockchainName: BlockchainName;
  networkType: NetworkType;
  blockchainNetworkId: BlockchainNetworkId;
  metadata: AccountMetadata;
  blockchainSpecific: BlockchainSpecific;
};

/** What every wallet carries, whatever its kind. */
export type WalletBase<BlockchainSpecific, Metadata = WalletMetadata> = {
  metadata: Metadata;
  walletId: WalletId;
  blockchainSpecific: BlockchainSpecific;
};
