import { Cardano, Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cip8SignData } from '../../src/signing/cip8-sign-data';

import type {
  CardanoKeyAgent,
  CardanoSignDataRequest,
} from '../../src/signing/types';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';

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

  describe('DRep wire format (Ledger SDK parity)', () => {
    const drepRequest: CardanoSignDataRequest = {
      signWith: dRepEnterpriseAddress,
      payload: 'deadbeef',
    };

    it('protected headers have 2 entries with the 28-byte keyhash under "address" and no kid (label 4)', async () => {
      const result = await cip8SignData({
        keyAgent: mockKeyAgent,
        request: drepRequest,
        knownAddresses: [],
        dRepKeyHash,
      });

      const headers = decodeProtectedHeadersFromCoseSign1(result.signature);
      expect(headers.entryCount).toBe(2);
      expect(headers.alg).toBe(-8);
      expect(headers.kid).toBeUndefined();
      expect(Buffer.from(headers.address!).toString('hex')).toBe(dRepKeyHash);
    });

    it('COSE_Key kid contains the 28-byte keyhash', async () => {
      const result = await cip8SignData({
        keyAgent: mockKeyAgent,
        request: drepRequest,
        knownAddresses: [],
        dRepKeyHash,
      });

      const fields = decodeCoseKey(result.key);
      expect(fields.entryCount).toBe(5);
      expect(Buffer.from(fields.kid!).toString('hex')).toBe(dRepKeyHash);
    });
  });

  describe('payment-address wire format (unchanged)', () => {
    it('protected headers retain 3 entries with kid (label 4) and "address" both holding full address bytes', async () => {
      const result = await cip8SignData({
        keyAgent: mockKeyAgent,
        request: baseRequest,
        knownAddresses,
      });

      const headers = decodeProtectedHeadersFromCoseSign1(result.signature);
      expect(headers.entryCount).toBe(3);
      expect(headers.alg).toBe(-8);
      const expectedBytes =
        Cardano.Address.fromString(paymentAddress)!.toBytes();
      expect(Buffer.from(headers.kid!).toString('hex')).toBe(expectedBytes);
      expect(Buffer.from(headers.address!).toString('hex')).toBe(expectedBytes);
    });

    it('COSE_Key kid contains the full address bytes', async () => {
      const result = await cip8SignData({
        keyAgent: mockKeyAgent,
        request: baseRequest,
        knownAddresses,
      });

      const fields = decodeCoseKey(result.key);
      expect(fields.entryCount).toBe(5);
      const expectedBytes =
        Cardano.Address.fromString(paymentAddress)!.toBytes();
      expect(Buffer.from(fields.kid!).toString('hex')).toBe(expectedBytes);
    });
  });
});

type DecodedHeaders = {
  alg?: number;
  kid?: Uint8Array;
  address?: Uint8Array;
  entryCount: number;
};

const readMapKeyedFields = (
  reader: Serialization.CborReader,
): DecodedHeaders => {
  const size = reader.readStartMap();
  const entryCount = size ?? 0;
  const result: DecodedHeaders = { entryCount };
  for (let index = 0; index < entryCount; index++) {
    const keyState = reader.peekState();
    if (
      keyState === Serialization.CborReaderState.UnsignedInteger ||
      keyState === Serialization.CborReaderState.NegativeInteger
    ) {
      const key = Number(reader.readInt());
      if (key === 1) result.alg = Number(reader.readInt());
      else if (key === 4) result.kid = reader.readByteString();
      else if (
        reader.peekState() === Serialization.CborReaderState.ByteString
      ) {
        reader.readByteString();
      } else {
        reader.readInt();
      }
    } else {
      const key = reader.readTextString();
      if (key === 'address') result.address = reader.readByteString();
      else reader.readByteString();
    }
  }
  return result;
};

const decodeProtectedHeadersFromCoseSign1 = (
  coseSign1Hex: string,
): DecodedHeaders => {
  const reader = new Serialization.CborReader(HexBlob(coseSign1Hex));
  reader.readStartArray();
  const protectedHeadersBytes = reader.readByteString();
  return readMapKeyedFields(
    new Serialization.CborReader(
      HexBlob(Buffer.from(protectedHeadersBytes).toString('hex')),
    ),
  );
};

type DecodedCoseKey = {
  kty?: number;
  kid?: Uint8Array;
  alg?: number;
  crv?: number;
  x?: Uint8Array;
  entryCount: number;
};

const decodeCoseKey = (coseKeyHex: string): DecodedCoseKey => {
  const reader = new Serialization.CborReader(HexBlob(coseKeyHex));
  const size = reader.readStartMap();
  const entryCount = size ?? 0;
  const result: DecodedCoseKey = { entryCount };
  for (let index = 0; index < entryCount; index++) {
    const key = Number(reader.readInt());
    if (key === 1) result.kty = Number(reader.readInt());
    else if (key === 2) result.kid = reader.readByteString();
    else if (key === 3) result.alg = Number(reader.readInt());
    else if (key === -1) result.crv = Number(reader.readInt());
    else if (key === -2) result.x = reader.readByteString();
    else if (reader.peekState() === Serialization.CborReaderState.ByteString) {
      reader.readByteString();
    } else {
      reader.readInt();
    }
  }
  return result;
};
