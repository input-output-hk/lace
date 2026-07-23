import { Cardano } from '@cardano-sdk/core';
import {
  AirGappedQrExchangeCancelledError,
  airGappedQrExchangeHook,
} from '@lace-contract/air-gapped-qr-exchange';
import { KeystoneUrType } from '@lace-lib/cardano-keystone-protocol';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CardanoKeystoneDataSigner } from '../../../src/cardano/signing/cardano-keystone-data-signer';

import type { GroupedAddress } from '@cardano-sdk/key-management';
import type * as CardanoContextModule from '@lace-contract/cardano-context';
import type * as ProtocolModule from '@lace-lib/cardano-keystone-protocol';
import type { BuildDataSignRequestParams } from '@lace-lib/cardano-keystone-protocol';

const dRepKeyHash = 'a3'.repeat(28);

vi.mock('@lace-contract/cardano-context', async importOriginal => {
  const actual = await importOriginal<typeof CardanoContextModule>();
  return {
    ...actual,
    deriveDRepKeyHash: vi.fn(async () => dRepKeyHash),
  };
});

const buildRequest = vi.hoisted(() =>
  vi.fn<(params: BuildDataSignRequestParams) => void>(),
);
const parseResponse = vi.hoisted(() => vi.fn());

vi.mock('@lace-lib/cardano-keystone-protocol', async importOriginal => {
  const actual = await importOriginal<typeof ProtocolModule>();
  return {
    ...actual,
    buildDataSignRequest: (params: BuildDataSignRequestParams) => {
      buildRequest(params);
      return {
        urType: actual.KeystoneUrType.DataSignRequest,
        cbor: new Uint8Array([1]),
      };
    },
    parseDataSignResponse: (result: unknown) =>
      parseResponse(result) as unknown,
  };
});

const accountXpubHex =
  'beb7e770b3d0f1932b0a2f3a63285bf9ef7d3e461d55446d6a3911d8f0ee55c0b0e2df16538508046649d0e6d5b32969555a23f2f1ebf2db2819359b0d88bd16';

/** Child public keys soft-derived from accountXpubHex at each signing path. */
const derivedSigningKeys = {
  paymentRole0Index3:
    'f339e3a7125516323a77477fbc3e36e2132cdc0743afbc77d940c1bc065dbecf',
  stakeRole2Index0:
    '012f5dc3115b8a07981e6e50f5a671e2c6fbb26c3ffde1cd1dcaf40a7fe8f160',
  dRepRole3Index0:
    '721a1176bddaefb895baf990c5b8029b59927c75036d1416780f96df7c7b4beb',
};

const paymentAddress =
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp' as Cardano.PaymentAddress;

const rewardAccount =
  'stake_test1uqehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gssrtvn' as Cardano.RewardAccount;

const dRepEnterpriseAddress = Cardano.DRepID.toAddress(
  Cardano.DRepID.cip129FromCredential({
    hash: dRepKeyHash as never,
    type: Cardano.CredentialType.KeyHash,
  }),
)!
  .toAddress()
  .toBech32() as Cardano.PaymentAddress;

const knownAddresses = [
  {
    address: paymentAddress,
    type: 0,
    index: 3,
    rewardAccount,
    stakeKeyDerivationPath: { role: 2, index: 0 },
  },
] as unknown as GroupedAddress[];

const triggerSpy = vi.spyOn(airGappedQrExchangeHook, 'trigger');

const buildSigner = (
  overrides: { masterFingerprint?: string } = { masterFingerprint: 'deadbeef' },
): CardanoKeystoneDataSigner =>
  new CardanoKeystoneDataSigner({
    accountIndex: 0,
    chainId: { networkId: 0, networkMagic: 1 } as never,
    extendedAccountPublicKey: accountXpubHex as never,
    masterFingerprint: overrides.masterFingerprint as never,
    knownAddresses,
  });

const deviceSignature = new Uint8Array(64).fill(0xcc);
const devicePublicKey = new Uint8Array(32).fill(0xdd);

