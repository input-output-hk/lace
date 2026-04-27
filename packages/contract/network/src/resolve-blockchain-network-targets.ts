import type { BlockchainNetworkId } from './value-objects/blockchain-network-id.vo';

/**
 * Returns a function that resolves an optional set of Lace
 * {@link BlockchainNetworkId} values to chain-specific representations using a
 * lookup map, with the same semantics as the in-memory wallet integrations:
 *
 * - `targets` undefined → all supported targets (the provided default list)
 * - empty set → throws
 * - non-empty set → each id must exist in the map or throws
 */
export const createBlockchainNetworkTargetResolver =
  <TResolved>(
    supportedByBlockchainNetworkId: ReadonlyMap<BlockchainNetworkId, TResolved>,
    defaultForAllSupported: readonly TResolved[],
  ) =>
  (targets?: Set<BlockchainNetworkId>): TResolved[] => {
    if (targets === undefined) return [...defaultForAllSupported];
    if (targets.size === 0) throw new Error('Empty target networks');
    return Array.from(targets, id => {
      const resolved = supportedByBlockchainNetworkId.get(id);
      if (resolved === undefined) throw new Error(`Invalid network id: ${id}`);
      return resolved;
    });
  };
