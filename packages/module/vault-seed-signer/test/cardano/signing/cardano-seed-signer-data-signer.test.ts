import { Cardano } from '@cardano-sdk/core';
import {
  AirGappedQrExchangeCancelledError,
  airGappedQrExchangeHook,
} from '@lace-contract/air-gapped-qr-exchange';
import { CardanoUrType } from '@lace-lib/cardano-seed-signer-protocol';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CardanoSeedSignerDataSigner } from '../../../src/cardano/signing/cardano-seed-signer-data-signer';

import type { GroupedAddress } from '@cardano-sdk/key-management';
import type * as ProtocolModule from '@lace-lib/cardano-seed-signer-protocol';
import type { BuildCip8RequestParams } from '@lace-lib/cardano-seed-signer-protocol';

const dRepKeyHash = 'a3'.repeat(28);

vi.mock('@lace-contract/cardano-context', () => ({
  deriveDRepKeyHash: vi.fn(async () => dRepKeyHash),
}));

const buildRequest = vi.hoisted(() =>
  vi.fn<(params: BuildCip8RequestParams) => void>(),
);
const parseResponse = vi.hoisted(() => vi.fn());

vi.mock('@lace-lib/cardano-seed-signer-protocol', async importOriginal => {
  const actual = await importOriginal<typeof ProtocolModule>();
  return {
    ...actual,
    buildCip8Request: (params: BuildCip8RequestParams) => {
      buildRequest(params);
      return {
        urType: actual.CardanoUrType.Cip8SignRequest,
        cbor: new Uint8Array([1]),
      };
    },
    parseCip8Response: (cbor: Uint8Array) => parseResponse(cbor) as unknown,
  };
});

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

const buildSigner = (): CardanoSeedSignerDataSigner =>
  new CardanoSeedSignerDataSigner({
    accountIndex: 0,
    chainId: { networkId: 0, networkMagic: 1 } as never,
    extendedAccountPublicKey: '0'.repeat(128) as never,
    masterFingerprint: 'deadbeef' as never,
    knownAddresses,
  });

const okResponse = {
  signature: new Uint8Array([0xaa]),
  key: new Uint8Array([0xbb]),
  coseSign1: new Uint8Array([0x11, 0x22]),
  coseKey: new Uint8Array([0x33, 0x44]),
};

describe('CardanoSeedSignerDataSigner', () => {
  beforeEach(() => {
    triggerSpy.mockReset();
    buildRequest.mockClear();
    parseResponse.mockReset();
    triggerSpy.mockReturnValue(
      of({ urType: CardanoUrType.Cip8SignResponse, cbor: new Uint8Array([9]) }),
    );
    parseResponse.mockImplementation(() => ({
      ...okResponse,
      requestId: buildRequest.mock.calls[0][0].requestId,
    }));
  });

  it('returns the COSE_Sign1 and COSE_Key as signature and key hex', async () => {
    const result = await firstValueFrom(
      buildSigner().signData({ signWith: paymentAddress, payload: 'deadbeef' }),
    );

    expect(result.signature).toBe('1122');
    expect(result.key).toBe('3344');
    expect(triggerSpy.mock.calls[0][0].expectedResponseType).toBe(
      CardanoUrType.Cip8SignResponse,
    );
  });

  it('resolves a payment address to its role and index path', async () => {
    await firstValueFrom(
      buildSigner().signData({ signWith: paymentAddress, payload: 'deadbeef' }),
    );

    const params = buildRequest.mock.calls[0][0];
    expect(params.signingPath.index).toBe(3);
    expect(params.signingPath.path.slice(3)).toEqual([0, 3]);
  });

  it('resolves a reward account to the stake role path', async () => {
    await firstValueFrom(
      buildSigner().signData({ signWith: rewardAccount, payload: 'deadbeef' }),
    );

    const params = buildRequest.mock.calls[0][0];
    expect(params.signingPath.path.slice(3)).toEqual([2, 0]);
  });

  it('resolves a DRep enterprise address to the drep role path', async () => {
    await firstValueFrom(
      buildSigner().signData({
        signWith: dRepEnterpriseAddress,
        payload: 'deadbeef',
      }),
    );

    const params = buildRequest.mock.calls[0][0];
    expect(params.signingPath.path.slice(3)).toEqual([3, 0]);
  });

  it('throws for an unknown signWith reward account', async () => {
    await expect(
      firstValueFrom(
        buildSigner().signData({
          signWith:
            'stake1uyehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gh6ffgw' as Cardano.RewardAccount,
          payload: 'deadbeef',
        }),
      ),
    ).rejects.toThrow(/Unknown signWith reward account/);
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
      ...okResponse,
      requestId: 'stale-request-id',
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
      throw new Error('cardano-cip8-sig-res missing cose_sign1');
    });

    await expect(
      firstValueFrom(
        buildSigner().signData({
          signWith: paymentAddress,
          payload: 'deadbeef',
        }),
      ),
    ).rejects.toThrow(/missing cose_sign1/);
  });
});
