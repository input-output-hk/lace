import { Cardano, Serialization } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import {
  CardanoCustodyDeviceKeyMismatchError,
  CardanoCustodyRequestRefusedError,
  verifyVkeyWitnesses,
} from '@lace-contract/cardano-context';
import {
  serializeCustodyRequestedGrantScope,
  verifyCustodyDataSignature,
} from '@lace-lib/cardano-custody';
import { RemoteSignerError } from '@lace-lib/passkey';
import { describe, expect, it, vi } from 'vitest';

import { RemoteSignerResultError } from '../../src/cardano-remote-signer-factory';
import {
  createLocalCardanoCustodyDeviceSigner,
  createRemoteCardanoCustodyDeviceSigner,
} from '../../src/custody/cardano-custody-device-signer';
import { CardanoCustodyUnsupportedSignerError } from '../../src/custody/cardano-custody-errors';
import { PasskeyWalletMismatchError } from '../../src/passkey-wallet-mismatch-error';

import {
  agentGrant,
  agentGrantUtxo,
  buildResultOf,
  controlOutput,
  creatorBinding,
  DEVICE_0,
  DEVICE_1,
  hostedChannel,
  identity,
  initialState,
  issueGrantShape,
  liveControl,
  localChannel,
  ownerSpendShape,
  PREPROD,
  RECIPIENT_ADDRESS,
  record,
  serializeResolvedInput,
  TESTNET_CUSTODY_XPUB,
  utxo,
  words,
} from './custody-fixtures';

import type {
  CardanoCustodyDeviceSignDataRequest,
  CardanoCustodyDeviceSignRequest,
} from '../../src/custody/cardano-custody-device-signer';
import type { CardanoVkeyWitness } from '@lace-contract/cardano-context';
import type { PasskeyKeySource } from '@lace-lib/passkey';

/** 2026-10-07T00:00:00Z, before every fixture grant expiry. */
const NOW = 1_791_331_200_000;

const issueGrantRequest = (
  overrides: Partial<CardanoCustodyDeviceSignRequest> = {},
): CardanoCustodyDeviceSignRequest => {
  const result = buildResultOf(issueGrantShape());
  return {
    transaction: HexBlob(result.transaction),
    resolvedInputs: result.resolvedInputs,
    accountRecord: record,
    chainId: PREPROD,
    device: creatorBinding(localChannel),
    ...overrides,
  };
};

/** An owner spend carrying a payment intent id under label 1971, as Midnight City reads it. */
const ownerSpendRequest = (
  overrides: Partial<CardanoCustodyDeviceSignRequest> = {},
): CardanoCustodyDeviceSignRequest => {
  const result = buildResultOf({
    ...ownerSpendShape(),
    auxiliaryData: {
      blob: new Map([
        [
          1971n,
          new Map<Cardano.Metadatum, Cardano.Metadatum>([
            ['intentId', 'pi_42'],
          ]),
        ],
      ]),
    },
  });
  return {
    transaction: HexBlob(result.transaction),
    resolvedInputs: result.resolvedInputs,
    accountRecord: record,
    chainId: PREPROD,
    device: creatorBinding(localChannel),
    ...overrides,
  };
};

const requestedScope = {
  ...agentGrant.scope,
  slot: agentGrant.slot,
  grantee: agentGrant.grantee,
  recipients: [],
};

const keySourceOf = (mnemonic: readonly string[] = words): PasskeyKeySource => {
  const source: PasskeyKeySource = {
    ensureCredential: vi.fn(),
    credentialRef: vi.fn(() => ({
      credentialId: localChannel.credentialId,
      rpId: localChannel.rpId,
      recipeVersion: 'v1' as const,
    })),
    withPasskeyMnemonic: async use => use(mnemonic),
  };
  vi.spyOn(source, 'withPasskeyMnemonic');
  return source;
};

const vkeysOf = (witnessSet: HexBlob): CardanoVkeyWitness[] =>
  (
    Serialization.TransactionWitnessSet.fromCbor(witnessSet)
      .vkeys()
      ?.toCore() ?? []
  ).map(([vkey, signature]) => ({ vkey, signature }));

