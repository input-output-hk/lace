import { Cardano, Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import {
  deriveCustodyDeviceKey,
  verifyCustodyDataSignature,
} from '@lace-lib/cardano-custody';
import { describe, expect, it, vi } from 'vitest';

import {
  createCardanoSignerHandlers,
  type WithMnemonicWords,
} from '../../src/signing/cardano-signer-handlers';
import { MalformedRequestError } from '../../src/signing/request-parsing';
import {
  signCardanoDataWithWords,
  signCardanoTransactionWithWords,
} from '../../src/signing/sign-with-words';
import { verifyVkeyWitnesses } from '../../src/signing/vkey-witnesses';

import {
  agentGrant,
  CHALLENGE,
  controlOutput,
  creation,
  custodyDataPayload,
  DAPP_ORIGIN,
  custodyPayload,
  DEVICE_0,
  deviceRewrite,
  fundUtxo,
  grantedState,
  identity,
  initialState,
  issueGrant,
  NOW,
  requestedScopeOf,
  revokeGrant,
  serializeCustodyTransaction,
  serializeResolvedInput,
  sweepGrants,
  TESTNET_CUSTODY_XPUB,
  utxo as custodyUtxo,
} from './custody-sign-request.fixtures';
import {
  address,
  extendedAccountPublicKey,
  knownAddresses,
  mainnet,
  serializedTx,
  utxo,
  words,
} from './sign-with-words.fixtures';

import type { HexBlob as HexBlobType } from '@cardano-sdk/util';

const accountPayload = {
  knownAddresses,
  accountIndex: 0,
  chainId: { networkId: 0, networkMagic: 1 },
  extendedAccountPublicKey,
};

const txPayload = { ...accountPayload, serializedTx, utxo };
const dataPayload = {
  ...accountPayload,
  signWith: address,
  payload: 'deadbeef',
};

const createHandlers = (
  withMnemonicWords?: WithMnemonicWords,
): {
  assertions: ReturnType<typeof vi.fn>;
  handlers: ReturnType<typeof createCardanoSignerHandlers>;
} => {
  const assertions = vi.fn();
  const withWords: WithMnemonicWords =
    withMnemonicWords ??
    (async use => {
      assertions();
      return use(words);
    });
  return {
    assertions,
    handlers: createCardanoSignerHandlers({
      withMnemonicWords: withWords,
      now: () => NOW,
    }),
  };
};

// The Mainnet custody account m/1854'/1815'/0' of the fixture words.
const MAINNET_CUSTODY_XPUB =
  '6550798be419f5d95843778734dff32a07294aee8cad98820ca5b8e427cbbf13321f34608794871a549cc80c4ae81505f1baa61f9db40deadfb539aa80e03720';

/** The vkey witnesses a custody witness set holds, and nothing else it may carry. */
const readWitnessSet = (witnessSet: HexBlobType) => {
  const core = Serialization.TransactionWitnessSet.fromCbor(
    HexBlob(witnessSet),
  ).toCore();
  return {
    vkeys: [...core.signatures].map(([vkey, signature]) => ({
      vkey,
      signature,
    })),
    others: Object.entries(core)
      .filter(([field, value]) => field !== 'signatures' && value !== undefined)
      .map(([field]) => field),
  };
};

const txIdOfPayload = (payload: { serializedTx: string }) =>
  Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(payload.serializedTx),
  ).getId();

const expectMalformed = async (
  signing: Promise<unknown>,
  field: string,
): Promise<void> => {
  const error: unknown = await signing.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(MalformedRequestError);
  expect(error).toMatchObject({ code: 'malformed-request' });
  expect((error as MalformedRequestError).message).toContain(`"${field}"`);
};

