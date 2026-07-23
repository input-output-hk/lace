import type { Tagged } from 'type-fest';

// =====================================================================
// CardanoDustNetwork — testnet vs mainnet for cNIGHT designation.
// =====================================================================
// The dapp ships two pre-compiled CBOR blobs, not one parameterised
// script — the cNIGHT policy id is baked into each. Preview and Preprod
// share the same blob (same cNIGHT policy `d2dbff62…`); Mainnet has its
// own (cNIGHT = NIGHT policy `0691b2fe…`). The lib uses 'testnet' as
// the union member covering both preview + preprod, matching how the
// dapp's `runtime-config.ts` collapses them.
// =====================================================================
export type CardanoDustNetwork = Tagged<
  'mainnet' | 'testnet',
  'CardanoDustNetwork'
>;

export const CardanoDustNetwork = {
  mainnet: 'mainnet' as CardanoDustNetwork,
  testnet: 'testnet' as CardanoDustNetwork,

  /** Pick the network from a Cardano `NetworkMagic` (mainnet = 764824073). */
  fromNetworkMagic: (networkMagic: number): CardanoDustNetwork =>
    networkMagic === 764_824_073
      ? CardanoDustNetwork.mainnet
      : CardanoDustNetwork.testnet,

  /** Network id byte (0 = testnet, 1 = mainnet) as used in Cardano addresses. */
  toNetworkId: (network: CardanoDustNetwork): 0 | 1 =>
    network === CardanoDustNetwork.mainnet ? 1 : 0,
} as const;
