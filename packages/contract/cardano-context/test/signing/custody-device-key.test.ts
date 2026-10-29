import { Cardano } from '@cardano-sdk/core';
import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import { KeyPurpose } from '@cardano-sdk/key-management';
import { HexBlob } from '@cardano-sdk/util';
import {
  CURRENT_CUSTODY_CONTRACT_VERSION,
  deriveCustodyAccountIdentity,
  verifyCustodyDataSignature,
} from '@lace-lib/cardano-custody';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCardanoKeyAgentFromMnemonic } from '../../src/signing/cardano-key-agent';
import {
  CardanoCustodyDeviceKeyMismatchError,
  deriveCardanoCustodyAccountPublicKeyFromWords,
  signCardanoCustodyDataWithWords,
  signCardanoCustodyTransactionWithWords,
} from '../../src/signing/custody-device-key';
import { verifyVkeyWitnesses } from '../../src/signing/vkey-witnesses';

import { extendedAccountPublicKey, words } from './sign-with-words.fixtures';

import type * as KeyAgentModule from '../../src/signing/cardano-key-agent';
import type { CardanoVkeyWitness } from '../../src/signing/vkey-witnesses';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';

// Shifts the index the key agent signs with, so a test can make the agent sign
// with a key other than the one derived from the account public key.
const agentSigning = vi.hoisted(() => ({ indexOffset: 0 }));

vi.mock('../../src/signing/cardano-key-agent', async importOriginal => {
  const actual = await importOriginal<typeof KeyAgentModule>();
  return {
    ...actual,
    createCardanoKeyAgentFromMnemonic: async (
      props: KeyAgentModule.CreateCardanoKeyAgentFromMnemonicProps,
    ) => {
      const agent = await actual.createCardanoKeyAgentFromMnemonic(props);
      return {
        ...agent,
        signBlob: async (
          path: { role: number; index: number },
          blob: Parameters<typeof agent.signBlob>[1],
        ) =>
          agent.signBlob(
            { ...path, index: path.index + agentSigning.indexOffset },
            blob,
          ),
      };
    },
  };
});

// Vectors for the fixture words, derived independently with
// @emurgo/cardano-serialization-lib-nodejs (Bip32PrivateKey.from_bip39_entropy,
// then 1854'/1815'/a' and 0/i). The same derivation reproduces the fixture's
// CIP-1852 key 928f…a7a7. Mainnet custody keys live in account 0 and testnet
// ones in account 1.
const MAINNET = {
  contractVersion: CURRENT_CUSTODY_CONTRACT_VERSION,
  networkMagic: Cardano.NetworkMagics.Mainnet,
};
const PREPROD = { ...MAINNET, networkMagic: Cardano.NetworkMagics.Preprod };
const PREVIEW = { ...MAINNET, networkMagic: Cardano.NetworkMagics.Preview };
const CIP1854_ACCOUNT_XPUB = Bip32PublicKeyHex(
  '6550798be419f5d95843778734dff32a07294aee8cad98820ca5b8e427cbbf13321f34608794871a549cc80c4ae81505f1baa61f9db40deadfb539aa80e03720',
);
const CIP1854_TESTNET_ACCOUNT_XPUB = Bip32PublicKeyHex(
  '5daf833bb597b987983984cbf950f81fc274a038574e4bf52d00433dbc11efd183ab5e43da8fd700e7c32e17b25f30e904e30da92501456943d5f8f041d769a4',
);
const DEVICE_KEY_HASHES: Record<number, Ed25519KeyHashHex> = {
  0: '1bc758af685fa627146e547f0f1213f38bb8b9ee81c509e2e6174206' as Ed25519KeyHashHex,
  1: '3a53f2f3ee40a59a9b3d3febea75ed712349ee84b759e11ca66b3216' as Ed25519KeyHashHex,
  5: '911326a54a87550ce52504a0057c642ff12bc57e5fd84003335c1803' as Ed25519KeyHashHex,
};
const TESTNET_DEVICE_KEY_HASHES: Record<number, Ed25519KeyHashHex> = {
  0: 'c673124ca3922223ff8e522559f25e2236f5294b0a486a55833d55dc' as Ed25519KeyHashHex,
  1: 'aa90eee1400baca5d0a5037a190e959b07020ba861a988e37b1787b5' as Ed25519KeyHashHex,
};
const DEVICE_1_PUBLIC_KEY =
  '2115621c718bef524b07a5d8ce943f8840ab9f9d5126c00a5e37e8a3f6dbce23';
