import { HexBlob } from '@cardano-sdk/util';
import { signCardanoCustodyDataWithWords } from '@lace-contract/cardano-context';
import * as CustodyLibrary from '@lace-lib/cardano-custody';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CardanoCustodyDataSignatureError,
  verifyCardanoCustodyDataSignature,
} from '../../src/custody/verify-cardano-custody-data-signature';

import {
  DEVICE_0,
  DEVICE_1,
  identity,
  PREPROD,
  words,
} from './custody-fixtures';

vi.mock('@lace-lib/cardano-custody', async importOriginal => {
  const actual = await importOriginal<typeof CustodyLibrary>();
  return {
    ...actual,
    verifyCustodyDataSignature: vi.fn(actual.verifyCustodyDataSignature),
  };
});

/** `Sign in to city.example, nonce 42` in UTF-8. */
const CHALLENGE = HexBlob(
  Buffer.from('Sign in to city.example, nonce 42').toString('hex'),
);
const ORIGIN = 'https://city.example';

const signed = async () =>
  signCardanoCustodyDataWithWords({
    words,
    address: identity.address,
    origin: ORIGIN,
    purpose: 'sign-in',
    payload: CHALLENGE,
    deviceIndex: 0,
    expectedKeyHash: DEVICE_0,
    contractVersion: CustodyLibrary.CURRENT_CUSTODY_CONTRACT_VERSION,
    networkMagic: PREPROD.networkMagic,
  });

const verify = async (
  overrides: Partial<
    Parameters<typeof verifyCardanoCustodyDataSignature>[0]
  > = {},
) =>
  verifyCardanoCustodyDataSignature({
    ...(await signed()),
    payload: CHALLENGE,
    address: identity.address,
    origin: ORIGIN,
    purpose: 'sign-in',
    devices: [DEVICE_0],
    ...overrides,
  });

describe('verifyCardanoCustodyDataSignature', () => {
  afterEach(() => {
    vi.mocked(CustodyLibrary.verifyCustodyDataSignature).mockClear();
  });

  it('names the listed device whose key signed', async () => {
    const verified = await verify();

    expect(verified.unwrap()).toEqual({ keyHash: DEVICE_0 });
  });

  it.each([
    ['payload-mismatch', { payload: 'deadbeef' }],
    [
      'address-mismatch',
      {
        address:
          'addr_test1vz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzerspjrlsz',
      },
    ],
    ['origin-mismatch', { origin: 'https://evil.example' }],
    ['purpose-mismatch', { purpose: 'link-account' as const }],
    ['invalid-address', { address: 'not an address' }],
    ['invalid-payload', { payload: '' }],
    ['invalid-origin', { origin: 'city.example' }],
    ['invalid-purpose', { purpose: 'pay' as 'sign-in' }],
    ['malformed-signature', { signature: 'zz' }],
    ['malformed-key', { key: '80' }],
  ])('refuses with %s', async (reason, overrides) => {
    const verified = await verify(overrides);

    expect(verified.isErr() && verified.error).toBeInstanceOf(
      CardanoCustodyDataSignatureError,
    );
    expect(verified.isErr() && verified.error).toMatchObject({
      code: 'custody-data-signature',
      reason,
      detail: undefined,
    });
  });

  it('refuses a signature by a device the account does not list, naming its key hash', async () => {
    const verified = await verify({ devices: [DEVICE_1] });

    expect(verified.isErr() && verified.error).toMatchObject({
      reason: 'device-not-listed',
      detail: { keyHash: DEVICE_0 },
    });
  });

  it('refuses a signature presented with another key', async () => {
    const other = await signCardanoCustodyDataWithWords({
      words,
      address: identity.address,
      origin: ORIGIN,
      purpose: 'sign-in',
      payload: CHALLENGE,
      deviceIndex: 1,
      expectedKeyHash: DEVICE_1,
      contractVersion: CustodyLibrary.CURRENT_CUSTODY_CONTRACT_VERSION,
      networkMagic: PREPROD.networkMagic,
    });

    const verified = await verify({ key: other.key, devices: [DEVICE_1] });

    expect(verified.isErr() && verified.error).toMatchObject({
      reason: 'invalid-signature',
    });
  });

  it('never rejects, even when verification itself fails', async () => {
    const failure = new Error('crypto unavailable');
    vi.mocked(CustodyLibrary.verifyCustodyDataSignature).mockRejectedValueOnce(
      failure,
    );

    const verified = await verify();

    expect(verified.isErr() && verified.error).toMatchObject({
      reason: 'invalid-signature',
      detail: failure,
    });
  });
});
