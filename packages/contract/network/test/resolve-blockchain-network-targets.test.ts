import { describe, expect, it } from 'vitest';

import { createBlockchainNetworkTargetResolver } from '../src/resolve-blockchain-network-targets';
import { BlockchainNetworkId } from '../src/value-objects/blockchain-network-id.vo';

describe('createBlockchainNetworkTargetResolver', () => {
  const mainnet = BlockchainNetworkId('net-main');
  const preview = BlockchainNetworkId('net-preview');
  const defaults = ['a', 'b'] as const;
  const map = new Map([
    [mainnet, 'main' as const],
    [preview, 'preview' as const],
  ]);

  const resolve = createBlockchainNetworkTargetResolver(map, defaults);

  it('returns a copy of the default list when targets is undefined', () => {
    const mutableDefaults = ['a', 'b'];
    const resolveWithMutable = createBlockchainNetworkTargetResolver(
      map,
      mutableDefaults,
    );
    const out = resolveWithMutable(undefined);
    expect(out).toEqual(['a', 'b']);
    out.push('mutated');
    expect(mutableDefaults).toEqual(['a', 'b']);
  });

  it('throws when targets is an empty set', () => {
    expect(() => resolve(new Set())).toThrow('Empty target networks');
  });

  it('throws when a target id is missing from the map', () => {
    expect(() => resolve(new Set([BlockchainNetworkId('unknown')]))).toThrow(
      'Invalid network id:',
    );
  });

  it('maps each target in set iteration order', () => {
    expect(resolve(new Set([preview, mainnet]))).toEqual(['preview', 'main']);
    expect(resolve(new Set([mainnet, preview]))).toEqual(['main', 'preview']);
  });
});