// The CIP-1852 payment key m/1852'/1815'/0'/0/0 of the same words.
const STANDARD_PAYMENT_KEY_HASH =
  '5f30d7c7e4a3f0fe894dbcad956728c680ff1b3034311ff7b4486cf5';

const txId = Cardano.TransactionId('ab'.repeat(32));

/** The key hashes whose signature over `txId` verifies. */
const validSigners = async (witness: CardanoVkeyWitness) => [
  ...(await verifyVkeyWitnesses(txId, [witness])).valid.keys(),
];

/** Captures the per-call session passphrase so a test can see it zeroed. */
const capturePassphrase = (): Uint8Array => {
  const passphrase = new Uint8Array(32).fill(7);
  vi.spyOn(crypto, 'getRandomValues').mockImplementationOnce(() => passphrase);
  return passphrase;
};

describe('createCardanoKeyAgentFromMnemonic purpose', () => {
  it('derives the CIP-1852 account by default and the CIP-1854 account for MULTI_SIG', async () => {
    const standard = await createCardanoKeyAgentFromMnemonic({
      accountIndex: 0,
      chainId: Cardano.ChainIds.Preprod,
      mnemonicWords: words,
    });
    const multiSig = await createCardanoKeyAgentFromMnemonic({
      accountIndex: 0,
      chainId: Cardano.ChainIds.Preprod,
      mnemonicWords: words,
      purpose: KeyPurpose.MULTI_SIG,
    });
    try {
      expect(standard.extendedAccountPublicKey).toBe(extendedAccountPublicKey);
      expect(multiSig.extendedAccountPublicKey).toBe(CIP1854_ACCOUNT_XPUB);
    } finally {
      standard.dispose?.();
      multiSig.dispose?.();
    }
  });
});

describe('deriveCardanoCustodyAccountPublicKeyFromWords', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('derives the Mainnet CIP-1854 account key and disposes the agent', async () => {
    const passphrase = capturePassphrase();

    await expect(
      deriveCardanoCustodyAccountPublicKeyFromWords({ words, ...MAINNET }),
    ).resolves.toBe(CIP1854_ACCOUNT_XPUB);
    expect(passphrase).toEqual(new Uint8Array(32));
  });

  it.each([
    ['Preprod', PREPROD],
    ['Preview', PREVIEW],
  ])(
    'derives the testnet account key m/1854/1815/1 on %s',
    async (_, network) => {
      await expect(
        deriveCardanoCustodyAccountPublicKeyFromWords({ words, ...network }),
      ).resolves.toBe(CIP1854_TESTNET_ACCOUNT_XPUB);
    },
  );
});