describe('createLocalCardanoCustodyDeviceSigner', () => {
  it('signs the body hash with the bound device key after one fresh assertion', async () => {
    const keySource = keySourceOf();
    const signer = createLocalCardanoCustodyDeviceSigner({
      keySource,
      now: () => NOW,
    });
    const request = issueGrantRequest();

    const witnessSet = await signer.signTransaction(request);

    const witnesses = vkeysOf(witnessSet);
    expect(witnesses).toHaveLength(1);
    const { valid, invalid } = await verifyVkeyWitnesses(
      buildResultOf(issueGrantShape()).bodyHash,
      witnesses,
    );
    expect(invalid).toEqual([]);
    expect([...valid.keys()]).toEqual([DEVICE_0]);
    expect(keySource.withPasskeyMnemonic).toHaveBeenCalledTimes(1);
  });

  it('accepts the scope the transaction writes', async () => {
    const signer = createLocalCardanoCustodyDeviceSigner({
      keySource: keySourceOf(),
      now: () => NOW,
    });

    await expect(
      signer.signTransaction(
        issueGrantRequest({ requestedScopes: [requestedScope] }),
      ),
    ).resolves.toEqual(expect.any(String));
  });

  it('checks the grant UTxOs it is sent before any ceremony', async () => {
    const keySource = keySourceOf();
    const signer = createLocalCardanoCustodyDeviceSigner({
      keySource,
      now: () => NOW,
    });
    const elsewhere = utxo(0x31, {
      ...agentGrantUtxo[1],
      address: RECIPIENT_ADDRESS,
    });

    await expect(
      signer.signTransaction(issueGrantRequest({ grantUtxos: [elsewhere] })),
    ).rejects.toMatchObject({
      code: 'custody-context-mismatch',
      reason: 'grant-utxo-address',
    });
    expect(keySource.withPasskeyMnemonic).not.toHaveBeenCalled();
  });

  it('signs with the grant UTxOs of the account beside the request', async () => {
    const signer = createLocalCardanoCustodyDeviceSigner({
      keySource: keySourceOf(),
      now: () => NOW,
    });

    await expect(
      signer.signTransaction(
        issueGrantRequest({ grantUtxos: [agentGrantUtxo] }),
      ),
    ).resolves.toEqual(expect.any(String));
  });

  it('signs a transaction carrying metadata the app explains', async () => {
    const signer = createLocalCardanoCustodyDeviceSigner({
      keySource: keySourceOf(),
      now: () => NOW,
    });

    await expect(
      signer.signTransaction(
        ownerSpendRequest({
          metadataMeanings: { 1971: 'Midnight City subscription payment' },
        }),
      ),
    ).resolves.toEqual(expect.any(String));
  });

  it('refuses a metadata meaning for a label the transaction does not carry before any ceremony', async () => {
    const keySource = keySourceOf();
    const signer = createLocalCardanoCustodyDeviceSigner({
      keySource,
      now: () => NOW,
    });

    await expect(
      signer.signTransaction(
        ownerSpendRequest({ metadataMeanings: { 674: 'A message' } }),
      ),
    ).rejects.toMatchObject({
      code: 'custody-context-mismatch',
      reason: 'metadata-label-not-carried',
    });
    expect(keySource.withPasskeyMnemonic).not.toHaveBeenCalled();
  });

  it('refuses a scope the transaction does not write before any ceremony', async () => {
    const keySource = keySourceOf();
    const signer = createLocalCardanoCustodyDeviceSigner({
      keySource,
      now: () => NOW,
    });

    await expect(
      signer.signTransaction(
        issueGrantRequest({
          requestedScopes: [{ ...requestedScope, cap: 1n }],
        }),
      ),
    ).rejects.toMatchObject({ code: 'custody-scope-mismatch' });
    expect(keySource.withPasskeyMnemonic).not.toHaveBeenCalled();
  });

  it('refuses a device the account state does not list before any ceremony', async () => {
    const keySource = keySourceOf();
    const signer = createLocalCardanoCustodyDeviceSigner({
      keySource,
      now: () => NOW,
    });

    await expect(
      signer.signTransaction(
        issueGrantRequest({
          device: {
            ...creatorBinding(localChannel),
            index: 1,
            keyHash: DEVICE_1,
          },
        }),
      ),
    ).rejects.toMatchObject({ code: 'custody-device-not-listed' });
    expect(keySource.withPasskeyMnemonic).not.toHaveBeenCalled();
  });

  it('refuses a binding whose key hash is not the key its public key derives', async () => {
    const keySource = keySourceOf();
    const signer = createLocalCardanoCustodyDeviceSigner({
      keySource,
      now: () => NOW,
    });

    await expect(
      signer.signTransaction(
        issueGrantRequest({
          device: { ...creatorBinding(localChannel), keyHash: DEVICE_1 },
        }),
      ),
    ).rejects.toBeInstanceOf(CardanoCustodyDeviceKeyMismatchError);
    expect(keySource.withPasskeyMnemonic).not.toHaveBeenCalled();
  });

  it('never signs when the passkey words derive another device key', async () => {
    const otherWords = [...Array.from({ length: 23 }, () => 'abandon'), 'art'];
    const signer = createLocalCardanoCustodyDeviceSigner({
      keySource: keySourceOf(otherWords),
      now: () => NOW,
    });

    await expect(
      signer.signTransaction(issueGrantRequest()),
    ).rejects.toBeInstanceOf(CardanoCustodyDeviceKeyMismatchError);
  });

  it.each([
    ['a hosted device', creatorBinding(hostedChannel)],
    [
      'another credential',
      creatorBinding({ ...localChannel, credentialId: 'BAUG' }),
    ],
    [
      'another relying party',
      creatorBinding({ ...localChannel, rpId: 'x.io' }),
    ],
  ])('refuses %s before any ceremony', async (_, device) => {
    const keySource = keySourceOf();
    const signer = createLocalCardanoCustodyDeviceSigner({ keySource });

    await expect(
      signer.signTransaction(issueGrantRequest({ device })),
    ).rejects.toBeInstanceOf(PasskeyWalletMismatchError);
    expect(keySource.withPasskeyMnemonic).not.toHaveBeenCalled();
  });
});

