import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { describe, expect, it } from 'vitest';

import {
  laceErrorToProviderError,
  toWireNetwork,
  transportUtxoToContract,
} from '../src/mappers';

import type { BitcoinUtxo } from '@lace-lib/extension-shell-api';

const wireUtxo = (over: Partial<BitcoinUtxo> = {}): BitcoinUtxo => ({
  txId: 'a'.repeat(64),
  index: 1,
  satoshis: '150000',
  address: 'bc1qexample',
  script: '0014abcdef',
  confirmations: 6,
  height: 800_000,
  ...over,
});

describe('transportUtxoToContract', () => {
  it('reifies the decimal-string satoshis to a number and fills empty runes/inscriptions', () => {
    expect(transportUtxoToContract(wireUtxo())).toEqual({
      txId: 'a'.repeat(64),
      index: 1,
      satoshis: 150_000,
      address: 'bc1qexample',
      script: '0014abcdef',
      confirmations: 6,
      height: 800_000,
      runes: [],
      inscriptions: [],
    });
  });

  it('defaults a missing height (still-unconfirmed output) to 0', () => {
    const { height, ...withoutHeight } = wireUtxo();
    void height;
    expect(transportUtxoToContract(withoutHeight).height).toBe(0);
  });
});

describe('toWireNetwork', () => {
  it('maps the BitcoinNetwork enum to the wire network name', () => {
    expect(toWireNetwork(BitcoinNetwork.Mainnet)).toBe('mainnet');
    expect(toWireNetwork(BitcoinNetwork.Testnet)).toBe('testnet4');
  });
});

describe('laceErrorToProviderError', () => {
  it('carries the code and message into the ProviderError reason', () => {
    const error = laceErrorToProviderError({
      code: 'internal',
      message: 'boom',
    });
    expect(error.detail).toContain('internal');
    expect(error.detail).toContain('boom');
  });
});
