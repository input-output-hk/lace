import {
  AirGappedQrExchangeCancelledError,
  airGappedQrExchangeHook,
} from '@lace-contract/air-gapped-qr-exchange';
import { WalletType } from '@lace-contract/wallet-repo';
import {
  accountDerivationPath,
  CardanoUrType,
  encodeCardanoAccountResponse,
  RequestId,
  Xfp,
} from '@lace-lib/cardano-seed-signer-protocol';
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

vi.mock('uuid', () => ({ v4: () => 'req-1' }));

const triggerSpy = vi.spyOn(airGappedQrExchangeHook, 'trigger');

const responseCbor = (indices: number[]): Uint8Array =>
  encodeCardanoAccountResponse({
    requestId: RequestId('req-1'),
    masterFingerprint: Xfp.fromHex('0a0b0c0d'),
    keys: indices.map(accountIndex => ({
      accountIndex,
      xpub: new Uint8Array(64).fill(accountIndex + 1),
      path: accountDerivationPath(accountIndex),
    })),
    deviceLabel: 'Cardano SeedSigner',
  });

const loadModules = vi.fn();
const getConnector = async () =>
  loadHwWalletConnector({ loadModules } as never, {} as never);

describe('seed signer hw wallet connector', () => {
  beforeEach(() => {
    triggerSpy.mockReset();
  });

  it('advertises the seed signer wallet type', async () => {
    const connector = await getConnector();
    expect(connector.walletType).toBe(WalletType.HardwareSeedSigner);
  });

  describe('createWallet', () => {
    it('exports the account over QR and derives the wallet id from the xpub', async () => {
      triggerSpy.mockReturnValue(
        of({ urType: CardanoUrType.Account, cbor: responseCbor([0]) }),
      );

      const connector = await getConnector();
      const wallet = await connector.createWallet({} as State, {
        blockchainName: 'Cardano',
        device: { kind: 'usb', vendorId: 0, productId: 0 } as never,
        accountIndex: 0,
      });

      expect(wallet.type).toBe(WalletType.HardwareSeedSigner);
      expect(wallet.walletId).toBeTruthy();
      expect(wallet.accounts.length).toBeGreaterThan(0);
      expect(wallet.accounts[0].accountType).toBe('HardwareSeedSigner');
    });

    it('rejects non-Cardano blockchains', async () => {
      const connector = await getConnector();
      await expect(
        connector.createWallet({} as State, {
          blockchainName: 'Bitcoin',
          device: {} as never,
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
          device: {} as never,
          accountIndex: 0,
        }),
      ).rejects.toBeInstanceOf(AirGappedQrExchangeCancelledError);
    });

    it('throws on a malformed response', async () => {
      triggerSpy.mockReturnValue(
        of({ urType: CardanoUrType.Account, cbor: new Uint8Array([0xa0]) }),
      );

      const connector = await getConnector();
      await expect(
        connector.createWallet({} as State, {
          blockchainName: 'Cardano',
          device: {} as never,
          accountIndex: 0,
        }),
      ).rejects.toThrow();
    });
  });

  describe('connectAccount', () => {
    it('adds an account to an existing wallet for the requested networks', async () => {
      triggerSpy.mockReturnValue(
        of({ urType: CardanoUrType.Account, cbor: responseCbor([3]) }),
      );

      const connector = await getConnector();
      const accounts = await connector.connectAccount({} as State, {
        walletId: 'seed-signer-0a0b0c0d' as WalletId,
        blockchainName: 'Cardano',
        accountIndex: 3,
        accountName: 'Account #3',
        targetNetworks: new Set([preprodNetworkId]),
      });

      expect(accounts).toHaveLength(1);
      expect(accounts[0].walletId).toBe('seed-signer-0a0b0c0d');
      expect(accounts[0].metadata.name).toBe('Account #3');
      expect(accounts[0].blockchainSpecific).toMatchObject({ accountIndex: 3 });
    });

    it('rejects an export scanned from a different device than the wallet', async () => {
      triggerSpy.mockReturnValue(
        of({ urType: CardanoUrType.Account, cbor: responseCbor([3]) }),
      );

      const connector = await getConnector();
      await expect(
        connector.connectAccount({} as State, {
          walletId: 'seed-signer-11223344' as WalletId,
          blockchainName: 'Cardano',
          accountIndex: 3,
          accountName: 'Account #3',
          targetNetworks: new Set([preprodNetworkId]),
        }),
      ).rejects.toMatchObject({ code: WRONG_DEVICE_CODE });
    });
  });
});