describe('createCardanoSignerHandlers', () => {
  it('signs a transaction inside one assertion from the protocol payload', async () => {
    const { handlers, assertions } = createHandlers();

    const result = await handlers['sign-cardano-tx'](txPayload);

    expect(assertions).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      await signCardanoTransactionWithWords({
        words,
        knownAddresses,
        accountIndex: 0,
        chainId: Cardano.ChainIds.Preprod,
        extendedAccountPublicKey,
        serializedTx,
        utxo,
      }),
    );
  });

  it('signs data inside one assertion from the protocol payload', async () => {
    const { handlers, assertions } = createHandlers();

    const result = await handlers['sign-cardano-data'](dataPayload);

    expect(assertions).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      await signCardanoDataWithWords({
        words,
        knownAddresses,
        accountIndex: 0,
        chainId: Cardano.ChainIds.Preprod,
        extendedAccountPublicKey,
        signWith: address,
        payload: 'deadbeef',
      }),
    );
  });

  it('answers the account public key inside one assertion from the account index alone', async () => {
    const { handlers, assertions } = createHandlers();

    const result = await handlers['cardano-account-public-key']({
      accountIndex: 0,
    });

    expect(assertions).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ accountIndex: 0, extendedAccountPublicKey });
  });

  it('answers a different key for another account index', async () => {
    const { handlers } = createHandlers();

    const result = await handlers['cardano-account-public-key']({
      accountIndex: 1,
    });

    expect(result.accountIndex).toBe(1);
    expect(result.extendedAccountPublicKey).toMatch(/^[\da-f]{128}$/);
    expect(result.extendedAccountPublicKey).not.toBe(extendedAccountPublicKey);
  });

  it('signs mainnet transactions and data with a fresh assertion for each', async () => {
    const { handlers, assertions } = createHandlers();

    await expect(
      handlers['sign-cardano-tx']({ ...txPayload, ...mainnet }),
    ).resolves.toMatchObject({ signatureCount: 1 });
    const signed = await handlers['sign-cardano-data']({
      ...dataPayload,
      ...mainnet,
    });
    expect(signed.signature).toMatch(/^[\da-f]+$/);
    expect(signed.key).toMatch(/^[\da-f]+$/);
    expect(assertions).toHaveBeenCalledTimes(2);
  });

  it('propagates the failure of the assertion', async () => {
    const failure = new Error('The user dismissed the assertion.');
    const { handlers } = createHandlers(async () => {
      throw failure;
    });

    await expect(handlers['sign-cardano-tx'](txPayload)).rejects.toBe(failure);
    await expect(handlers['sign-cardano-data'](dataPayload)).rejects.toBe(
      failure,
    );
    await expect(
      handlers['cardano-account-public-key']({ accountIndex: 0 }),
    ).rejects.toBe(failure);
  });

  describe('malformed requests never start an assertion', () => {
    it.each([-1, 2, 1.5, NaN, '1', undefined])(
      'refuses the network ID %s',
      async networkId => {
        const { handlers, assertions } = createHandlers();
        const chainId = { networkId, networkMagic: 1 };
        await expectMalformed(
          handlers['sign-cardano-tx']({ ...txPayload, chainId }),
          'chainId',
        );
        await expectMalformed(
          handlers['sign-cardano-data']({ ...dataPayload, chainId }),
          'chainId',
        );
        expect(assertions).not.toHaveBeenCalled();
      },
    );
    it('refuses a chain ID it cannot read', async () => {
      const { handlers, assertions } = createHandlers();
      const chainId = { networkMagic: '1' };

      await expectMalformed(
        handlers['sign-cardano-tx']({ ...txPayload, chainId }),
        'chainId',
      );
      await expectMalformed(
        handlers['sign-cardano-data']({ ...dataPayload, chainId }),
        'chainId',
      );
      expect(assertions).not.toHaveBeenCalled();
    });

    it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', undefined])(
      'refuses the network magic %s',
      async networkMagic => {
        const { handlers, assertions } = createHandlers();
        const chainId = { networkId: 0, networkMagic };

        await expectMalformed(
          handlers['sign-cardano-tx']({ ...txPayload, chainId }),
          'chainId',
        );
        expect(assertions).not.toHaveBeenCalled();
      },
    );

    it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, '0', undefined])(
      'refuses the account index %s',
      async accountIndex => {
        const { handlers, assertions } = createHandlers();

        await expectMalformed(
          handlers['sign-cardano-tx']({ ...txPayload, accountIndex }),
          'accountIndex',
        );
        await expectMalformed(
          handlers['sign-cardano-data']({ ...dataPayload, accountIndex }),
          'accountIndex',
        );
        await expectMalformed(
          handlers['cardano-account-public-key']({ accountIndex }),
          'accountIndex',
        );
        expect(assertions).not.toHaveBeenCalled();
      },
    );

    it.each([
      extendedAccountPublicKey.slice(0, 127),
      `${extendedAccountPublicKey}00`,
      'zz'.repeat(64),
      64,
    ])('refuses the account public key %s', async xpub => {
      const { handlers, assertions } = createHandlers();

      await expectMalformed(
        handlers['sign-cardano-tx']({
          ...txPayload,
          extendedAccountPublicKey: xpub,
        }),
        'extendedAccountPublicKey',
      );
      await expectMalformed(
        handlers['sign-cardano-data']({
          ...dataPayload,
          extendedAccountPublicKey: xpub,
        }),
        'extendedAccountPublicKey',
      );
      expect(assertions).not.toHaveBeenCalled();
    });

    it('refuses known addresses that are not an array', async () => {
      const { handlers, assertions } = createHandlers();

      await expectMalformed(
        handlers['sign-cardano-tx']({
          ...txPayload,
          knownAddresses: { address },
        }),
        'knownAddresses',
      );
      await expectMalformed(
        handlers['sign-cardano-data']({
          ...dataPayload,
          knownAddresses: undefined,
        }),
        'knownAddresses',
      );
      expect(assertions).not.toHaveBeenCalled();
    });

    it('refuses a UTxO set that is not an array', async () => {
      const { handlers, assertions } = createHandlers();

      await expectMalformed(
        handlers['sign-cardano-tx']({ ...txPayload, utxo: { address } }),
        'utxo',
      );
      expect(assertions).not.toHaveBeenCalled();
    });

    it.each([42, '', undefined])(
      'refuses a serialized transaction that is not a non-empty string: %s',
      async serializedTx => {
        const { handlers, assertions } = createHandlers();

        await expectMalformed(
          handlers['sign-cardano-tx']({ ...txPayload, serializedTx }),
          'serializedTx',
        );
        expect(assertions).not.toHaveBeenCalled();
      },
    );

    it.each([42, '', undefined])(
      'refuses a sign-with or payload field that is not a non-empty string: %s',
      async value => {
        const { handlers, assertions } = createHandlers();

        await expectMalformed(
          handlers['sign-cardano-data']({ ...dataPayload, signWith: value }),
          'signWith',
        );
        await expectMalformed(
          handlers['sign-cardano-data']({ ...dataPayload, payload: value }),
          'payload',
        );
        expect(assertions).not.toHaveBeenCalled();
      },
    );
  });
});

