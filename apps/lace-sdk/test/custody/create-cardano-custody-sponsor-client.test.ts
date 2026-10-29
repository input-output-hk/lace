import { Cardano, Serialization } from '@cardano-sdk/core';
import {
  Ed25519PublicKeyHex,
  Ed25519SignatureHex,
  Hash28ByteBase16,
} from '@cardano-sdk/crypto';
import { Base64Blob, HexBlob } from '@cardano-sdk/util';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardanoCustodySponsorError } from '../../src/custody/cardano-custody-sponsor';
import { createCardanoCustodySponsorClient } from '../../src/custody/create-cardano-custody-sponsor-client';

import type { CardanoCustodySponsor } from '../../src/custody/cardano-custody-sponsor';

const BASE_URL = 'https://sponsor.example';
const API_KEY = 'sk_live_6f1d0c2e-secret';
const LEASE_ID = 'b26ee940-dd6d-4456-b6c4-8336af3364ff';
const FEE_TX_HASH = `4c08${'0'.repeat(56)}31f2`;
const COLLATERAL_TX_HASH = `1874${'1'.repeat(56)}f2d0`;

const keyCredential = (byte: string) => ({
  type: Cardano.CredentialType.KeyHash,
  hash: Hash28ByteBase16(byte.repeat(28)),
});
const scriptCredential = (byte: string) => ({
  type: Cardano.CredentialType.ScriptHash,
  hash: Hash28ByteBase16(byte.repeat(28)),
});

const SPONSOR_ADDRESS = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  keyCredential('a1'),
  keyCredential('b2'),
)
  .toAddress()
  .toBech32();
const ENTERPRISE_KEY_ADDRESS = Cardano.EnterpriseAddress.fromCredentials(
  Cardano.NetworkId.Mainnet,
  keyCredential('c3'),
)
  .toAddress()
  .toBech32();
const SCRIPT_ADDRESS = Cardano.EnterpriseAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  scriptCredential('d4'),
)
  .toAddress()
  .toBech32();
const REWARD_ADDRESS = Cardano.RewardAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  keyCredential('e5'),
)
  .toAddress()
  .toBech32();
const BYRON_ADDRESS =
  'Ae2tdPwUPEZFRbyhz3cpfC2CumGzNkFBN2L42rcUc2yjQpEkxDbkPodpMAi';
const BASE_KEY_SCRIPT_ADDRESS = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  keyCredential('a1'),
  scriptCredential('f6'),
)
  .toAddress()
  .toBech32();
const POINTER_KEY_ADDRESS = Cardano.PointerAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  keyCredential('a1'),
  {
    slot: 2_498_243n,
    txIndex: Cardano.TxIndex(27),
    certIndex: Cardano.CertIndex(3),
  },
)
  .toAddress()
  .toBech32();
const OTHER_KEY_ADDRESS = Cardano.EnterpriseAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  keyCredential('a1'),
)
  .toAddress()
  .toBech32();

/** An unsigned transaction to post, and the id the service names it by. */
const unsignedTransaction = new Serialization.Transaction(
  Serialization.TransactionBody.fromCore({
    inputs: [{ txId: Cardano.TransactionId(FEE_TX_HASH), index: 0 }],
    outputs: [
      {
        address: Cardano.PaymentAddress(SPONSOR_ADDRESS),
        value: { coins: 2_000_000n },
      },
    ],
    fee: 180_000n,
  }),
  new Serialization.TransactionWitnessSet(),
);
const TRANSACTION = HexBlob(unsignedTransaction.toCbor());
const TRANSACTION_ID = unsignedTransaction.getId();
const UNDECODABLE_TRANSACTION = HexBlob('84a400818258200000');

const VKEY = Ed25519PublicKeyHex('aa'.repeat(32));
const SIGNATURE = Ed25519SignatureHex('bb'.repeat(64));

/** A witness set as the service answers it, encoded through the Cardano SDK. */
const witnessSetCbor = (witness: Partial<Cardano.Witness> = {}): string =>
  Serialization.TransactionWitnessSet.fromCore({
    signatures: new Map([[VKEY, SIGNATURE]]),
    ...witness,
  }).toCbor();
/** The README's untagged shape: a map holding an array of one vkey witness. */
const UNTAGGED_WITNESS_SET = `a10081825820${VKEY}5840${SIGNATURE}`;

const leaseBody = () => ({
  leaseId: LEASE_ID,
  expiresAt: '2026-10-07T13:40:45.753Z',
  fee: {
    txHash: FEE_TX_HASH,
    index: 1,
    address: SPONSOR_ADDRESS,
    lovelace: 95_485_676,
  },
  collateral: {
    txHash: COLLATERAL_TX_HASH,
    index: 1,
    address: SPONSOR_ADDRESS,
    lovelace: 5_000_000,
  },
  sponsorAddress: SPONSOR_ADDRESS,
  maxSponsoredLovelace: 6_000_000,
});

const collateralBody = () => ({
  txHash: COLLATERAL_TX_HASH,
  index: 1,
  address: SPONSOR_ADDRESS,
  lovelace: 5_000_000,
  sponsorAddress: SPONSOR_ADDRESS,
  validitySeconds: 600,
});

const RELEASED = {
  status: 200,
  body: { leaseId: LEASE_ID, status: 'released' },
};

