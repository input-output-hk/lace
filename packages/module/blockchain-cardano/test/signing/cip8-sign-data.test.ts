import { describe, expect, it, vi } from 'vitest';

import { cip8SignData } from '../../src/signing/cip8-sign-data';

import type { Cardano } from '@cardano-sdk/core';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type {
  CardanoKeyAgent,
  CardanoSignDataRequest,
} from '@lace-contract/cardano-context';

const paymentAddress =
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp' as Cardano.PaymentAddress;

const rewardAccount =
  'stake_test1uqehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gssrtvn' as Cardano.RewardAccount;

const mockKeyAgent: CardanoKeyAgent = {
  signTransaction: vi.fn(),
  signBlob: vi.fn().mockResolvedValue({
    signature: 'ab'.repeat(32),
    publicKey: 'cd'.repeat(32),
  }),
};

const knownAddresses = [
  {
    address: paymentAddress,
    type: 0,
    index: 0,
    rewardAccount,
  },
] as unknown as GroupedAddress[];

const baseRequest: CardanoSignDataRequest = {
  signWith: paymentAddress,
  payload: 'deadbeef',
};

describe('cip8SignData', () => {
  it('calls signBlob with derivation path from matching payment address', async () => {
    const result = await cip8SignData(
      mockKeyAgent,
      baseRequest,
      knownAddresses,
    );

    expect(mockKeyAgent.signBlob).toHaveBeenCalledWith(
      { role: 0, index: 0 },
      expect.any(String),
    );
    expect(result.signature).toBeDefined();
    expect(result.key).toBeDefined();
  });

  it('uses stake key derivation path for reward accounts', async () => {
    const request: CardanoSignDataRequest = {
      ...baseRequest,
      signWith: rewardAccount,
    };
    const rewardAddresses = [
      {
        rewardAccount,
        stakeKeyDerivationPath: { role: 2, index: 0 },
      },
    ] as unknown as GroupedAddress[];

    await cip8SignData(mockKeyAgent, request, rewardAddresses);

    expect(mockKeyAgent.signBlob).toHaveBeenCalledWith(
      { role: 2, index: 0 },
      expect.any(String),
    );
  });

  it('defaults to role 2 index 0 for reward accounts without matching known address', async () => {
    const request: CardanoSignDataRequest = {
      ...baseRequest,
      signWith: rewardAccount,
    };

    await cip8SignData(mockKeyAgent, request, []);

    expect(mockKeyAgent.signBlob).toHaveBeenCalledWith(
      { role: 2, index: 0 },
      expect.any(String),
    );
  });

  it('defaults to role 0 index 0 for unknown payment addresses', async () => {
    await cip8SignData(mockKeyAgent, baseRequest, []);

    expect(mockKeyAgent.signBlob).toHaveBeenCalledWith(
      { role: 0, index: 0 },
      expect.any(String),
    );
  });

  it('throws for invalid addresses', async () => {
    const request: CardanoSignDataRequest = {
      ...baseRequest,
      signWith: 'invalid-address' as Cardano.PaymentAddress,
    };

    await expect(
      cip8SignData(mockKeyAgent, request, knownAddresses),
    ).rejects.toThrow('Invalid address: invalid-address');
  });

  it('returns hex-encoded COSE_Sign1 signature and COSE_Key', async () => {
    const result = await cip8SignData(
      mockKeyAgent,
      baseRequest,
      knownAddresses,
    );

    expect(typeof result.signature).toBe('string');
    expect(typeof result.key).toBe('string');
    expect(result.signature.length).toBeGreaterThan(0);
    expect(result.key.length).toBeGreaterThan(0);
  });

  it('passes SigStructure as HexBlob to signBlob', async () => {
    await cip8SignData(mockKeyAgent, baseRequest, knownAddresses);

    const blobArgument = (mockKeyAgent.signBlob as ReturnType<typeof vi.fn>)
      .mock.calls[0]?.[1] as string;
    expect(typeof blobArgument).toBe('string');
    expect(blobArgument.length).toBeGreaterThan(0);
  });
});
