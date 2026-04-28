import type { Tagged } from 'type-fest';

export type BlockchainNetworkId = Tagged<string, 'BlockchainNetworkId'>;
export const BlockchainNetworkId = (value: string): BlockchainNetworkId =>
  value as BlockchainNetworkId;
