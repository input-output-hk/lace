import {
  AirGappedQrExchangeCancelledError,
  airGappedQrExchangeHook,
} from '@lace-contract/air-gapped-qr-exchange';
import {
  accountDerivationPath,
  CardanoUrType,
  encodeCardanoAccountResponse,
  RequestId,
  Xfp,
} from '@lace-lib/cardano-seed-signer-protocol';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildCardanoAccounts,
  exportAccounts,
  type ExportedAccountKey,
} from '../../src/cardano/account-export';

import type { State } from '@lace-contract/module';

vi.mock('uuid', () => ({ v4: () => 'req-1' }));

const preprodNetworkId = 'cardano-1' as never;

vi.mock('@lace-contract/cardano-context', () => {
  const magic = 1;
  const networkId = 'cardano-1';
  return {
    CardanoAccountId: (
      walletId: string,
      accountIndex: number,
      networkMagic: number,
    ) => `${walletId}-${accountIndex}-${networkMagic}`,
    MasterFingerprint: (hex: string) => hex,
    supportedNetworkIds: new Map([[networkId, magic]]),
    getNetworkDetails: vi.fn(() => ({
      chainId: { networkMagic: magic, networkId: 0 },
      networkId,
      networkType: 'testnet',
    })),
  };
});

const triggerSpy = vi.spyOn(airGappedQrExchangeHook, 'trigger');

const xpubFor = (seed: number): Uint8Array =>
  new Uint8Array(64).fill(seed % 256);

const buildResponseCbor = (
  indices: number[],
  masterFingerprint = '0a0b0c0d',
  requestId = RequestId('req-1'),
): Uint8Array =>
  encodeCardanoAccountResponse({
    requestId,
    masterFingerprint: Xfp.fromHex(masterFingerprint),
    keys: indices.map(accountIndex => ({
      accountIndex,
      xpub: xpubFor(accountIndex + 1),
      path: accountDerivationPath(accountIndex),
    })),
    deviceLabel: 'Cardano SeedSigner',
  });

describe('exportAccounts', () => {
  beforeEach(() => {
    triggerSpy.mockReset();
  });

  it('runs the QR exchange with the account-request and expected response type', async () => {
    triggerSpy.mockReturnValue(
      of({ urType: CardanoUrType.Account, cbor: buildResponseCbor([0]) }),
    );

    await exportAccounts([0]);

    expect(triggerSpy).toHaveBeenCalledTimes(1);
    const options = triggerSpy.mock.calls[0][0];
    expect(options.expectedResponseType).toBe(CardanoUrType.Account);
    expect(options.request).toMatchObject({
      urType: CardanoUrType.AccountRequest,
    });
    expect((options.request as { cbor: Uint8Array }).cbor).toBeInstanceOf(
      Uint8Array,
    );
  });

  it('parses the response and derives the wallet id from the device fingerprint', async () => {
    triggerSpy.mockReturnValue(
      of({
        urType: CardanoUrType.Account,
        cbor: buildResponseCbor([0], 'deadbeef'),
      }),
    );

    const result = await exportAccounts([0]);

    expect(result.walletId).toBe('seed-signer-deadbeef');
    expect(result.keys).toHaveLength(1);
    expect(result.keys[0].accountIndex).toBe(0);
    expect(result.keys[0].masterFingerprint).toBe('deadbeef');
    expect(result.keys[0].extendedAccountPublicKey).toMatch(/^[0-9a-f]+$/);
  });

  it('rejects a response whose request id does not match the request', async () => {
    triggerSpy.mockReturnValue(
      of({
        urType: CardanoUrType.Account,
        cbor: buildResponseCbor([0], '0a0b0c0d', RequestId('req-2')),
      }),
    );

    await expect(exportAccounts([0])).rejects.toThrow(/stale or mismatched/);
  });

  it('rejects an export whose account index was not requested', async () => {
    triggerSpy.mockReturnValue(
      of({ urType: CardanoUrType.Account, cbor: buildResponseCbor([3]) }),
    );

    await expect(exportAccounts([0])).rejects.toThrow(
      /exported account index 3, expected 0/,
    );
  });

  it('derives the same wallet id for different accounts of one device (xfp)', async () => {
    triggerSpy.mockReturnValue(
      of({
        urType: CardanoUrType.Account,
        cbor: buildResponseCbor([0], 'deadbeef'),
      }),
    );
    const first = await exportAccounts([0]);

    triggerSpy.mockReturnValue(
      of({
        urType: CardanoUrType.Account,
        cbor: buildResponseCbor([1], 'deadbeef'),
      }),
    );
    const second = await exportAccounts([1]);

    expect(second.walletId).toBe(first.walletId);
  });

  it('exports multiple accounts in a single exchange', async () => {
    triggerSpy.mockReturnValue(
      of({ urType: CardanoUrType.Account, cbor: buildResponseCbor([0, 1, 2]) }),
    );

    const result = await exportAccounts([0, 1, 2]);

    expect(result.keys.map(k => k.accountIndex)).toEqual([0, 1, 2]);
  });

  it('propagates the cancelled error', async () => {
    triggerSpy.mockReturnValue(
      throwError(() => new AirGappedQrExchangeCancelledError()),
    );

    await expect(exportAccounts([0])).rejects.toBeInstanceOf(
      AirGappedQrExchangeCancelledError,
    );
  });

  it('throws on a malformed response missing the master fingerprint', async () => {
    triggerSpy.mockReturnValue(
      of({ urType: CardanoUrType.Account, cbor: new Uint8Array([0xa0]) }),
    );

    await expect(exportAccounts([0])).rejects.toThrow();
  });

  it('throws when no account index is requested', async () => {
    await expect(exportAccounts([])).rejects.toThrow(/requires an account/);
    expect(triggerSpy).not.toHaveBeenCalled();
  });
});

describe('buildCardanoAccounts', () => {
  const key: ExportedAccountKey = {
    accountIndex: 0,
    extendedAccountPublicKey: '0'.repeat(
      128,
    ) as ExportedAccountKey['extendedAccountPublicKey'],
    masterFingerprint: 'deadbeef' as ExportedAccountKey['masterFingerprint'],
  };

  it('builds a HardwareSeedSigner account per target network with xpub and fingerprint', () => {
    const accounts = buildCardanoAccounts({} as State, {
      walletId: 'wallet-1' as never,
      key,
      accountName: 'Account #0',
      targetNetworks: new Set([preprodNetworkId]),
    });

    expect(accounts).toHaveLength(1);
    const [account] = accounts;
    expect(account.accountType).toBe('HardwareSeedSigner');
    expect(account.blockchainName).toBe('Cardano');
    expect(account.metadata.name).toBe('Account #0');
    expect(account.blockchainSpecific).toMatchObject({
      accountIndex: 0,
      extendedAccountPublicKey: key.extendedAccountPublicKey,
      masterFingerprint: key.masterFingerprint,
    });
  });
});