describe('createRemoteCardanoCustodyDeviceSigner', () => {
  const witnessSet = HexBlob('a10081825820'.padEnd(80, '0'));

  it('sends the custody sign request in the protocol shape and returns the witness set', async () => {
    const request = vi.fn(async () => ({ witnessSet }));
    const signer = createRemoteCardanoCustodyDeviceSigner({ request });
    const signRequest = issueGrantRequest({
      device: creatorBinding(hostedChannel),
      requestedScopes: [requestedScope],
      grantUtxos: [agentGrantUtxo],
      metadataMeanings: { 1971: 'Midnight City subscription payment' },
    });

    await expect(signer.signTransaction(signRequest)).resolves.toBe(witnessSet);

    expect(request).toHaveBeenCalledWith('sign-cardano-custody-tx', {
      serializedTx: signRequest.transaction,
      chainId: {
        networkId: Cardano.NetworkId.Testnet,
        networkMagic: Cardano.NetworkMagics.Preprod,
      },
      device: { extendedAccountPublicKey: TESTNET_CUSTODY_XPUB, index: 0 },
      resolvedInputs: signRequest.resolvedInputs.map(serializeResolvedInput),
      accountRecord: record,
      requestedScopes: [serializeCustodyRequestedGrantScope(requestedScope)],
      grantUtxos: [serializeResolvedInput(agentGrantUtxo)],
      metadataMeanings: { 1971: 'Midnight City subscription payment' },
    });
  });

  it('sends neither scopes nor grant UTxOs the request does not name', async () => {
    const request = vi.fn(async () => ({ witnessSet }));
    const signer = createRemoteCardanoCustodyDeviceSigner({ request });

    await signer.signTransaction(
      issueGrantRequest({ device: creatorBinding(hostedChannel) }),
    );

    const [[, payload]] = request.mock.calls as unknown as [
      [string, Record<string, unknown>],
    ];
    expect(payload).not.toHaveProperty('requestedScopes');
    expect(payload).not.toHaveProperty('grantUtxos');
    expect(payload).not.toHaveProperty('metadataMeanings');
  });

  it('reports a signer that answers unsupported-request as one without custody support', async () => {
    const signer = createRemoteCardanoCustodyDeviceSigner({
      request: vi.fn(async () => {
        throw new RemoteSignerError('unsupported-request', 'no');
      }),
    });

    const error = await signer
      .signTransaction(
        issueGrantRequest({ device: creatorBinding(hostedChannel) }),
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CardanoCustodyUnsupportedSignerError);
    expect(error).toMatchObject({ signerCode: 'unsupported-request' });
  });

  it('passes an unexpected signer failure through rather than reporting missing custody support', async () => {
    const failure = new RemoteSignerError(
      'unexpected',
      'The signer request failed.',
    );
    const signer = createRemoteCardanoCustodyDeviceSigner({
      request: vi.fn(async () => {
        throw failure;
      }),
    });

    await expect(
      signer.signTransaction(
        issueGrantRequest({ device: creatorBinding(hostedChannel) }),
      ),
    ).rejects.toBe(failure);
  });

  it('passes a custody refusal through with its code', async () => {
    const refusal = new RemoteSignerError('custody-device-not-listed', 'no');
    const signer = createRemoteCardanoCustodyDeviceSigner({
      request: vi.fn(async () => {
        throw refusal;
      }),
    });

    await expect(
      signer.signTransaction(
        issueGrantRequest({ device: creatorBinding(hostedChannel) }),
      ),
    ).rejects.toBe(refusal);
  });

  it.each([undefined, {}, { witnessSet: 'not hex' }, { witnessSet: 7 }])(
    'refuses the answer %j',
    async answer => {
      const signer = createRemoteCardanoCustodyDeviceSigner({
        request: vi.fn(async () => answer),
      });

      await expect(
        signer.signTransaction(
          issueGrantRequest({ device: creatorBinding(hostedChannel) }),
        ),
      ).rejects.toBeInstanceOf(RemoteSignerResultError);
    },
  );

  it('refuses a device bound to a local passkey without asking the signer', async () => {
    const request = vi.fn();
    const signer = createRemoteCardanoCustodyDeviceSigner({ request });

    await expect(
      signer.signTransaction(issueGrantRequest()),
    ).rejects.toBeInstanceOf(PasskeyWalletMismatchError);
    expect(request).not.toHaveBeenCalled();
  });
});