describe('CardanoKeystoneDataSigner', () => {
  beforeEach(() => {
    triggerSpy.mockReset();
    buildRequest.mockClear();
    parseResponse.mockReset();
    triggerSpy.mockReturnValue(
      of({
        urType: KeystoneUrType.DataSignResponse,
        cbor: new Uint8Array([9]),
      }),
    );
    parseResponse.mockImplementation(() => ({
      requestId: buildRequest.mock.calls[0][0].requestId,
      signature: deviceSignature,
      publicKey: devicePublicKey,
    }));
  });

  it('assembles COSE_Sign1 and COSE_Key from the raw device signature', async () => {
    const result = await firstValueFrom(
      buildSigner().signData({ signWith: paymentAddress, payload: 'deadbeef' }),
    );

    expect(result.signature).toContain('cc'.repeat(64));
    expect(result.key).toContain('dd'.repeat(32));
    expect(triggerSpy.mock.calls[0][0].expectedResponseType).toBe(
      KeystoneUrType.DataSignResponse,
    );
  });

  it('sends the CIP-8 Sig_structure, derived signing key and xfp to the device', async () => {
    await firstValueFrom(
      buildSigner().signData({ signWith: paymentAddress, payload: 'deadbeef' }),
    );

    const params = buildRequest.mock.calls[0][0];
    expect(Buffer.from(params.signData).toString('hex')).toContain('deadbeef');
    expect(Buffer.from(params.signingKeyPublicKey).toString('hex')).toBe(
      derivedSigningKeys.paymentRole0Index3,
    );
    expect(Buffer.from(params.xfp).toString('hex')).toBe('deadbeef');
  });

  it('resolves a payment address to its role and index path', async () => {
    await firstValueFrom(
      buildSigner().signData({ signWith: paymentAddress, payload: 'deadbeef' }),
    );

    const params = buildRequest.mock.calls[0][0];
    expect(params.path.slice(3)).toEqual([0, 3]);
    expect(Buffer.from(params.signingKeyPublicKey).toString('hex')).toBe(
      derivedSigningKeys.paymentRole0Index3,
    );
  });

  it('resolves a reward account to the stake role path', async () => {
    await firstValueFrom(
      buildSigner().signData({ signWith: rewardAccount, payload: 'deadbeef' }),
    );

    const params = buildRequest.mock.calls[0][0];
    expect(params.path.slice(3)).toEqual([2, 0]);
    expect(Buffer.from(params.signingKeyPublicKey).toString('hex')).toBe(
      derivedSigningKeys.stakeRole2Index0,
    );
  });

  it('resolves a DRep enterprise address to the drep role path', async () => {
    await firstValueFrom(
      buildSigner().signData({
        signWith: dRepEnterpriseAddress,
        payload: 'deadbeef',
      }),
    );

    const params = buildRequest.mock.calls[0][0];
    expect(params.path.slice(3)).toEqual([3, 0]);
    expect(Buffer.from(params.signingKeyPublicKey).toString('hex')).toBe(
      derivedSigningKeys.dRepRole3Index0,
    );
  });

  it('throws for an unknown signWith address', async () => {
    await expect(
      firstValueFrom(
        buildSigner().signData({
          signWith:
            'addr_test1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg57c2qv' as Cardano.PaymentAddress,
          payload: 'deadbeef',
        }),
      ),
    ).rejects.toThrow(/Unknown signWith address/);
  });

  it('propagates the cancelled error', async () => {
    triggerSpy.mockReturnValue(
      throwError(() => new AirGappedQrExchangeCancelledError()),
    );

    await expect(
      firstValueFrom(
        buildSigner().signData({
          signWith: paymentAddress,
          payload: 'deadbeef',
        }),
      ),
    ).rejects.toBeInstanceOf(AirGappedQrExchangeCancelledError);
  });

  it('rejects a response whose request id does not match the request', async () => {
    parseResponse.mockReturnValue({
      requestId: 'stale-request-id',
      signature: deviceSignature,
      publicKey: devicePublicKey,
    });

    await expect(
      firstValueFrom(
        buildSigner().signData({
          signWith: paymentAddress,
          payload: 'deadbeef',
        }),
      ),
    ).rejects.toThrow(/stale or mismatched response/);
  });

  it('surfaces a malformed response parse error', async () => {
    parseResponse.mockImplementation(() => {
      throw new Error('cardano-sign-data-signature missing signature');
    });

    await expect(
      firstValueFrom(
        buildSigner().signData({
          signWith: paymentAddress,
          payload: 'deadbeef',
        }),
      ),
    ).rejects.toThrow(/missing signature/);
  });

  it('requires the account master fingerprint', async () => {
    await expect(
      firstValueFrom(
        buildSigner({}).signData({
          signWith: paymentAddress,
          payload: 'deadbeef',
        }),
      ),
    ).rejects.toThrow(/requires the account master fingerprint/);
  });
});
