import { Cardano } from '@cardano-sdk/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchYieldEarned } from '../src/realfi-yield-earned';

import type { IYieldBreakdown } from '@realfi-co/realfi-partner-sdk';

const getYieldBreakdown =
  vi.fn<(address: string) => Promise<IYieldBreakdown>>();
const forNetwork = vi.fn((_network: string) => ({ getYieldBreakdown }));

vi.mock('@realfi-co/realfi-partner-sdk', () => ({
  RealfiApi: { forNetwork: (network: string) => forNetwork(network) },
}));

const keyHash = (digit: string) =>
  digit.repeat(56) as Cardano.Credential['hash'];
const keyCredential = (digit: string): Cardano.Credential => ({
  type: Cardano.CredentialType.KeyHash,
  hash: keyHash(digit),
});
const STAKE = keyCredential('e');
const baseAddress = (paymentDigit: string) =>
  Cardano.BaseAddress.fromCredentials(
    Cardano.NetworkId.Mainnet,
    keyCredential(paymentDigit),
    STAKE,
  )
    .toAddress()
    .toBech32();
const enterpriseAddress = (paymentDigit: string) =>
  Cardano.EnterpriseAddress.fromCredentials(
    Cardano.NetworkId.Mainnet,
    keyCredential(paymentDigit),
  )
    .toAddress()
    .toBech32();

const breakdown = (yieldBaseUnits: bigint): IYieldBreakdown => ({
  totalSUSDr: 0n,
  totalUSDrValue: 0n,
  principal: 0n,
  yield: yieldBaseUnits,
  yieldPercent: 0,
});

describe('fetchYieldEarned', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sums the yield of every distinct payment credential in the account', async () => {
    const [first, second] = [baseAddress('a'), baseAddress('b')];
    getYieldBreakdown.mockImplementation(async address =>
      breakdown(address === first ? 1000n : 2000n),
    );

    expect(
      await fetchYieldEarned({ realfiNetwork: 'mainnet' }, [first, second]),
    ).toEqual({ yieldUsdrBaseUnits: '3000' });
    expect(forNetwork).toHaveBeenCalledWith('mainnet');
    expect(getYieldBreakdown).toHaveBeenCalledTimes(2);
  });

  it('reads a payment credential once when base and enterprise addresses share it', async () => {
    getYieldBreakdown.mockResolvedValue(breakdown(3565n));

    expect(
      await fetchYieldEarned({ realfiNetwork: 'mainnet' }, [
        baseAddress('a'),
        enterpriseAddress('a'),
      ]),
    ).toEqual({ yieldUsdrBaseUnits: '3565' });
    expect(getYieldBreakdown).toHaveBeenCalledTimes(1);
  });

  it('resolves nothing when no address carries a payment credential', async () => {
    expect(
      await fetchYieldEarned({ realfiNetwork: 'mainnet' }, ['not-an-address']),
    ).toBeUndefined();
    expect(getYieldBreakdown).not.toHaveBeenCalled();
  });

  it('fails as a whole when any credential read fails, never a partial total', async () => {
    const [first, second] = [baseAddress('a'), baseAddress('b')];
    getYieldBreakdown.mockImplementation(async address => {
      if (address === second) throw new Error('503');
      return breakdown(1000n);
    });

    await expect(
      fetchYieldEarned({ realfiNetwork: 'mainnet' }, [first, second]),
    ).rejects.toThrow('503');
  });

  it('keeps at most 4 credential reads in flight', async () => {
    let inFlight = 0;
    let peak = 0;
    getYieldBreakdown.mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return breakdown(1n);
    });

    const result = await fetchYieldEarned(
      { realfiNetwork: 'mainnet' },
      ['a', 'b', 'c', 'd', 'f', '1'].map(baseAddress),
    );

    expect(result).toEqual({ yieldUsdrBaseUnits: '6' });
    expect(peak).toBe(4);
  });
});