describe('custody request kinds', () => {
  it.each([
    ['Preprod', Cardano.ChainIds.Preprod, TESTNET_CUSTODY_XPUB],
    ['Preview', Cardano.ChainIds.Preview, TESTNET_CUSTODY_XPUB],
    ['Mainnet', Cardano.ChainIds.Mainnet, MAINNET_CUSTODY_XPUB],
  ])(
    'answers the custody account key for %s inside one assertion',
    async (_, chainId, expected) => {
      const { handlers, assertions } = createHandlers();

      await expect(
        handlers['cardano-custody-public-key']({ chainId }),
      ).resolves.toEqual({ extendedAccountPublicKey: expected });
      expect(assertions).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    { networkId: 1, networkMagic: 1 },
    { networkId: 0, networkMagic: 42 },
    undefined,
  ])(
    'refuses the custody key for chain %o before any assertion',
    async chainId => {
      const { handlers, assertions } = createHandlers();

      await expectMalformed(
        handlers['cardano-custody-public-key']({ chainId }),
        'chainId',
      );
      expect(assertions).not.toHaveBeenCalled();
    },
  );

  it('signs a sponsored creation with exactly the creator device key, inside one assertion', async () => {
    const { handlers, assertions } = createHandlers();
    const payload = custodyPayload(creation());

    const { witnessSet } = await handlers['sign-cardano-custody-tx'](payload);

    expect(assertions).toHaveBeenCalledTimes(1);
    const { vkeys, others } = readWitnessSet(witnessSet);
    expect(others).toEqual([]);
    const verification = await verifyVkeyWitnesses(
      txIdOfPayload(payload),
      vkeys,
    );
    expect(verification.invalid).toEqual([]);
    expect([...verification.valid.keys()]).toEqual([DEVICE_0]);
    expect(identity.creatorKeyHash).toBe(DEVICE_0);
  });

  it('signs an owner operation with the listed device key', async () => {
    const { handlers } = createHandlers();
    const payload = custodyPayload(issueGrant(), {
      requestedScopes: [requestedScopeOf(agentGrant)],
    });

    const { witnessSet } = await handlers['sign-cardano-custody-tx'](payload);

    const verification = await verifyVkeyWitnesses(
      txIdOfPayload(payload),
      readWitnessSet(witnessSet).vkeys,
    );
    expect([...verification.valid.keys()]).toEqual([DEVICE_0]);
    expect(initialState.devices).toContain(DEVICE_0);
  });

  it.each([
    [
      'network-mismatch',
      custodyPayload(creation(), { chainId: Cardano.ChainIds.Mainnet }),
    ],
    [
      'custody-device-not-listed',
      custodyPayload(issueGrant(), {
        device: { extendedAccountPublicKey: TESTNET_CUSTODY_XPUB, index: 1 },
      }),
    ],
    [
      'custody-scope-mismatch',
      custodyPayload(issueGrant(), {
        requestedScopes: [{ ...requestedScopeOf(agentGrant), cap: '1' }],
      }),
    ],
    [
      'custody-context-mismatch',
      custodyPayload(issueGrant(), { resolvedInputs: [] }),
    ],
    [
      'custody-context-mismatch',
      custodyPayload(revokeGrant(), {
        grantUtxos: [serializeResolvedInput(fundUtxo)],
      }),
    ],
    [
      'custody-unsupported-operation',
      custodyPayload(
        sweepGrants({
          before: grantedState,
          after: { ...grantedState, outstanding: 0n },
        }),
      ),
    ],
  ])(
    'runs the custody checks on the exact bytes and refuses %s before any assertion',
    async (code, payload) => {
      const { handlers, assertions } = createHandlers();

      await expect(
        handlers['sign-cardano-custody-tx'](payload),
      ).rejects.toMatchObject({ code });
      expect(assertions).not.toHaveBeenCalled();
    },
  );

  it('refuses words that derive another device key after its one assertion, without naming the derived key', async () => {
    const { handlers, assertions } = createHandlers();
    // A device key the fixture words never derive, listed and signing.
    const foreign = await deriveCustodyDeviceKey(extendedAccountPublicKey, 0);
    if (!foreign.ok) throw new Error('The foreign device key must derive');
    const foreignDevice = HexBlob(foreign.value.keyHash);
    const payload = custodyPayload(
      deviceRewrite(
        { ...initialState, devices: [foreignDevice] },
        {
          before: { ...initialState, devices: [foreignDevice] },
          signers: [foreignDevice],
        },
      ),
      { device: { extendedAccountPublicKey, index: 0 } },
    );

    const refusal = handlers['sign-cardano-custody-tx'](payload);

    await expect(refusal).rejects.toMatchObject({
      code: 'custody-device-key-mismatch',
      derivedKeyHash: DEVICE_0,
    });
    // The hosted signer forwards the code and message to the dApp, so the
    // message never carries the hash the passkey's words derive.
    await expect(refusal).rejects.not.toThrow(DEVICE_0);
    expect(assertions).toHaveBeenCalledTimes(1);
  });

  it('signs custody data for the requesting dApp with exactly the listed device key, inside one assertion', async () => {
    const { handlers, assertions } = createHandlers();

    const { origin, ...signed } = await handlers['sign-cardano-custody-data'](
      custodyDataPayload({ purpose: 'link-account' }),
      DAPP_ORIGIN,
    );

    expect(assertions).toHaveBeenCalledTimes(1);
    expect(origin).toBe(DAPP_ORIGIN);
    await expect(
      verifyCustodyDataSignature({
        ...signed,
        payload: CHALLENGE,
        address: identity.address,
        origin: DAPP_ORIGIN,
        purpose: 'link-account',
        devices: initialState.devices,
      }),
    ).resolves.toEqual({ ok: true, value: { keyHash: DEVICE_0 } });
  });

  it('binds the origin the protocol server reports, never one the payload names', async () => {
    const { handlers } = createHandlers();

    const { origin, ...signed } = await handlers['sign-cardano-custody-data'](
      custodyDataPayload({ origin: 'https://city.example' }),
      'https://evil.example',
    );

    expect(origin).toBe('https://evil.example');
    await expect(
      verifyCustodyDataSignature({
        ...signed,
        payload: CHALLENGE,
        address: identity.address,
        origin: 'https://city.example',
        purpose: 'sign-in',
        devices: initialState.devices,
      }),
    ).resolves.toEqual({ ok: false, error: { code: 'origin-mismatch' } });
  });

  it.each([
    ['malformed-request', custodyDataPayload({ payload: 'zz' })],
    [
      'custody-context-mismatch',
      custodyDataPayload({ chainId: Cardano.ChainIds.Preview }),
    ],
    [
      'custody-malformed-datum',
      custodyDataPayload({ controlUtxo: serializeResolvedInput(fundUtxo) }),
    ],
    [
      'custody-device-not-listed',
      custodyDataPayload({
        device: { extendedAccountPublicKey: TESTNET_CUSTODY_XPUB, index: 1 },
      }),
    ],
  ])(
    'refuses custody data with %s before any assertion',
    async (code, payload) => {
      const { handlers, assertions } = createHandlers();

      await expect(
        handlers['sign-cardano-custody-data'](payload, DAPP_ORIGIN),
      ).rejects.toMatchObject({ code });
      expect(assertions).not.toHaveBeenCalled();
    },
  );

  it('refuses custody data for an opaque dApp origin before any assertion', async () => {
    const { handlers, assertions } = createHandlers();

    await expect(
      handlers['sign-cardano-custody-data'](custodyDataPayload(), 'null'),
    ).rejects.toMatchObject({ code: 'malformed-request' });
    expect(assertions).not.toHaveBeenCalled();
  });

  it('refuses words that derive another device key for custody data after its one assertion, without naming the derived key', async () => {
    const { handlers, assertions } = createHandlers();
    const foreign = await deriveCustodyDeviceKey(extendedAccountPublicKey, 0);
    if (!foreign.ok) throw new Error('The foreign device key must derive');
    const listed = {
      ...initialState,
      devices: [HexBlob(foreign.value.keyHash)],
    };

    const refusal = handlers['sign-cardano-custody-data'](
      custodyDataPayload({
        device: { extendedAccountPublicKey, index: 0 },
        controlUtxo: serializeResolvedInput(
          custodyUtxo(0x10, controlOutput(listed)),
        ),
      }),
      DAPP_ORIGIN,
    );

    await expect(refusal).rejects.toMatchObject({
      code: 'custody-device-key-mismatch',
      derivedKeyHash: DEVICE_0,
    });
    await expect(refusal).rejects.not.toThrow(DEVICE_0);
    expect(assertions).toHaveBeenCalledTimes(1);
  });

  it('refuses a custody transaction sent as an ordinary transaction before any assertion', async () => {
    const { handlers, assertions } = createHandlers();

    await expect(
      handlers['sign-cardano-tx']({
        ...txPayload,
        serializedTx: serializeCustodyTransaction(issueGrant()),
      }),
    ).rejects.toMatchObject({ code: 'custody-request-required' });
    expect(assertions).not.toHaveBeenCalled();
  });

  it('signs a deposit to a custody account as an ordinary transaction', async () => {
    const { handlers, assertions } = createHandlers();
    const deposit = Serialization.Transaction.fromCore({
      id: Cardano.TransactionId('ef'.repeat(32)),
      body: {
        inputs: [{ txId: utxo[0][0].txId, index: 0 }],
        outputs: [{ address: identity.address, value: { coins: 1_000_000n } }],
        fee: 170_000n,
      },
      witness: { signatures: new Map() },
    }).toCbor();

    await expect(
      handlers['sign-cardano-tx']({ ...txPayload, serializedTx: deposit }),
    ).resolves.toMatchObject({ signatureCount: 1 });
    expect(assertions).toHaveBeenCalledTimes(1);
  });
});