describe('signData', () => {
  /** `Sign in to city.example, nonce 42` in UTF-8. */
  const payload = HexBlob(
    Buffer.from('Sign in to city.example, nonce 42').toString('hex'),
  );

  const APP_ORIGIN = 'https://wallet.example';

  const signDataRequest = (
    overrides: Partial<CardanoCustodyDeviceSignDataRequest> = {},
  ): CardanoCustodyDeviceSignDataRequest => ({
    payload,
    purpose: 'sign-in',
    accountRecord: record,
    controlUtxo: liveControl,
    chainId: PREPROD,
    device: creatorBinding(localChannel),
    ...overrides,
  });

  describe('createLocalCardanoCustodyDeviceSigner', () => {
    it('signs the payload bound to the account address, its own origin and the purpose with the bound device key after one fresh assertion', async () => {
      const keySource = keySourceOf();
      const signer = createLocalCardanoCustodyDeviceSigner({
        keySource,
        origin: APP_ORIGIN,
      });

      const { origin, ...signed } = await signer.signData(
        signDataRequest({ purpose: 'link-account' }),
      );

      expect(origin).toBe(APP_ORIGIN);
      await expect(
        verifyCustodyDataSignature({
          ...signed,
          payload,
          address: identity.address,
          origin: APP_ORIGIN,
          purpose: 'link-account',
          devices: [DEVICE_0],
        }),
      ).resolves.toEqual({ ok: true, value: { keyHash: DEVICE_0 } });
      expect(keySource.withPasskeyMnemonic).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['no origin', undefined],
      ['an origin that is not a serialized origin', 'https://wallet.example/'],
    ])(
      'refuses to sign data with %s before any ceremony',
      async (_, origin) => {
        const keySource = keySourceOf();
        const signer = createLocalCardanoCustodyDeviceSigner({
          keySource,
          origin,
        });

        await expect(signer.signData(signDataRequest())).rejects.toMatchObject({
          code: 'malformed-request',
        });
        expect(keySource.withPasskeyMnemonic).not.toHaveBeenCalled();
      },
    );

    it.each([
      [
        'custody-device-not-listed',
        signDataRequest({
          controlUtxo: utxo(
            0x10,
            controlOutput({ ...initialState, devices: [HexBlob(DEVICE_1)] }),
          ),
        }),
      ],
      [
        'custody-malformed-datum',
        signDataRequest({
          controlUtxo: utxo(0x10, { ...liveControl[1], datum: undefined }),
        }),
      ],
      [
        'custody-context-mismatch',
        signDataRequest({
          accountRecord: {
            ...record,
            stakeScriptHash: Hash28ByteBase16('dd'.repeat(28)),
          },
        }),
      ],
    ])(
      'refuses %s with the hosted signer code before any ceremony',
      async (code, request) => {
        const keySource = keySourceOf();
        const signer = createLocalCardanoCustodyDeviceSigner({
          keySource,
          origin: APP_ORIGIN,
        });

        const error = await signer
          .signData(request)
          .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(CardanoCustodyRequestRefusedError);
        expect(error).toMatchObject({ code });
        expect(keySource.withPasskeyMnemonic).not.toHaveBeenCalled();
      },
    );

    it('refuses a malformed payload before any ceremony', async () => {
      const keySource = keySourceOf();
      const signer = createLocalCardanoCustodyDeviceSigner({
        keySource,
        origin: APP_ORIGIN,
      });

      await expect(
        signer.signData(signDataRequest({ payload: HexBlob('abc') })),
      ).rejects.toMatchObject({ code: 'malformed-request' });
      expect(keySource.withPasskeyMnemonic).not.toHaveBeenCalled();
    });

    it('refuses a binding whose key hash is not the key its public key derives', async () => {
      const keySource = keySourceOf();
      const signer = createLocalCardanoCustodyDeviceSigner({
        keySource,
        origin: APP_ORIGIN,
      });

      await expect(
        signer.signData(
          signDataRequest({
            device: { ...creatorBinding(localChannel), keyHash: DEVICE_1 },
          }),
        ),
      ).rejects.toBeInstanceOf(CardanoCustodyDeviceKeyMismatchError);
      expect(keySource.withPasskeyMnemonic).not.toHaveBeenCalled();
    });

    it('never signs when the passkey words derive another device key', async () => {
      const otherWords = [
        ...Array.from({ length: 23 }, () => 'abandon'),
        'art',
      ];
      const signer = createLocalCardanoCustodyDeviceSigner({
        keySource: keySourceOf(otherWords),
        origin: APP_ORIGIN,
      });

      await expect(signer.signData(signDataRequest())).rejects.toBeInstanceOf(
        CardanoCustodyDeviceKeyMismatchError,
      );
    });

    it('refuses a hosted device before any ceremony', async () => {
      const keySource = keySourceOf();
      const signer = createLocalCardanoCustodyDeviceSigner({
        keySource,
        origin: APP_ORIGIN,
      });

      await expect(
        signer.signData(
          signDataRequest({ device: creatorBinding(hostedChannel) }),
        ),
      ).rejects.toBeInstanceOf(PasskeyWalletMismatchError);
      expect(keySource.withPasskeyMnemonic).not.toHaveBeenCalled();
    });
  });

  describe('createRemoteCardanoCustodyDeviceSigner', () => {
    const answer = {
      signature: 'AB12',
      key: 'CD34',
      origin: 'https://city.example',
    };

    it('sends the custody data request in the protocol shape and returns the signature', async () => {
      const request = vi.fn(async () => answer);
      const signer = createRemoteCardanoCustodyDeviceSigner({ request });

      await expect(
        signer.signData(
          signDataRequest({
            device: creatorBinding(hostedChannel),
            purpose: 'link-account',
          }),
        ),
      ).resolves.toEqual({
        signature: 'ab12',
        key: 'cd34',
        origin: 'https://city.example',
      });

      expect(request).toHaveBeenCalledWith('sign-cardano-custody-data', {
        chainId: {
          networkId: Cardano.NetworkId.Testnet,
          networkMagic: Cardano.NetworkMagics.Preprod,
        },
        device: { extendedAccountPublicKey: TESTNET_CUSTODY_XPUB, index: 0 },
        accountRecord: record,
        controlUtxo: serializeResolvedInput(liveControl),
        payload,
        purpose: 'link-account',
      });
    });

    it.each([
      undefined,
      {},
      { signature: 'ab', origin: 'https://city.example' },
      { key: 'ab', origin: 'https://city.example' },
      { signature: 'not hex', key: 'ab', origin: 'https://city.example' },
      { signature: 'ab', key: 7, origin: 'https://city.example' },
      { signature: 'ab', key: 'cd' },
      { signature: 'ab', key: 'cd', origin: 'https://city.example/' },
      { signature: 'ab', key: 'cd', origin: 'null' },
    ])('refuses the answer %j', async malformed => {
      const signer = createRemoteCardanoCustodyDeviceSigner({
        request: vi.fn(async () => malformed),
      });

      await expect(
        signer.signData(
          signDataRequest({ device: creatorBinding(hostedChannel) }),
        ),
      ).rejects.toBeInstanceOf(RemoteSignerResultError);
    });

    it('reports a signer that does not serve custody data requests as one without support', async () => {
      const signer = createRemoteCardanoCustodyDeviceSigner({
        request: vi.fn(async () => {
          throw new RemoteSignerError('unsupported-request', 'no');
        }),
      });

      const error = await signer
        .signData(signDataRequest({ device: creatorBinding(hostedChannel) }))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(CardanoCustodyUnsupportedSignerError);
    });

    it('refuses a device bound to a local passkey without asking the signer', async () => {
      const request = vi.fn();
      const signer = createRemoteCardanoCustodyDeviceSigner({ request });

      await expect(signer.signData(signDataRequest())).rejects.toBeInstanceOf(
        PasskeyWalletMismatchError,
      );
      expect(request).not.toHaveBeenCalled();
    });
  });
});
