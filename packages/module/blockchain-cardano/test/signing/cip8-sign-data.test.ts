import { Cardano } from '@cardano-sdk/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cip8SignData } from '../../src/signing/cip8-sign-data';

import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type {
  CardanoKeyAgent,
  CardanoSignDataRequest,
} from '@lace-contract/cardano-context';

const paymentAddress =
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp' as Cardano.PaymentAddress;

const rewardAccount =
  'stake_test1uqehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gssrtvn' as Cardano.RewardAccount;

const dRepKeyHash = 'a3'.repeat(28) as Ed25519KeyHashHex;
const dRepEnterpriseAddress = Cardano.DRepID.toAddress(
  Cardano.DRepID.cip129FromCredential({
    hash: dRepKeyHash,
    type: Cardano.CredentialType.KeyHash,
  }),
)!
  .toAddress()
  .toBech32() as Cardano.PaymentAddress;

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
  beforeEach(() => {
    vi.mocked(mockKeyAgent.signBlob).mockClear();
  });

  it('calls signBlob with derivation path from matching payment address', async () => {
    const result = await cip8SignData({
      keyAgent: mockKeyAgent,
      request: baseRequest,
      knownAddresses,
    });

    expect(mockKeyAgent.signBlob).toHaveBeenCalledWith(
      { role: 0, index: 0 },
      expect.any(String),
    );
    expect(result.signature).toBeDefined();
    expect(result.key).toBeDefined();
  });

  it('uses stake key derivation path for reward accounts', async () => {
    const rewardAddresses = [
      {
        rewardAccount,
        stakeKeyDerivationPath: { role: 2, index: 0 },
      },
    ] as unknown as GroupedAddress[];

    await cip8SignData({
      keyAgent: mockKeyAgent,
      request: { ...baseRequest, signWith: rewardAccount },
      knownAddresses: rewardAddresses,
    });

    expect(mockKeyAgent.signBlob).toHaveBeenCalledWith(
      { role: 2, index: 0 },
      expect.any(String),
    );
  });

  it('defaults to role 2 index 0 for reward accounts without matching known address', async () => {
    await cip8SignData({
      keyAgent: mockKeyAgent,
      request: { ...baseRequest, signWith: rewardAccount },
      knownAddresses: [],
    });

    expect(mockKeyAgent.signBlob).toHaveBeenCalledWith(
      { role: 2, index: 0 },
      expect.any(String),
    );
  });

  it('throws for unknown payment addresses (no silent fallback to payment key 0)', async () => {
    await expect(
      cip8SignData({
        keyAgent: mockKeyAgent,
        request: baseRequest,
        knownAddresses: [],
      }),
    ).rejects.toThrow(/Unknown signWith address/);
    expect(mockKeyAgent.signBlob).not.toHaveBeenCalled();
  });

  it('uses DRep derivation path (role 3) when signing for a DRep enterprise address (LW-14940)', async () => {
    await cip8SignData({
      keyAgent: mockKeyAgent,
      request: { signWith: dRepEnterpriseAddress, payload: 'deadbeef' },
      knownAddresses: [],
      dRepKeyHash,
    });

    expect(mockKeyAgent.signBlob).toHaveBeenCalledWith(
      { role: 3, index: 0 },
      expect.any(String),
    );
  });

  it('throws for a DRep enterprise address whose keyhash does not match (foreign DRep)', async () => {
    const foreignDRepKeyHash = 'bb'.repeat(28) as Ed25519KeyHashHex;

    await expect(
      cip8SignData({
        keyAgent: mockKeyAgent,
        request: { signWith: dRepEnterpriseAddress, payload: 'deadbeef' },
        knownAddresses: [],
        dRepKeyHash: foreignDRepKeyHash,
      }),
    ).rejects.toThrow(/Unknown signWith address/);
    expect(mockKeyAgent.signBlob).not.toHaveBeenCalled();
  });

  it('throws for invalid addresses', async () => {
    await expect(
      cip8SignData({
        keyAgent: mockKeyAgent,
        request: {
          ...baseRequest,
          signWith: 'invalid-address' as Cardano.PaymentAddress,
        },
        knownAddresses,
      }),
    ).rejects.toThrow('Invalid address: invalid-address');
  });

  it('returns hex-encoded COSE_Sign1 signature and COSE_Key', async () => {
    const result = await cip8SignData({
      keyAgent: mockKeyAgent,
      request: baseRequest,
      knownAddresses,
    });

    expect(typeof result.signature).toBe('string');
    expect(typeof result.key).toBe('string');
    expect(result.signature.length).toBeGreaterThan(0);
    expect(result.key.length).toBeGreaterThan(0);
  });

  it('passes SigStructure as HexBlob to signBlob', async () => {
    await cip8SignData({
      keyAgent: mockKeyAgent,
      request: baseRequest,
      knownAddresses,
    });

    const blobArgument = (mockKeyAgent.signBlob as ReturnType<typeof vi.fn>)
      .mock.calls[0]?.[1] as string;
    expect(typeof blobArgument).toBe('string');
    expect(blobArgument.length).toBeGreaterThan(0);
  });
});
