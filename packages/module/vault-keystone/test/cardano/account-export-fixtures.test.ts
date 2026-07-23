import { Buffer } from 'buffer';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  AirGappedQrExchangeCancelledError,
  airGappedQrExchangeHook,
} from '@lace-contract/air-gapped-qr-exchange';
import { KeystoneUrType } from '@lace-lib/cardano-keystone-protocol';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { exportAccounts } from '../../src/cardano/account-export';

vi.mock('@lace-contract/cardano-context', () => ({
  CardanoAccountId: (
    walletId: string,
    accountIndex: number,
    networkMagic: number,
  ) => `${walletId}-${accountIndex}-${networkMagic}`,
  MasterFingerprint: (hex: string) => hex,
  supportedNetworkIds: new Map([['cardano-1', 1]]),
  getNetworkDetails: vi.fn(),
}));

/**
 * Fixture-backed coverage for the onboarding account-export flow. Unlike
 * account-export.test.ts (which encodes synthetic responses), this feeds the
 * committed golden device bytes through the real parser so the module is
 * proven against evidence produced by the official Keystone stack.
 */
interface Evidence {
  account: {
    request_cbor: string;
    response_cbor: string;
    decoded: {
      master_fingerprint: string;
      keys: { account_index: number; extended_public_key: string }[];
    };
  };
}

const evidence = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '../../../../lib/cardano-keystone-protocol/test/fixtures/keystone-evidence.json',
    ),
    'utf8',
  ),
) as Evidence;

const fixtureResponseCbor = (): Uint8Array =>
  new Uint8Array(Buffer.from(evidence.account.response_cbor, 'hex'));

const triggerSpy = vi.spyOn(airGappedQrExchangeHook, 'trigger');

describe('exportAccounts (golden fixtures)', () => {
  beforeEach(() => {
    triggerSpy.mockReset();
  });

  it('builds the same request bytes as the committed key derivation call', async () => {
    triggerSpy.mockReturnValue(
      of({
        urType: KeystoneUrType.AccountResponse,
        cbor: fixtureResponseCbor(),
      }),
    );

    await exportAccounts([0, 1]);

    const { request } = triggerSpy.mock.calls[0][0];
    expect(Buffer.from(request.cbor!).toString('hex')).toBe(
      evidence.account.request_cbor,
    );
  });

  it('parses the committed account-export response into the fixture xpub and fingerprint', async () => {
    triggerSpy.mockReturnValue(
      of({
        urType: KeystoneUrType.AccountResponse,
        cbor: fixtureResponseCbor(),
      }),
    );

    const result = await exportAccounts([0]);

    const expectedKey = evidence.account.decoded.keys[0];
    expect(result.keys).toHaveLength(1);
    expect(result.keys[0].accountIndex).toBe(expectedKey.account_index);
    expect(result.keys[0].extendedAccountPublicKey).toBe(
      expectedKey.extended_public_key,
    );
    expect(result.keys[0].masterFingerprint).toBe(
      evidence.account.decoded.master_fingerprint,
    );
    expect(result.walletId).toBe(
      `keystone-${evidence.account.decoded.master_fingerprint}`,
    );
  });

  it('propagates a cancelled exchange', async () => {
    triggerSpy.mockReturnValue(
      throwError(() => new AirGappedQrExchangeCancelledError()),
    );

    await expect(exportAccounts([0])).rejects.toBeInstanceOf(
      AirGappedQrExchangeCancelledError,
    );
  });

  it('throws on a malformed device response', async () => {
    triggerSpy.mockReturnValue(
      of({
        urType: KeystoneUrType.AccountResponse,
        cbor: new Uint8Array([0xa0]),
      }),
    );

    await expect(exportAccounts([0])).rejects.toThrow();
  });
});
