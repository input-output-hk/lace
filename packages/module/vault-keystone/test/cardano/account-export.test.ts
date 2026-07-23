import { Buffer } from 'buffer';

import {
  CryptoHDKey,
  CryptoKeypath,
  CryptoMultiAccounts,
  PathComponent,
} from '@keystonehq/bc-ur-registry';
import {
  AirGappedQrExchangeCancelledError,
  airGappedQrExchangeHook,
} from '@lace-contract/air-gapped-qr-exchange';
import {
  accountDerivationPath,
  HARDENED_OFFSET,
  KeystoneUrType,
  Xfp,
} from '@lace-lib/cardano-keystone-protocol';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildCardanoAccounts,
  exportAccounts,
  type ExportedAccountKey,
} from '../../src/cardano/account-export';

import type { State } from '@lace-contract/module';

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

const pathComponents = (path: readonly number[]): PathComponent[] =>
  path.map(
    component =>
      new PathComponent({
        index:
          component >= HARDENED_OFFSET
            ? component - HARDENED_OFFSET
            : component,
        hardened: component >= HARDENED_OFFSET,
      }),
  );

const accountHdKey = (accountIndex: number, xfpHex: string): CryptoHDKey => {
  const path = accountDerivationPath(accountIndex);
  return new CryptoHDKey({
    isMaster: false,
    key: Buffer.alloc(32, accountIndex + 1),
    chainCode: Buffer.alloc(32, accountIndex + 2),
    origin: new CryptoKeypath(
      pathComponents(path),
      Buffer.from(Xfp.fromHex(xfpHex)),
      path.length,
    ),
    name: 'Keystone',
  });
};

const buildResponseCbor = (
  indices: number[],
  masterFingerprint = '0a0b0c0d',
): Uint8Array =>
  Uint8Array.from(
    new CryptoMultiAccounts(
      Buffer.from(Xfp.fromHex(masterFingerprint)),
      indices.map(accountIndex =>
        accountHdKey(accountIndex, masterFingerprint),
      ),
      'Keystone 3 Pro',
    ).toCBOR() as Uint8Array,
  );

describe('exportAccounts', () => {
  beforeEach(() => {
    triggerSpy.mockReset();
  });

  it('runs the QR exchange with the key derivation call and expected response type', async () => {
    triggerSpy.mockReturnValue(
      of({
        urType: KeystoneUrType.AccountResponse,
        cbor: buildResponseCbor([0]),
      }),
    );

    await exportAccounts([0]);

    expect(triggerSpy).toHaveBeenCalledTimes(1);
    const options = triggerSpy.mock.calls[0][0];
    expect(options.expectedResponseType).toBe(KeystoneUrType.AccountResponse);
    expect(options.request).toMatchObject({
      urType: KeystoneUrType.AccountRequest,
    });
    expect((options.request as { cbor: Uint8Array }).cbor).toBeInstanceOf(
      Uint8Array,
    );
  });

  it('parses the response and derives the wallet id from the device fingerprint', async () => {
    triggerSpy.mockReturnValue(
      of({
        urType: KeystoneUrType.AccountResponse,
        cbor: buildResponseCbor([0], 'deadbeef'),
      }),
    );

    const result = await exportAccounts([0]);

    expect(result.walletId).toBe('keystone-deadbeef');
    expect(result.keys).toHaveLength(1);
    expect(result.keys[0].accountIndex).toBe(0);
    expect(result.keys[0].masterFingerprint).toBe('deadbeef');
    expect(result.keys[0].extendedAccountPublicKey).toBe(
      '01'.repeat(32) + '02'.repeat(32),
    );
  });

  it('rejects an export whose account index was not requested', async () => {
    triggerSpy.mockReturnValue(
      of({
        urType: KeystoneUrType.AccountResponse,
        cbor: buildResponseCbor([3]),
      }),
    );

    await expect(exportAccounts([0])).rejects.toThrow(
      /exported account index 3, expected 0/,
    );
  });

  it('rejects a response of an unexpected UR type', async () => {
    triggerSpy.mockReturnValue(
      of({ urType: 'crypto-psbt', cbor: buildResponseCbor([0]) }),
    );

    await expect(exportAccounts([0])).rejects.toThrow(/expected UR type/);
  });

  it('derives the same wallet id for different accounts of one device (xfp)', async () => {
    triggerSpy.mockReturnValue(
      of({
        urType: KeystoneUrType.AccountResponse,
        cbor: buildResponseCbor([0], 'deadbeef'),
      }),
    );
    const first = await exportAccounts([0]);

    triggerSpy.mockReturnValue(
      of({
        urType: KeystoneUrType.AccountResponse,
        cbor: buildResponseCbor([1], 'deadbeef'),
      }),
    );
    const second = await exportAccounts([1]);

    expect(second.walletId).toBe(first.walletId);
  });

  it('exports multiple accounts in a single exchange', async () => {
    triggerSpy.mockReturnValue(
      of({
        urType: KeystoneUrType.AccountResponse,
        cbor: buildResponseCbor([0, 1, 2]),
      }),
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
      of({
        urType: KeystoneUrType.AccountResponse,
        cbor: new Uint8Array([0xa0]),
      }),
    );

    await expect(exportAccounts([0])).rejects.toThrow();
  });

  it('throws when no account index is requested', async () => {
    await expect(exportAccounts([])).rejects.toThrow(/requires an account/);
    expect(triggerSpy).not.toHaveBeenCalled();
  });

  it('rejects an account index above the Keystone derivation cap', async () => {
    await expect(exportAccounts([25])).rejects.toThrow(
      'Keystone can only derive Cardano accounts #0-#24, requested #25',
    );
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

  it('builds a HardwareKeystone account per target network with xpub and fingerprint', () => {
    const accounts = buildCardanoAccounts({} as State, {
      walletId: 'wallet-1' as never,
      key,
      accountName: 'Account #0',
      targetNetworks: new Set([preprodNetworkId]),
    });

    expect(accounts).toHaveLength(1);
    const [account] = accounts;
    expect(account.accountType).toBe('HardwareKeystone');
    expect(account.blockchainName).toBe('Cardano');
    expect(account.metadata.name).toBe('Account #0');
    expect(account.blockchainSpecific).toMatchObject({
      accountIndex: 0,
      extendedAccountPublicKey: key.extendedAccountPublicKey,
      masterFingerprint: key.masterFingerprint,
    });
  });
});