type Answer = { status: number; body?: unknown; text?: string };
type FetchFunction = (url: string, request: RequestInit) => Promise<Response>;
type ServiceErrorBody = { error: string; rule?: string; detail?: string };

/** A fetch that answers each call with the next answer, as JSON unless `text` is given. */
const fakeFetch = (...answers: Answer[]) =>
  vi.fn<FetchFunction>(async () => {
    const answer = answers.shift();
    if (answer === undefined) throw new Error('No answer left');
    const text = answer.text ?? JSON.stringify(answer.body);
    return new Response(text, {
      status: answer.status,
      headers: {
        'content-type':
          answer.text === undefined ? 'application/json' : 'text/html',
      },
    });
  });

const clientWith = (fetch: FetchFunction, baseUrl = BASE_URL) =>
  createCardanoCustodySponsorClient({ baseUrl, apiKey: API_KEY, fetch });

const requestOf = (fetch: ReturnType<typeof fakeFetch>, call = 0) => {
  const [url, request] = fetch.mock.calls[call];
  return {
    url,
    method: request.method,
    headers: request.headers as Record<string, string>,
    body: request.body,
  };
};

/** The error a call rejects with, failing the test when it resolves. */
const rejectionOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to reject');
};

/** The error a call throws, failing the test when it returns. */
const thrownBy = (call: () => unknown) => {
  try {
    call();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
};

const expectSponsorError = async (
  promise: Promise<unknown>,
  expected: {
    status: number;
    code: string;
    rule?: string;
    detail?: string;
  },
) => {
  const error = await rejectionOf(promise);
  expect(error).toBeInstanceOf(CardanoCustodySponsorError);
  expect(error).toMatchObject({
    name: 'CardanoCustodySponsorError',
    status: expected.status,
    code: expected.code,
    rule: expected.rule,
    detail: expected.detail,
  });
  const { message } = error as CardanoCustodySponsorError;
  expect(message).not.toContain(API_KEY);
  expect(JSON.stringify(error)).not.toContain(API_KEY);
};

/** Every call the interface offers, each answering one route. */
const routes: Array<{
  name: string;
  invoke: (client: CardanoCustodySponsor) => Promise<unknown>;
  method: string;
  path: string;
}> = [
  {
    name: 'lease',
    invoke: async client => client.lease(),
    method: 'POST',
    path: '/v1/leases',
  },
  {
    name: 'releaseLease',
    invoke: async client => client.releaseLease(LEASE_ID),
    method: 'DELETE',
    path: `/v1/leases/${LEASE_ID}`,
  },
  {
    name: 'signLeased',
    invoke: async client => client.signLeased(LEASE_ID, TRANSACTION),
    method: 'POST',
    path: `/v1/leases/${LEASE_ID}/witness`,
  },
  {
    name: 'collateral',
    invoke: async client => client.collateral(),
    method: 'GET',
    path: '/v1/collateral',
  },
  {
    name: 'signCollateral',
    invoke: async client => client.signCollateral(TRANSACTION),
    method: 'POST',
    path: '/v1/collateral/witness',
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createCardanoCustodySponsorClient', () => {
  describe('lease', () => {
    it('converts the 201 answer into UTxOs, a POSIX expiry and a bigint limit', async () => {
      const fetch = fakeFetch({ status: 201, body: leaseBody() });

      const lease = await clientWith(fetch).lease();

      expect(lease).toEqual({
        leaseId: LEASE_ID,
        expiresAt: Date.UTC(2026, 9, 7, 13, 40, 45, 753),
        feeUtxo: [
          { txId: FEE_TX_HASH, index: 1, address: SPONSOR_ADDRESS },
          { address: SPONSOR_ADDRESS, value: { coins: 95_485_676n } },
        ],
        collateralUtxo: [
          { txId: COLLATERAL_TX_HASH, index: 1, address: SPONSOR_ADDRESS },
          { address: SPONSOR_ADDRESS, value: { coins: 5_000_000n } },
        ],
        sponsorAddress: SPONSOR_ADDRESS,
        maxSponsoredLovelace: 6_000_000n,
      });
      expect(requestOf(fetch)).toEqual({
        url: 'https://sponsor.example/v1/leases',
        method: 'POST',
        headers: { authorization: `Bearer ${API_KEY}` },
        body: undefined,
      });
    });

    it('accepts an expiry with an explicit offset, upper-case hashes, output 0 and a zero limit', async () => {
      const body = leaseBody();
      const fetch = fakeFetch({
        status: 201,
        body: {
          ...body,
          expiresAt: '2026-10-07T15:40:45+02:00',
          fee: { ...body.fee, txHash: FEE_TX_HASH.toUpperCase(), index: 0 },
          collateral: { ...body.collateral, index: 0 },
          maxSponsoredLovelace: 0,
          extraField: 'ignored',
        },
      });

      const lease = await clientWith(fetch).lease();

      expect(lease).toMatchObject({
        expiresAt: Date.UTC(2026, 9, 7, 13, 40, 45),
        feeUtxo: [
          { txId: FEE_TX_HASH, index: 0, address: SPONSOR_ADDRESS },
          { address: SPONSOR_ADDRESS, value: { coins: 95_485_676n } },
        ],
        collateralUtxo: [
          { txId: COLLATERAL_TX_HASH, index: 0, address: SPONSOR_ADDRESS },
          { address: SPONSOR_ADDRESS, value: { coins: 5_000_000n } },
        ],
        maxSponsoredLovelace: 0n,
      });
    });

    it.each([
      { kind: 'a base key/script-stake', address: BASE_KEY_SCRIPT_ADDRESS },
      { kind: 'a pointer key', address: POINTER_KEY_ADDRESS },
      { kind: 'an enterprise key', address: ENTERPRISE_KEY_ADDRESS },
    ])('accepts $kind sponsor address', async ({ address }) => {
      const body = leaseBody();
      const fetch = fakeFetch({
        status: 201,
        body: {
          ...body,
          fee: { ...body.fee, address },
          collateral: { ...body.collateral, address },
          sponsorAddress: address,
        },
      });

      const lease = await clientWith(fetch).lease();

      expect(lease.sponsorAddress).toBe(address);
      expect(lease.feeUtxo[1].address).toBe(address);
      expect(lease.collateralUtxo[1].address).toBe(address);
    });

    it.each([
      {
        status: 429,
        body: {
          error: 'quota_exceeded',
          detail: 'open_leases: at most 5 open leases per key',
        },
      },
      {
        status: 409,
        body: {
          error: 'no_utxo_available',
          detail:
            'All 10 fee UTxOs are leased; the soonest lease expires at 2024-01-01T00:10:00.000Z',
        },
      },
      {
        status: 503,
        body: {
          error: 'out_of_funds',
          detail:
            'The pool has no fee UTxO and the reserve holds 20000000 lovelace; a split needs at least 103000000',
        },
      },
    ])(
      'rejects with the service refusal $body.error',
      async ({ status, body }) => {
        const fetch = fakeFetch({ status, body });

        await expectSponsorError(clientWith(fetch).lease(), {
          status,
          code: body.error,
          detail: body.detail,
        });
      },
    );

    it.each([
      { field: 'leaseId', change: { leaseId: '' }, calls: 1 },
      { field: 'leaseId', change: { leaseId: 7 }, calls: 1 },
      { field: 'expiresAt', change: { expiresAt: 'next Tuesday' }, calls: 2 },
      {
        field: 'expiresAt',
        change: { expiresAt: '2026-13-45T99:99:99.000Z' },
        calls: 2,
      },
      {
        field: 'expiresAt',
        change: { expiresAt: 1_791_000_000_000 },
        calls: 2,
      },
      { field: 'fee', change: { fee: null }, calls: 2 },
      { field: 'fee', change: { fee: [] }, calls: 2 },
      { field: 'collateral', change: { collateral: 'utxo' }, calls: 2 },
      {
        field: 'sponsorAddress',
        change: { sponsorAddress: SCRIPT_ADDRESS },
        calls: 2,
      },
      {
        field: 'maxSponsoredLovelace',
        change: { maxSponsoredLovelace: '6000000' },
        calls: 2,
      },
      {
        field: 'maxSponsoredLovelace',
        change: { maxSponsoredLovelace: -1 },
        calls: 2,
      },
      {
        field: 'maxSponsoredLovelace',
        change: { maxSponsoredLovelace: 2 ** 53 },
        calls: 2,
      },
    ])(
      'rejects a body with a malformed $field, releasing any lease it names',
      async ({ field, change, calls }) => {
        const fetch = fakeFetch(
          { status: 201, body: { ...leaseBody(), ...change } },
          RELEASED,
        );

        await expectSponsorError(clientWith(fetch).lease(), {
          status: 201,
          code: 'unexpected_response',
          detail: `POST /v1/leases answered with a malformed ${field}`,
        });
        expect(fetch).toHaveBeenCalledTimes(calls);
      },
    );

    it('releases the lease a refused answer names', async () => {
      const fetch = fakeFetch(
        {
          status: 201,
          body: { ...leaseBody(), sponsorAddress: SCRIPT_ADDRESS },
        },
        RELEASED,
      );

      await expectSponsorError(clientWith(fetch).lease(), {
        status: 201,
        code: 'unexpected_response',
        detail: 'POST /v1/leases answered with a malformed sponsorAddress',
      });
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(requestOf(fetch, 1)).toEqual({
        url: `https://sponsor.example/v1/leases/${LEASE_ID}`,
        method: 'DELETE',
        headers: { authorization: `Bearer ${API_KEY}` },
        body: undefined,
      });
    });

    it.each([
      {
        case: 'refused by the service',
        release: [
          { status: 410, body: { error: 'lease_expired', detail: 'expired' } },
        ],
      },
      // The fake fetch throws once it has no answer left.
      { case: 'unreachable', release: [] },
    ])(
      'reports the refused answer when the release is $case',
      async ({ release }: { release: Answer[] }) => {
        const fetch = fakeFetch(
          { status: 201, body: { ...leaseBody(), expiresAt: 'soon' } },
          ...release,
        );

        await expectSponsorError(clientWith(fetch).lease(), {
          status: 201,
          code: 'unexpected_response',
          detail: 'POST /v1/leases answered with a malformed expiresAt',
        });
        expect(fetch).toHaveBeenCalledTimes(2);
      },
    );

    it.each([
      { field: 'txHash', value: FEE_TX_HASH.slice(2) },
      { field: 'txHash', value: `${FEE_TX_HASH.slice(2)}zz` },
      { field: 'txHash', value: undefined },
      { field: 'index', value: -1 },
      { field: 'index', value: 1.5 },
      { field: 'index', value: '1' },
      { field: 'address', value: SCRIPT_ADDRESS },
      { field: 'address', value: REWARD_ADDRESS },
      { field: 'address', value: BYRON_ADDRESS },
      { field: 'address', value: SPONSOR_ADDRESS.toUpperCase() },
      { field: 'address', value: 'addr_test1notanaddress' },
      { field: 'address', value: OTHER_KEY_ADDRESS },
      { field: 'address', value: ENTERPRISE_KEY_ADDRESS },
      { field: 'lovelace', value: 0 },
      { field: 'lovelace', value: 9_007_199_254_740_992 },
      { field: 'lovelace', value: '95485676' },
    ])(
      'rejects a fee UTxO with a malformed $field ($value)',
      async ({ field, value }) => {
        const body = leaseBody();
        const fetch = fakeFetch(
          {
            status: 201,
            body: { ...body, fee: { ...body.fee, [field]: value } },
          },
          RELEASED,
        );

        await expectSponsorError(clientWith(fetch).lease(), {
          status: 201,
          code: 'unexpected_response',
          detail: `POST /v1/leases answered with a malformed fee.${field}`,
        });
      },
    );

    it.each([
      { field: 'index', value: null },
      { field: 'address', value: OTHER_KEY_ADDRESS },
    ])(
      'rejects a collateral UTxO with a malformed $field',
      async ({ field, value }) => {
        const body = leaseBody();
        const fetch = fakeFetch(
          {
            status: 201,
            body: {
              ...body,
              collateral: { ...body.collateral, [field]: value },
            },
          },
          RELEASED,
        );

        await expectSponsorError(clientWith(fetch).lease(), {
          status: 201,
          code: 'unexpected_response',
          detail: `POST /v1/leases answered with a malformed collateral.${field}`,
        });
      },
    );

    it.each([
      { case: 'a lease', body: leaseBody() },
      { case: 'a service error', body: { error: 'quota_exceeded' } },
    ])(
      'reports $case answered with 200 instead of 201 as unexpected_response',
      async ({ body }) => {
        const fetch = fakeFetch({ status: 200, body });

        await expectSponsorError(clientWith(fetch).lease(), {
          status: 200,
          code: 'unexpected_response',
          detail: 'POST /v1/leases answered with status 200 instead of 201',
        });
        expect(fetch).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe('releaseLease', () => {
    it('resolves on 200, also for a lease already released', async () => {
      const released = { leaseId: LEASE_ID, status: 'released' };
      const fetch = fakeFetch(
        { status: 200, body: released },
        { status: 200, body: released },
      );
      const client = clientWith(fetch);

      await expect(client.releaseLease(LEASE_ID)).resolves.toBeUndefined();
      await expect(client.releaseLease(LEASE_ID)).resolves.toBeUndefined();

      expect(requestOf(fetch)).toEqual({
        url: `https://sponsor.example/v1/leases/${LEASE_ID}`,
        method: 'DELETE',
        headers: { authorization: `Bearer ${API_KEY}` },
        body: undefined,
      });
    });

    it.each([
      {
        status: 404,
        body: { error: 'unknown_lease', detail: `No lease ${LEASE_ID} exists` },
      },
      {
        status: 410,
        body: {
          error: 'lease_expired',
          detail: `Lease ${LEASE_ID} has expired`,
        },
      },
      {
        status: 409,
        body: {
          error: 'lease_consumed',
          detail: `Lease ${LEASE_ID} already issued a witness`,
        },
      },
    ])('rejects with $body.error', async ({ status, body }) => {
      const fetch = fakeFetch({ status, body });

      await expectSponsorError(clientWith(fetch).releaseLease(LEASE_ID), {
        status,
        code: body.error,
        detail: body.detail,
      });
    });

    it.each([
      { field: 'leaseId', body: { leaseId: 'other', status: 'released' } },
      { field: 'status', body: { leaseId: LEASE_ID, status: 'open' } },
      { field: 'body', body: 'released' },
    ])('rejects an answer with a wrong $field', async ({ field, body }) => {
      const fetch = fakeFetch({ status: 200, body });

      await expectSponsorError(clientWith(fetch).releaseLease(LEASE_ID), {
        status: 200,
        code: 'unexpected_response',
        detail: `DELETE /v1/leases/${LEASE_ID} answered with a malformed ${field}`,
      });
    });

    it('rejects a 204 with no body', async () => {
      const fetch = vi.fn<FetchFunction>(
        async () => new Response(null, { status: 204 }),
      );

      await expectSponsorError(clientWith(fetch).releaseLease(LEASE_ID), {
        status: 204,
        code: 'unexpected_response',
        detail: `DELETE /v1/leases/${LEASE_ID} answered with status 204 instead of 200`,
      });
    });

    it('encodes the lease id as one path segment', async () => {
      const leaseId = '../collateral?x=1';
      const fetch = fakeFetch({
        status: 200,
        body: { leaseId, status: 'released' },
      });

      await clientWith(fetch).releaseLease(leaseId);

      expect(requestOf(fetch).url).toBe(
        'https://sponsor.example/v1/leases/..%2Fcollateral%3Fx%3D1',
      );
    });
  });

  describe('signLeased', () => {
    it('posts the transaction and returns the vkey witness set', async () => {
      const witnessSet = witnessSetCbor();
      const fetch = fakeFetch({
        status: 200,
        body: { witnessSet, leaseId: LEASE_ID },
      });

      await expect(
        clientWith(fetch).signLeased(LEASE_ID, TRANSACTION),
      ).resolves.toBe(witnessSet);
      expect(requestOf(fetch)).toEqual({
        url: `https://sponsor.example/v1/leases/${LEASE_ID}/witness`,
        method: 'POST',
        headers: {
          authorization: `Bearer ${API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ transaction: TRANSACTION }),
      });
    });

    it('accepts the untagged witness set encoding and returns it in lower case', async () => {
      const fetch = fakeFetch({
        status: 200,
        body: {
          witnessSet: UNTAGGED_WITNESS_SET.toUpperCase(),
          leaseId: LEASE_ID,
        },
      });

      await expect(
        clientWith(fetch).signLeased(LEASE_ID, TRANSACTION),
      ).resolves.toBe(UNTAGGED_WITNESS_SET);
    });

    it.each([
      {
        status: 422,
        body: {
          error: 'invalid_transaction',
          rule: 'uses_shared_collateral',
          detail: 'The collateral inputs are not exactly the shared collateral',
        },
      },
      {
        status: 409,
        body: {
          error: 'lease_consumed',
          detail: `Lease ${LEASE_ID} already issued a witness`,
        },
      },
      {
        status: 410,
        body: {
          error: 'lease_expired',
          detail: `Lease ${LEASE_ID} has expired`,
        },
      },
      {
        status: 410,
        body: {
          error: 'lease_expired',
          detail: `Lease ${LEASE_ID} was released`,
        },
      },
      {
        status: 404,
        body: { error: 'unknown_lease', detail: `No lease ${LEASE_ID} exists` },
      },
      {
        status: 429,
        body: {
          error: 'quota_exceeded',
          detail: 'witnesses_per_hour: at most 1 witnesses per hour per key',
        },
      },
      {
        status: 429,
        body: {
          error: 'quota_exceeded',
          detail:
            'sponsored_lovelace_per_day: at most 600000000 sponsored lovelace per day per key',
        },
      },
      {
        status: 409,
        body: {
          error: 'no_utxo_available',
          detail:
            'The pool has no collateral UTxO yet; the reserve holds 1000000000 lovelace and can be split by replenishing',
        },
      },
      {
        status: 503,
        body: {
          error: 'out_of_funds',
          detail:
            'The pool has no collateral UTxO and the reserve holds 0 lovelace',
        },
      },
      {
        status: 400,
        body: {
          error: 'invalid_request',
          detail: 'transaction: Required',
        },
      },
    ])(
      'rejects with $body.error ($status)',
      async ({ status, body }: { status: number; body: ServiceErrorBody }) => {
        const fetch = fakeFetch({ status, body });

        await expectSponsorError(
          clientWith(fetch).signLeased(LEASE_ID, TRANSACTION),
          { status, code: body.error, rule: body.rule, detail: body.detail },
        );
      },
    );

    it('rejects a witness answered for another lease', async () => {
      const fetch = fakeFetch({
        status: 200,
        body: { witnessSet: witnessSetCbor(), leaseId: 'other' },
      });

      await expectSponsorError(
        clientWith(fetch).signLeased(LEASE_ID, TRANSACTION),
        {
          status: 200,
          code: 'unexpected_response',
          detail: `POST /v1/leases/${LEASE_ID}/witness answered with a malformed leaseId`,
        },
      );
    });
  });

  describe('collateral', () => {
    it('converts the 200 answer into the shared collateral and its terms', async () => {
      const fetch = fakeFetch({ status: 200, body: collateralBody() });

      await expect(clientWith(fetch).collateral()).resolves.toEqual({
        collateralUtxo: [
          { txId: COLLATERAL_TX_HASH, index: 1, address: SPONSOR_ADDRESS },
          { address: SPONSOR_ADDRESS, value: { coins: 5_000_000n } },
        ],
        sponsorAddress: SPONSOR_ADDRESS,
        validitySeconds: 600,
      });
      expect(requestOf(fetch)).toEqual({
        url: 'https://sponsor.example/v1/collateral',
        method: 'GET',
        headers: { authorization: `Bearer ${API_KEY}` },
        body: undefined,
      });
    });

    it.each([
      {
        status: 409,
        body: {
          error: 'no_utxo_available',
          detail:
            'The pool has no collateral UTxO yet; the reserve holds 1000000000 lovelace and can be split by replenishing',
        },
      },
      {
        status: 503,
        body: {
          error: 'out_of_funds',
          detail:
            'The pool has no collateral UTxO and the reserve holds 0 lovelace',
        },
      },
    ])('rejects with $body.error', async ({ status, body }) => {
      const fetch = fakeFetch({ status, body });

      await expectSponsorError(clientWith(fetch).collateral(), {
        status,
        code: body.error,
        detail: body.detail,
      });
    });

    it('accepts output 0 at a pointer key sponsor address', async () => {
      const fetch = fakeFetch({
        status: 200,
        body: {
          ...collateralBody(),
          index: 0,
          address: POINTER_KEY_ADDRESS,
          sponsorAddress: POINTER_KEY_ADDRESS,
        },
      });

      await expect(clientWith(fetch).collateral()).resolves.toMatchObject({
        collateralUtxo: [
          { txId: COLLATERAL_TX_HASH, index: 0, address: POINTER_KEY_ADDRESS },
          { address: POINTER_KEY_ADDRESS, value: { coins: 5_000_000n } },
        ],
        sponsorAddress: POINTER_KEY_ADDRESS,
      });
    });

    it.each([
      { field: 'txHash', change: { txHash: 'f2d0' } },
      { field: 'address', change: { address: REWARD_ADDRESS } },
      { field: 'address', change: { address: OTHER_KEY_ADDRESS } },
      { field: 'address', change: { address: ENTERPRISE_KEY_ADDRESS } },
      { field: 'sponsorAddress', change: { sponsorAddress: undefined } },
      { field: 'validitySeconds', change: { validitySeconds: 0 } },
      { field: 'validitySeconds', change: { validitySeconds: 60.5 } },
      { field: 'body', change: null },
    ])('rejects a body with a malformed $field', async ({ field, change }) => {
      const fetch = fakeFetch({
        status: 200,
        body: change === null ? null : { ...collateralBody(), ...change },
      });

      await expectSponsorError(clientWith(fetch).collateral(), {
        status: 200,
        code: 'unexpected_response',
        detail: `GET /v1/collateral answered with a malformed ${field}`,
      });
    });
  });

  describe('signCollateral', () => {
    it('posts the transaction and returns the vkey witness set', async () => {
      const witnessSet = witnessSetCbor();
      const fetch = fakeFetch({
        status: 200,
        body: { witnessSet, txHash: TRANSACTION_ID },
      });

      await expect(clientWith(fetch).signCollateral(TRANSACTION)).resolves.toBe(
        witnessSet,
      );
      expect(requestOf(fetch)).toEqual({
        url: 'https://sponsor.example/v1/collateral/witness',
        method: 'POST',
        headers: {
          authorization: `Bearer ${API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ transaction: TRANSACTION }),
      });
    });

    it.each([
      {
        status: 422,
        body: {
          error: 'invalid_transaction',
          rule: 'sponsor_outflow_zero',
          detail: 'An output pays the sponsor address',
        },
      },
      {
        status: 429,
        body: {
          error: 'quota_exceeded',
          detail: 'witnesses_per_hour: at most 60 witnesses per hour per key',
        },
      },
      {
        status: 503,
        body: {
          error: 'out_of_funds',
          detail:
            'The pool has no collateral UTxO and the reserve holds 0 lovelace',
        },
      },
    ])(
      'rejects with $body.error',
      async ({ status, body }: { status: number; body: ServiceErrorBody }) => {
        const fetch = fakeFetch({ status, body });

        await expectSponsorError(
          clientWith(fetch).signCollateral(TRANSACTION),
          {
            status,
            code: body.error,
            rule: body.rule,
            detail: body.detail,
          },
        );
      },
    );

    it('accepts the transaction hash in upper case', async () => {
      const witnessSet = witnessSetCbor();
      const fetch = fakeFetch({
        status: 200,
        body: { witnessSet, txHash: TRANSACTION_ID.toUpperCase() },
      });

      await expect(clientWith(fetch).signCollateral(TRANSACTION)).resolves.toBe(
        witnessSet,
      );
    });

    it.each([
      { case: 'a short hash', body: { txHash: 'd886' } },
      { case: 'no hash', body: {} },
      {
        case: 'the hash of another transaction',
        body: { txHash: FEE_TX_HASH },
      },
    ])('rejects an answer with $case', async ({ body }) => {
      const fetch = fakeFetch({
        status: 200,
        body: { witnessSet: witnessSetCbor(), ...body },
      });

      await expectSponsorError(clientWith(fetch).signCollateral(TRANSACTION), {
        status: 200,
        code: 'unexpected_response',
        detail: 'POST /v1/collateral/witness answered with a malformed txHash',
      });
    });

    it('rejects a witness for a transaction that does not decode', async () => {
      const fetch = fakeFetch({
        status: 200,
        body: { witnessSet: witnessSetCbor(), txHash: TRANSACTION_ID },
      });

      await expectSponsorError(
        clientWith(fetch).signCollateral(UNDECODABLE_TRANSACTION),
        {
          status: 200,
          code: 'unexpected_response',
          detail:
            'POST /v1/collateral/witness answered with a malformed txHash',
        },
      );
    });
  });

  describe('witness set validation', () => {
    const bootstrap: Cardano.BootstrapWitness = {
      key: VKEY,
      signature: SIGNATURE,
      chainCode: HexBlob('cc'.repeat(32)),
      addressAttributes: Base64Blob('oA=='),
    };

    it.each([
      { case: 'not hex', witnessSet: 'zz' },
      { case: 'odd-length hex', witnessSet: `${UNTAGGED_WITNESS_SET}0` },
      { case: 'not a string', witnessSet: 42 },
      { case: 'not a map', witnessSet: '80' },
      { case: 'an empty map', witnessSet: 'a0' },
      { case: 'an empty vkey set', witnessSet: 'a10080' },
      {
        // The device and sponsor witness check refuses this map as malformed.
        case: 'an indefinite-length map',
        witnessSet: `bf0081825820${VKEY}5840${SIGNATURE}ff`,
      },
      {
        case: 'trailing bytes',
        witnessSet: `${UNTAGGED_WITNESS_SET}00`,
      },
      {
        case: 'a short vkey',
        witnessSet: `a1008182581f${'aa'.repeat(31)}5840${SIGNATURE}`,
      },
      {
        case: 'a short signature',
        witnessSet: `a10081825820${VKEY}583f${'bb'.repeat(63)}`,
      },
      {
        case: 'two vkeys',
        witnessSet: witnessSetCbor({
          signatures: new Map([
            [VKEY, SIGNATURE],
            [Ed25519PublicKeyHex('dd'.repeat(32)), SIGNATURE],
          ]),
        }),
      },
      {
        case: 'a duplicate vkey',
        witnessSet: `a10082825820${VKEY}5840${SIGNATURE}825820${VKEY}5840${'cc'.repeat(
          64,
        )}`,
      },
      {
        case: 'bootstrap witnesses',
        witnessSet: witnessSetCbor({ bootstrap: [bootstrap] }),
      },
      {
        case: 'bootstrap witnesses alone',
        witnessSet: witnessSetCbor({
          signatures: new Map(),
          bootstrap: [bootstrap],
        }),
      },
      {
        case: 'plutus data',
        witnessSet: witnessSetCbor({ datums: [42n] }),
      },
      {
        case: 'a native script',
        witnessSet: witnessSetCbor({
          scripts: [
            {
              __type: Cardano.ScriptType.Native,
              kind: Cardano.NativeScriptKind.RequireAllOf,
              scripts: [],
            },
          ],
        }),
      },
      {
        case: 'redeemers',
        witnessSet: witnessSetCbor({
          redeemers: [
            {
              purpose: Cardano.RedeemerPurpose.spend,
              index: 0,
              data: 0n,
              executionUnits: { memory: 1, steps: 1 },
            },
          ],
        }),
      },
    ])('refuses a witness set with $case', async ({ witnessSet }) => {
      const fetch = fakeFetch(
        { status: 200, body: { witnessSet, leaseId: LEASE_ID } },
        { status: 200, body: { witnessSet, txHash: TRANSACTION_ID } },
      );
      const client = clientWith(fetch);

      await expectSponsorError(client.signLeased(LEASE_ID, TRANSACTION), {
        status: 200,
        code: 'unexpected_response',
        detail: `POST /v1/leases/${LEASE_ID}/witness answered with a malformed witnessSet`,
      });
      await expectSponsorError(client.signCollateral(TRANSACTION), {
        status: 200,
        code: 'unexpected_response',
        detail:
          'POST /v1/collateral/witness answered with a malformed witnessSet',
      });
    });
  });

  describe.each(routes)('$name answers', ({ invoke, method, path }) => {
    it.each([
      {
        status: 401,
        body: { error: 'unauthorized', detail: 'A valid API key is required' },
      },
      {
        status: 429,
        body: { error: 'rate_limited', detail: 'Too many requests' },
      },
      { status: 413, body: { error: 'payload_too_large' } },
      { status: 500, body: { error: 'internal_error' } },
      {
        status: 404,
        body: { error: 'not_found', detail: `No route for ${method} ${path}` },
      },
    ])(
      'carry the service error $body.error',
      async ({ status, body }: { status: number; body: ServiceErrorBody }) => {
        const fetch = fakeFetch({ status, body });

        await expectSponsorError(invoke(clientWith(fetch)), {
          status,
          code: body.error,
          detail: body.detail,
        });
      },
    );

    it.each([
      {
        case: 'an HTML proxy page',
        answer: { status: 502, text: '<html>Bad Gateway</html>' },
      },
      { case: 'an empty body', answer: { status: 504, text: '' } },
      {
        case: 'JSON without an error code',
        answer: { status: 500, body: { message: 'boom' } },
      },
      {
        case: 'an empty error code',
        answer: { status: 400, body: { error: '' } },
      },
      {
        case: 'a non-string rule',
        answer: {
          status: 422,
          body: { error: 'invalid_transaction', rule: 3 },
        },
      },
      {
        case: 'a non-string detail',
        answer: { status: 429, body: { error: 'rate_limited', detail: {} } },
      },
      {
        case: 'a JSON array',
        answer: { status: 400, body: ['invalid_request'] },
      },
    ])(
      'report $case as unexpected_response',
      async ({ answer }: { answer: Answer }) => {
        const fetch = fakeFetch(answer);

        await expectSponsorError(invoke(clientWith(fetch)), {
          status: answer.status,
          code: 'unexpected_response',
          detail: `${method} ${path} answered with status ${answer.status} and no service error body`,
        });
      },
    );

    it('reports a non-JSON success body as unexpected_response', async () => {
      const status = method === 'POST' && path === '/v1/leases' ? 201 : 200;
      const fetch = fakeFetch({ status, text: 'OK' });

      await expectSponsorError(invoke(clientWith(fetch)), {
        status,
        code: 'unexpected_response',
        detail: `${method} ${path} answered with a malformed body`,
      });
    });

    it('passes a fetch failure through unchanged', async () => {
      const failure = new TypeError('fetch failed');
      const fetch = vi.fn<FetchFunction>(async () => {
        throw failure;
      });

      await expect(invoke(clientWith(fetch))).rejects.toBe(failure);
    });
  });

  describe('base URL', () => {
    it.each([
      {
        baseUrl: 'https://sponsor.example',
        url: 'https://sponsor.example/v1/collateral',
      },
      {
        baseUrl: 'https://sponsor.example/',
        url: 'https://sponsor.example/v1/collateral',
      },
      {
        baseUrl: 'https://sponsor.example//',
        url: 'https://sponsor.example/v1/collateral',
      },
      {
        baseUrl: 'https://sponsor.example/api',
        url: 'https://sponsor.example/api/v1/collateral',
      },
      {
        baseUrl: 'https://sponsor.example/api/',
        url: 'https://sponsor.example/api/v1/collateral',
      },
      {
        baseUrl: 'http://localhost:8787',
        url: 'http://localhost:8787/v1/collateral',
      },
      {
        baseUrl: 'http://127.0.0.1:8787/',
        url: 'http://127.0.0.1:8787/v1/collateral',
      },
      {
        baseUrl: 'http://[::1]:8787',
        url: 'http://[::1]:8787/v1/collateral',
      },
      {
        baseUrl: 'https://SPONSOR.example?',
        url: 'https://sponsor.example/v1/collateral',
      },
    ])('joins $baseUrl with the API path', async ({ baseUrl, url }) => {
      const fetch = fakeFetch({ status: 200, body: collateralBody() });

      await clientWith(fetch, baseUrl).collateral();

      expect(requestOf(fetch).url).toBe(url);
    });

    it.each([
      'sponsor.example',
      '/v1',
      'ftp://sponsor.example',
      'http://sponsor.example',
      'http://192.168.1.10:8787',
      'http://localhost.sponsor.example',
      'https://sponsor.example/?key=1',
      'https://sponsor.example/#top',
      'https://user:pass@sponsor.example',
    ])('refuses %s', baseUrl => {
      expect(() =>
        createCardanoCustodySponsorClient({ baseUrl, apiKey: API_KEY }),
      ).toThrow(
        new TypeError(
          'The fee sponsor base URL must be an absolute https URL, or http to a loopback host, without credentials, query or fragment.',
        ),
      );
    });
  });

  describe('API key', () => {
    it.each([
      { case: 'empty', apiKey: '' },
      { case: 'two lines', apiKey: 'KEYPART1\nKEYPART2-SECRET' },
      { case: 'a trailing line break', apiKey: `${API_KEY}\r\n` },
      { case: 'a NUL', apiKey: 'KEYPART1\0SECRET' },
      { case: 'a space', apiKey: 'KEYPART1 SECRET' },
      { case: 'padding inside', apiKey: 'KEY=PART' },
    ])('refuses a key that is $case without quoting it', ({ apiKey }) => {
      const error = thrownBy(() =>
        createCardanoCustodySponsorClient({ baseUrl: BASE_URL, apiKey }),
      );

      expect(error).toEqual(
        new TypeError('The fee sponsor API key is not a valid bearer token.'),
      );
      if (apiKey.length > 0) {
        expect((error as Error).message).not.toContain(apiKey);
      }
    });

    it.each([
      {
        case: 'base64url',
        apiKey: 'q3-Xz_9AbC0dEfGhIjKlMnOpQrStUvWxYz012345678',
      },
      { case: 'token68 with padding', apiKey: 'a.b~c+d/e==' },
    ])('sends a $case key as the bearer token', async ({ apiKey }) => {
      const fetch = fakeFetch({ status: 200, body: collateralBody() });

      await createCardanoCustodySponsorClient({
        baseUrl: BASE_URL,
        apiKey,
        fetch,
      }).collateral();

      expect(requestOf(fetch).headers).toEqual({
        authorization: `Bearer ${apiKey}`,
      });
    });

    it('sends no authorization header without a key', async () => {
      const fetch = fakeFetch(
        { status: 200, body: collateralBody() },
        {
          status: 200,
          body: { witnessSet: witnessSetCbor(), txHash: TRANSACTION_ID },
        },
      );
      const client = createCardanoCustodySponsorClient({
        baseUrl: 'https://app.example/sponsor',
        fetch,
      });

      await client.collateral();
      await client.signCollateral(TRANSACTION);

      expect(requestOf(fetch, 0)).toStrictEqual({
        url: 'https://app.example/sponsor/v1/collateral',
        method: 'GET',
        headers: {},
        body: undefined,
      });
      expect(requestOf(fetch, 1)).toStrictEqual({
        url: 'https://app.example/sponsor/v1/collateral/witness',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transaction: TRANSACTION }),
      });
    });

    it('refuses an http base URL to a non-loopback host without a key', () => {
      expect(() =>
        createCardanoCustodySponsorClient({
          baseUrl: 'http://app.example/sponsor',
        }),
      ).toThrow(
        new TypeError(
          'The fee sponsor base URL must be an absolute https URL, or http to a loopback host, without credentials, query or fragment.',
        ),
      );
    });

    it('keeps the key out of the client object', () => {
      const client = clientWith(fakeFetch());

      expect(Object.keys(client).sort()).toEqual([
        'collateral',
        'lease',
        'releaseLease',
        'signCollateral',
        'signLeased',
      ]);
      expect(JSON.stringify(client)).not.toContain(API_KEY);
    });
  });

  describe('default fetch', () => {
    it('uses the global fetch at call time', async () => {
      const client = createCardanoCustodySponsorClient({
        baseUrl: BASE_URL,
        apiKey: API_KEY,
      });
      const fetch = fakeFetch({ status: 200, body: collateralBody() });
      vi.stubGlobal('fetch', fetch);

      await client.collateral();

      expect(requestOf(fetch).url).toBe(
        'https://sponsor.example/v1/collateral',
      );
    });
  });
});