describe('signCardanoCustodyTransactionWithWords', () => {
  afterEach(() => {
    agentSigning.indexOffset = 0;
    vi.restoreAllMocks();
  });

  it('signs the transaction id with exactly the device key and disposes the agent', async () => {
    const passphrase = capturePassphrase();

    const witness = await signCardanoCustodyTransactionWithWords({
      words,
      ...MAINNET,
      txId,
      deviceIndex: 1,
      expectedKeyHash: DEVICE_KEY_HASHES[1],
    });

    expect(witness.vkey).toBe(DEVICE_1_PUBLIC_KEY);
    await expect(validSigners(witness)).resolves.toEqual([
      DEVICE_KEY_HASHES[1],
    ]);
    expect(passphrase).toEqual(new Uint8Array(32));
  });

  it.each([0, 5])(
    'signs with device key m/1854/1815/0/0/%i',
    async deviceIndex => {
      const witness = await signCardanoCustodyTransactionWithWords({
        words,
        ...MAINNET,
        txId,
        deviceIndex,
        expectedKeyHash: DEVICE_KEY_HASHES[deviceIndex],
      });

      await expect(validSigners(witness)).resolves.toEqual([
        DEVICE_KEY_HASHES[deviceIndex],
      ]);
    },
  );

  it('signs with the testnet device key m/1854/1815/1/0/i on a testnet', async () => {
    const witness = await signCardanoCustodyTransactionWithWords({
      words,
      ...PREPROD,
      txId,
      deviceIndex: 1,
      expectedKeyHash: TESTNET_DEVICE_KEY_HASHES[1],
    });

    await expect(validSigners(witness)).resolves.toEqual([
      TESTNET_DEVICE_KEY_HASHES[1],
    ]);
  });

  it('refuses a Mainnet device key hash on a testnet, so one network never signs for another', async () => {
    await expect(
      signCardanoCustodyTransactionWithWords({
        words,
        ...PREPROD,
        txId,
        deviceIndex: 0,
        expectedKeyHash: DEVICE_KEY_HASHES[0],
      }),
    ).rejects.toMatchObject({
      code: 'custody-device-key-mismatch',
      derivedKeyHash: TESTNET_DEVICE_KEY_HASHES[0],
    });
  });

  it('accepts an expected key hash written in upper case', async () => {
    const witness = await signCardanoCustodyTransactionWithWords({
      words,
      ...MAINNET,
      txId,
      deviceIndex: 0,
      expectedKeyHash: DEVICE_KEY_HASHES[0].toUpperCase() as Ed25519KeyHashHex,
    });

    await expect(validSigners(witness)).resolves.toEqual([
      DEVICE_KEY_HASHES[0],
    ]);
  });

  it.each([
    ['another device index', DEVICE_KEY_HASHES[5]],
    ['the CIP-1852 payment key of the same words', STANDARD_PAYMENT_KEY_HASH],
  ])(
    'refuses to sign when the expected hash is %s, and disposes the agent',
    async (_, expectedKeyHash) => {
      const passphrase = capturePassphrase();

      const refusal = signCardanoCustodyTransactionWithWords({
        words,
        ...MAINNET,
        txId,
        deviceIndex: 1,
        expectedKeyHash: expectedKeyHash as Ed25519KeyHashHex,
      });

      await expect(refusal).rejects.toBeInstanceOf(
        CardanoCustodyDeviceKeyMismatchError,
      );
      await expect(refusal).rejects.toMatchObject({
        code: 'custody-device-key-mismatch',
        derivedKeyHash: DEVICE_KEY_HASHES[1],
      });
      await expect(refusal).rejects.not.toThrow(DEVICE_KEY_HASHES[1]);
      expect(passphrase).toEqual(new Uint8Array(32));
    },
  );

  it('refuses a witness from an agent that signs with another key, and disposes the agent', async () => {
    const passphrase = capturePassphrase();
    agentSigning.indexOffset = 4;

    const refusal = signCardanoCustodyTransactionWithWords({
      words,
      ...MAINNET,
      txId,
      deviceIndex: 1,
      expectedKeyHash: DEVICE_KEY_HASHES[1],
    });

    await expect(refusal).rejects.toMatchObject({
      code: 'custody-device-key-mismatch',
      derivedKeyHash: DEVICE_KEY_HASHES[5],
    });
    expect(passphrase).toEqual(new Uint8Array(32));
  });

  it.each([-1, 1.5, 2 ** 31])(
    'refuses device index %d, which no soft derivation reaches, and disposes the agent',
    async deviceIndex => {
      const passphrase = capturePassphrase();

      await expect(
        signCardanoCustodyTransactionWithWords({
          words,
          ...MAINNET,
          txId,
          deviceIndex,
          expectedKeyHash: DEVICE_KEY_HASHES[0],
        }),
      ).rejects.toBeInstanceOf(RangeError);
      expect(passphrase).toEqual(new Uint8Array(32));
    },
  );
});

