import { Cardano, Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { encodeCustodyAccountState } from '@lace-lib/cardano-custody';
import { describe, expect, it } from 'vitest';

import { checkCardanoCustodySignDataRequest } from '../../src/signing/custody-sign-data-request';
import { CardanoCustodyRequestRefusedError } from '../../src/signing/custody-sign-request';
import { MalformedRequestError } from '../../src/signing/request-parsing';

import {
  CHALLENGE,
  control,
  controlOutput,
  custodyDataPayload,
  DAPP_ORIGIN,
  DEVICE_0,
  fundUtxo,
  identity,
  initialState,
  PREPROD,
  record,
  serializeResolvedInput,
  STRANGER_ADDRESS,
  TESTNET_CUSTODY_XPUB,
  utxo,
} from './custody-sign-request.fixtures';

type SignDataContext = Parameters<typeof checkCardanoCustodySignDataRequest>[1];

const refusalOf = async (
  payload: unknown,
  context: SignDataContext = { origin: DAPP_ORIGIN },
): Promise<unknown> =>
  checkCardanoCustodySignDataRequest(payload, context).then(
    () => {
      throw new Error('Expected the request to be refused.');
    },
    (error: unknown) => error,
  );

const expectMalformed = async (
  payload: unknown,
  field: string,
  context?: SignDataContext,
) => {
  const error = await refusalOf(payload, context);
  expect(error).toBeInstanceOf(MalformedRequestError);
  expect((error as Error).message).toContain(`"${field}"`);
};

const expectRefused = async (
  payload: unknown,
  code: string,
  reason: string,
) => {
  const error = await refusalOf(payload);
  expect(error).toBeInstanceOf(CardanoCustodyRequestRefusedError);
  expect(error).toMatchObject({ code, reason });
};

/** The applied hash of a logic outside the contract version's catalogue. */
const UNKNOWN_LOGIC = HexBlob(
  '69baa8a8c877247028c56c8130449e186e3658d541536d168f92db3d',
);
const LOGIC = Buffer.from(initialState.logic, 'hex');

const controlWith = (txOut: Partial<Cardano.TxOut>) =>
  serializeResolvedInput(
    utxo(0x10, { ...controlOutput(initialState), ...txOut }),
  );

describe('checkCardanoCustodySignDataRequest', () => {
  it('reads the account, the device, the listed devices, the payload, the purpose and the origin', async () => {
    const check = await checkCardanoCustodySignDataRequest(
      custodyDataPayload({
        payload: CHALLENGE.toUpperCase(),
        purpose: 'link-account',
      }),
      { origin: DAPP_ORIGIN },
    );

    expect(check).toEqual({
      chainId: PREPROD,
      identity,
      device: {
        extendedAccountPublicKey: TESTNET_CUSTODY_XPUB,
        index: 0,
        keyHash: DEVICE_0,
      },
      devices: initialState.devices,
      payload: CHALLENGE,
      purpose: 'link-account',
      origin: DAPP_ORIGIN,
    });
  });

  it('ignores an origin the request payload names', async () => {
    await expect(
      checkCardanoCustodySignDataRequest(
        custodyDataPayload({ origin: 'https://evil.example' }),
        { origin: DAPP_ORIGIN },
      ),
    ).resolves.toMatchObject({ origin: DAPP_ORIGIN });
  });

  describe('refuses a request it cannot read as malformed', () => {
    it.each([
      ['a payload that is not an object', null, 'payload'],
      [
        'a chain whose network id contradicts its magic',
        custodyDataPayload({ chainId: { networkId: 1, networkMagic: 1 } }),
        'chainId',
      ],
      ['no payload', custodyDataPayload({ payload: undefined }), 'payload'],
      ['an empty payload', custodyDataPayload({ payload: '' }), 'payload'],
      [
        'a payload of half a byte',
        custodyDataPayload({ payload: 'abc' }),
        'payload',
      ],
      [
        'a payload that is not hex',
        custodyDataPayload({ payload: 'zz' }),
        'payload',
      ],
      ['an unknown purpose', custodyDataPayload({ purpose: 'pay' }), 'purpose'],
      ['no purpose', custodyDataPayload({ purpose: undefined }), 'purpose'],
      [
        'a control UTxO that is not hex',
        custodyDataPayload({ controlUtxo: 'zz' }),
        'controlUtxo',
      ],
      [
        'a control UTxO with trailing bytes',
        custodyDataPayload({
          controlUtxo: `${serializeResolvedInput(control)}00`,
        }),
        'controlUtxo',
      ],
      [
        'a control UTxO that is not an unspent output',
        custodyDataPayload({ controlUtxo: '80' }),
        'controlUtxo',
      ],
      [
        'no account record',
        custodyDataPayload({ accountRecord: undefined }),
        'accountRecord',
      ],
      ['no device', custodyDataPayload({ device: undefined }), 'device'],
      [
        'a device key that is not an extended public key',
        custodyDataPayload({
          device: { extendedAccountPublicKey: 'ab', index: 0 },
        }),
        'device.extendedAccountPublicKey',
      ],
      [
        'a hardened device index',
        custodyDataPayload({
          device: {
            extendedAccountPublicKey: TESTNET_CUSTODY_XPUB,
            index: 2 ** 31,
          },
        }),
        'device.index',
      ],
    ])('%s', async (_, payload, field) => {
      await expectMalformed(payload, field);
    });

    it.each([
      ['no origin', undefined],
      ['an opaque origin', 'null'],
      ['an origin with a path', 'https://city.example/sign-in'],
      ['an origin with a trailing slash', 'https://city.example/'],
      ['an origin with an upper-case host', 'https://City.example'],
      ['an origin with its default port', 'https://city.example:443'],
      ['a URL that is not one', 'city.example'],
    ])('for %s', async (_, origin) => {
      await expectMalformed(custodyDataPayload(), 'origin', { origin });
    });

    it('before it reads the record, the control UTxO or the device listing', async () => {
      await expectMalformed(
        custodyDataPayload({
          payload: 'zz',
          accountRecord: { ...record, version: 9 },
          device: { extendedAccountPublicKey: TESTNET_CUSTODY_XPUB, index: 1 },
        }),
        'payload',
      );
    });
  });

  describe('refuses an account record that does not name the account', () => {
    it('for an unsupported contract version', async () => {
      await expectRefused(
        custodyDataPayload({
          accountRecord: { ...record, accountValidatorHash: 'cc'.repeat(28) },
        }),
        'custody-unsupported-version',
        'unsupported-contract-version',
      );
    });

    it.each([
      [
        'a stake script hash that does not re-derive',
        custodyDataPayload({
          accountRecord: { ...record, stakeScriptHash: 'dd'.repeat(28) },
        }),
      ],
      [
        'a record for another network',
        custodyDataPayload({ chainId: Cardano.ChainIds.Preview }),
      ],
    ])('for %s', async (_, payload) => {
      await expectRefused(
        payload,
        'custody-context-mismatch',
        'invalid-record',
      );
    });

    it('before it reads the control UTxO', async () => {
      await expectRefused(
        custodyDataPayload({
          accountRecord: { ...record, stakeScriptHash: 'dd'.repeat(28) },
          controlUtxo: serializeResolvedInput(fundUtxo),
        }),
        'custody-context-mismatch',
        'invalid-record',
      );
    });
  });

  describe("refuses a control UTxO that is not the account's", () => {
    it('at another address', async () => {
      await expectRefused(
        custodyDataPayload({
          controlUtxo: controlWith({ address: STRANGER_ADDRESS }),
        }),
        'custody-context-mismatch',
        'control-utxo-address',
      );
    });

    it.each([
      ['no state NFT', serializeResolvedInput(fundUtxo)],
      [
        'two state NFTs',
        controlWith({
          value: {
            coins: 2_000_000n,
            assets: new Map([[identity.stateNftAssetId, 2n]]),
          },
        }),
      ],
    ])('with %s', async (_, controlUtxo) => {
      await expectRefused(
        custodyDataPayload({ controlUtxo }),
        'custody-malformed-datum',
        'control-utxo-state-nft',
      );
    });

    it.each([
      ['no datum', controlWith({ datum: undefined })],
      [
        'only a datum hash',
        controlWith({
          datum: undefined,
          datumHash: Serialization.PlutusData.fromCore(
            controlOutput(initialState).datum!,
          ).hash(),
        }),
      ],
      ['a datum that is not an account state', controlWith({ datum: 42n })],
      [
        'a datum whose first field is not a logic hash',
        controlWith({
          datum: { constructor: 0n, fields: { items: [{ items: [] }] } },
        }),
      ],
      [
        'a datum whose second field is not a list of key hashes',
        controlWith({
          datum: { constructor: 0n, fields: { items: [LOGIC, 42n] } },
        }),
      ],
      [
        'a datum with a logic and no device list',
        controlWith({
          datum: { constructor: 0n, fields: { items: [LOGIC] } },
        }),
      ],
      [
        'a datum under another constructor',
        controlWith({
          datum: { constructor: 1n, fields: { items: [{ items: [] }] } },
        }),
      ],
    ])('with %s', async (_, controlUtxo) => {
      await expectRefused(
        custodyDataPayload({ controlUtxo }),
        'custody-malformed-datum',
        'control-utxo-datum',
      );
    });
  });

  it('refuses a device its reported state does not list', async () => {
    const error = await refusalOf(
      custodyDataPayload({
        device: { extendedAccountPublicKey: TESTNET_CUSTODY_XPUB, index: 1 },
      }),
    );

    expect(error).toMatchObject({
      code: 'custody-device-not-listed',
      reason: 'not-listed',
    });
  });

  it('accepts a device listed among others', async () => {
    const devices = [HexBlob('ee'.repeat(28)), HexBlob(DEVICE_0)];

    await expect(
      checkCardanoCustodySignDataRequest(
        custodyDataPayload({
          controlUtxo: serializeResolvedInput(
            utxo(0x10, controlOutput({ ...initialState, devices })),
          ),
        }),
        { origin: DAPP_ORIGIN },
      ),
    ).resolves.toMatchObject({ devices });
  });

  describe('refuses a control state under a logic outside the catalogue', () => {
    const unknownLogicControl = (devices: readonly HexBlob[]) =>
      controlWith({
        datum: encodeCustodyAccountState({
          ...initialState,
          logic: UNKNOWN_LOGIC,
          devices: [...devices],
        }),
      });

    it('even when it lists the device', async () => {
      const error = await refusalOf(
        custodyDataPayload({
          controlUtxo: unknownLogicControl(initialState.devices),
        }),
      );

      expect(error).toBeInstanceOf(CardanoCustodyRequestRefusedError);
      expect(error).toMatchObject({
        code: 'custody-unsupported-version',
        reason: 'unknown-logic',
        detail: { code: 'unknown-logic', logic: UNKNOWN_LOGIC },
      });
    });

    it('before it reads the device list', async () => {
      await expectRefused(
        custodyDataPayload({
          controlUtxo: controlWith({
            datum: {
              constructor: 0n,
              fields: { items: [Buffer.from(UNKNOWN_LOGIC, 'hex'), 42n] },
            },
          }),
        }),
        'custody-unsupported-version',
        'unknown-logic',
      );
    });
  });

  // The contract keeps the logic first and the devices second under every
  // logic; the signer reads nothing else, so a control state with other
  // fields after them still names its devices.
  it.each<[string, Cardano.PlutusData[]]>([
    ['more fields', [0n, 0n, { items: [] }, 0n, 0n]],
    ['other fields', [42n]],
    ['no other field', []],
  ])('reads the devices of a control state with %s', async (_, rest) => {
    const listed = encodeCustodyAccountState(
      initialState,
    ) as Cardano.ConstrPlutusData;
    const [logic, devices] = listed.fields.items;

    await expect(
      checkCardanoCustodySignDataRequest(
        custodyDataPayload({
          controlUtxo: controlWith({
            datum: {
              constructor: 0n,
              fields: { items: [logic, devices, ...rest] },
            },
          }),
        }),
        { origin: DAPP_ORIGIN },
      ),
    ).resolves.toMatchObject({ devices: initialState.devices });
  });
});
