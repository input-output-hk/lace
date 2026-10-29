import type { Tagged } from 'type-fest';

/** Blockchain-qualified network identity used by account creation and network selection. */
export type BlockchainNetworkId = Tagged<string, 'BlockchainNetworkId'>;
/** Tags an existing network identity without validating its configuration. */
export const BlockchainNetworkId = (value: string): BlockchainNetworkId =>
  value as BlockchainNetworkId;