describe('signCardanoCustodyDataWithWords', () => {
  /** `Sign in to city.example, nonce 42` in UTF-8. */
  const payload = HexBlob(
    Buffer.from('Sign in to city.example, nonce 42').toString('hex'),
  );
  const addressOf = (creatorKeyHash: string) => {
    const identity = deriveCustodyAccountIdentity({
      contractVersion: CURRENT_CUSTODY_CONTRACT_VERSION,
      creatorKeyHash,
      chainId: Cardano.ChainIds.Preprod,
    });
    if (!identity.ok) throw new Error('The fixture identity must derive');
    return identity.value.address;
  };
  const address = addressOf(TESTNET_DEVICE_KEY_HASHES[0]);
  const origin = 'https://city.example';
  const signDevice = async (deviceIndex: 0 | 1) =>
    signCardanoCustodyDataWithWords({
      words,
      ...PREPROD,
      address,
      origin,
      purpose: 'sign-in',
      payload,
      deviceIndex,
      expectedKeyHash: TESTNET_DEVICE_KEY_HASHES[deviceIndex],
    });
  const verify = async (
    signed: { signature: string; key: string },
    overrides: Partial<Parameters<typeof verifyCustodyDataSignature>[0]> = {},
  ) =>
    verifyCustodyDataSignature({
      ...signed,
      payload,
      address,
      origin,
      purpose: 'sign-in',
      devices: [TESTNET_DEVICE_KEY_HASHES[0]],
      ...overrides,
    });

  afterEach(() => {
    agentSigning.indexOffset = 0;
    vi.restoreAllMocks();
  });

  it('signs a CIP-8 payload bound to the account address, the origin and the purpose that the verifier accepts, and disposes the agent', async () => {
    const passphrase = capturePassphrase();

    const signed = await signDevice(0);

    await expect(verify(signed)).resolves.toEqual({
      ok: true,
      value: { keyHash: TESTNET_DEVICE_KEY_HASHES[0] },
    });
    expect(passphrase).toEqual(new Uint8Array(32));
  });

  it('is refused for another payload, account, site, purpose or key, or an unlisted device', async () => {
    const signed = await signDevice(0);
    const otherDevice = await signDevice(1);

    await expect(
      verify(signed, { origin: 'https://evil.example' }),
    ).resolves.toEqual({ ok: false, error: { code: 'origin-mismatch' } });
    await expect(verify(signed, { purpose: 'link-account' })).resolves.toEqual({
      ok: false,
      error: { code: 'purpose-mismatch' },
    });
    await expect(verify(signed, { payload: 'deadbeef' })).resolves.toEqual({
      ok: false,
      error: { code: 'payload-mismatch' },
    });
    await expect(
      verify(signed, { address: addressOf(TESTNET_DEVICE_KEY_HASHES[1]) }),
    ).resolves.toEqual({ ok: false, error: { code: 'address-mismatch' } });
    await expect(
      verify(
        { ...signed, key: otherDevice.key },
        {
          devices: [TESTNET_DEVICE_KEY_HASHES[1]],
        },
      ),
    ).resolves.toEqual({ ok: false, error: { code: 'invalid-signature' } });
    await expect(verify(otherDevice)).resolves.toEqual({
      ok: false,
      error: {
        code: 'device-not-listed',
        keyHash: TESTNET_DEVICE_KEY_HASHES[1],
      },
    });
  });

  it('refuses words that derive another device key, and disposes the agent', async () => {
    const passphrase = capturePassphrase();

    await expect(
      signCardanoCustodyDataWithWords({
        words,
        ...MAINNET,
        address,
        origin,
        purpose: 'sign-in',
        payload,
        deviceIndex: 0,
        expectedKeyHash: TESTNET_DEVICE_KEY_HASHES[0],
      }),
    ).rejects.toMatchObject({
      code: 'custody-device-key-mismatch',
      derivedKeyHash: DEVICE_KEY_HASHES[0],
    });
    expect(passphrase).toEqual(new Uint8Array(32));
  });

  it.each([
    ['an origin that is not a serialized origin', { origin: 'city.example' }],
    ['an unknown purpose', { purpose: 'pay' as 'sign-in' }],
  ])('refuses %s before it derives any key', async (_, overrides) => {
    const passphrase = capturePassphrase();

    await expect(
      signCardanoCustodyDataWithWords({
        words,
        ...PREPROD,
        address,
        origin,
        purpose: 'sign-in',
        payload,
        deviceIndex: 0,
        expectedKeyHash: TESTNET_DEVICE_KEY_HASHES[0],
        ...overrides,
      }),
    ).rejects.toBeInstanceOf(TypeError);
    // No key agent asked for a passphrase, so none was derived.
    expect(passphrase).toEqual(new Uint8Array(32).fill(7));
  });

  it('refuses a signature from an agent that signs with another key', async () => {
    agentSigning.indexOffset = 1;

    await expect(signDevice(0)).rejects.toMatchObject({
      code: 'custody-device-key-mismatch',
      derivedKeyHash: TESTNET_DEVICE_KEY_HASHES[1],
    });
  });
});
