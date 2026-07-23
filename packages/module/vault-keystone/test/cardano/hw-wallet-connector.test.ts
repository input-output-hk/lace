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
import { WalletType } from '@lace-contract/wallet-repo';
import {
  accountDerivationPath,
  HARDENED_OFFSET,
  KeystoneUrType,
  Xfp,
} from '@lace-lib/cardano-keystone-protocol';
import { WRONG_DEVICE_CODE } from '@lace-lib/util-hw';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import loadHwWalletConnector from '../../src/cardano/hw-wallet-connector';

import type { State } from '@lace-contract/module';
import type { WalletId } from '@lace-contract/wallet-repo';

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

const responseCbor = (indices: number[], xfpHex = '0a0b0c0d'): Uint8Array =>
  Uint8Array.from(
    new CryptoMultiAccounts(
      Buffer.from(Xfp.fromHex(xfpHex)),
      indices.map(accountIndex => {
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
      }),
      'Keystone 3 Pro',
    ).toCBOR() as Uint8Array,
  );

const getConnector = async () =>
  loadHwWalletConnector({} as never, {} as never);

describe('keystone hw wallet connector', () => {
  beforeEach(() => {
    triggerSpy.mockReset();
  });

  it('advertises the keystone wallet type', async () => {
    const connector = await getConnector();
    expect(connector.walletType).toBe(WalletType.HardwareKeystone);
  });

  describe('createWallet', () => {
    it('exports the account over QR and derives the wallet id from the xfp', async () => {
      triggerSpy.mockReturnValue(
        of({
          urType: KeystoneUrType.AccountResponse,
          cbor: responseCbor([0]),
        }),
      );

      const connector = await getConnector();
      const wallet = await connector.createWallet({} as State, {
        blockchainName: 'Cardano',
        accountIndex: 0,
      });

      expect(wallet.type).toBe(WalletType.HardwareKeystone);
      expect(wallet.walletId).toBe('keystone-0a0b0c0d');
      expect(wallet.metadata.name).toBe('Keystone');
      expect(wallet.accounts.length).toBeGreaterThan(0);
      expect(wallet.accounts[0].accountType).toBe('HardwareKeystone');
    });

    it('rejects non-Cardano blockchains', async () => {
      const connector = await getConnector();
      await expect(
        connector.createWallet({} as State, {
          blockchainName: 'Bitcoin',
          accountIndex: 0,
        }),
      ).rejects.toThrow(/only supports Cardano/);
      expect(triggerSpy).not.toHaveBeenCalled();
    });

    it('propagates the cancelled error', async () => {
      triggerSpy.mockReturnValue(
        throwError(() => new AirGappedQrExchangeCancelledError()),
      );

      const connector = await getConnector();
      await expect(
        connector.createWallet({} as State, {
          blockchainName: 'Cardano',
          accountIndex: 0,
        }),
      ).rejects.toBeInstanceOf(AirGappedQrExchangeCancelledError);
    });

    it('throws on a malformed response', async () => {
      triggerSpy.mockReturnValue(
        of({
          urType: KeystoneUrType.AccountResponse,
          cbor: new Uint8Array([0xa0]),
        }),
      );

      const connector = await getConnector();
      await expect(
        connector.createWallet({} as State, {
          blockchainName: 'Cardano',
          accountIndex: 0,
        }),
      ).rejects.toThrow();
    });
  });

  describe('connectAccount', () => {
    it('adds an account to an existing wallet for the requested networks', async () => {
      triggerSpy.mockReturnValue(
        of({
          urType: KeystoneUrType.AccountResponse,
          cbor: responseCbor([3]),
        }),
      );

      const connector = await getConnector();
      const accounts = await connector.connectAccount({} as State, {
        walletId: 'keystone-0a0b0c0d' as WalletId,
        blockchainName: 'Cardano',
        accountIndex: 3,
        accountName: 'Account #3',
        targetNetworks: new Set([preprodNetworkId]),
      });

      expect(accounts).toHaveLength(1);
      expect(accounts[0].walletId).toBe('keystone-0a0b0c0d');
      expect(accounts[0].metadata.name).toBe('Account #3');
      expect(accounts[0].blockchainSpecific).toMatchObject({ accountIndex: 3 });
    });

    it('rejects an export scanned from a different device than the wallet', async () => {
      triggerSpy.mockReturnValue(
        of({
          urType: KeystoneUrType.AccountResponse,
          cbor: responseCbor([3]),
        }),
      );

      const connector = await getConnector();
      await expect(
        connector.connectAccount({} as State, {
          walletId: 'keystone-11223344' as WalletId,
          blockchainName: 'Cardano',
          accountIndex: 3,
          accountName: 'Account #3',
          targetNetworks: new Set([preprodNetworkId]),
        }),
      ).rejects.toMatchObject({ code: WRONG_DEVICE_CODE });
    });

    it('rejects non-Cardano blockchains', async () => {
      const connector = await getConnector();
      await expect(
        connector.connectAccount({} as State, {
          walletId: 'keystone-0a0b0c0d' as WalletId,
          blockchainName: 'Bitcoin',
          accountIndex: 3,
          accountName: 'Account #3',
          targetNetworks: new Set([preprodNetworkId]),
        }),
      ).rejects.toThrow(/only supports Cardano/);
    });
  });
});
