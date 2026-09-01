import { beforeEach, describe, expect, it, vi } from 'vitest';

import loadHwWalletConnector from '../../src/addons/hw-wallet-connector-mobile';
import {
  TrezorMobileMissingDeviceIdError,
  walletIdFromTrezorDeviceId,
} from '../../src/mobile/cardano-xpub';

import type { TrezorGetPublicKeyBundleItem } from '../../src/trezor-bitcoin-connect';
import type {
  DeviceDescriptor,
  HwAccountConnector,
  HwWalletConnector,
} from '@lace-contract/onboarding-v2';

const CHAIN_CODE = '07'.repeat(32);
// The secp256k1 generator point G — a public constant, not a secret.
// prettier-ignore
const PUBLIC_KEY = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'; // gitleaks:allow

const hoisted = vi.hoisted(() => ({
  getPublicKey: vi.fn(),
}));

vi.mock('../../src/mobile/trezor-connect-bridge', () => ({
  getTrezorConnect: async () => ({
    getPublicKey: hoisted.getPublicKey,
  }),
}));

const node = (fingerprint: number) => ({
  depth: 3,
  childNum: 0x80_00_00_00,
  fingerprint,
  chainCode: CHAIN_CODE,
  publicKey: PUBLIC_KEY,
  xpub: 'zpub-ignored',
});

const bundleResponse = (deviceId?: string) =>
  hoisted.getPublicKey.mockResolvedValue({
    success: true,
    payload: [
      node(0xde_ad_be_ef),
      ...Array.from({ length: 2 }, () => node(0x01_02_03_04)),
    ],
    device: deviceId ? { features: { device_id: deviceId } } : undefined,
  });

const device: DeviceDescriptor = {
  kind: 'usb',
  vendorId: 4617,
  productId: 21_441,
  serialNumber: 'trezor-mobile',
};

const bitcoinConnector = {
  blockchainName: 'Bitcoin',
  connectHardwareAccounts: vi.fn(async () => [
    { accountId: 'bitcoin-account' },
  ]),
} as unknown as HwAccountConnector;

const loadModules = vi.fn(async () => [[bitcoinConnector]]);

const getConnector = (): HwWalletConnector =>
  (
    loadHwWalletConnector as unknown as (context: {
      loadModules: typeof loadModules;
    }) => HwWalletConnector
  )({ loadModules });

describe('trezor hw-wallet-connector (mobile)', () => {
  beforeEach(() => {
    hoisted.getPublicKey.mockReset();
    vi.mocked(bitcoinConnector.connectHardwareAccounts).mockClear();
  });

  it('is registered under the trezor onboarding option id', () => {
    expect(getConnector().id).toBe('trezor');
  });

  it('advertises both per-blockchain onboarding option ids', () => {
    expect(getConnector().optionIds).toEqual(['trezor', 'trezor-bitcoin']);
  });

  it('createWallet derives the Bitcoin wallet id from the Suite device id so Cardano and Bitcoin share one wallet', async () => {
    bundleResponse('suite-device-id');

    const wallet = await getConnector().createWallet(
      {} as never,
      { blockchainName: 'Bitcoin', accountIndex: 0 } as never,
    );

    expect(wallet.walletId).toBe(walletIdFromTrezorDeviceId('suite-device-id'));
    expect(wallet.type).toBe('HardwareTrezor');
    expect(wallet.metadata).toMatchObject({ name: 'Trezor', order: 0 });
  });

  it('createWallet builds one watch-only Bitcoin account per network', async () => {
    bundleResponse('suite-device-id');

    const wallet = await getConnector().createWallet(
      {} as never,
      { blockchainName: 'Bitcoin', accountIndex: 0 } as never,
    );

    expect(wallet.accounts).toHaveLength(2);
    for (const account of wallet.accounts) {
      expect(account.accountType).toBe('HardwareTrezor');
      expect(account.blockchainName).toBe('Bitcoin');
      expect(account.walletId).toBe(wallet.walletId);
      expect(account.metadata.name).toBe('Account #0');
    }
  });

  it('createWallet requests the fingerprint probe and both network paths in one deep-link round-trip', async () => {
    bundleResponse('suite-device-id');

    await getConnector().createWallet(
      {} as never,
      { blockchainName: 'Bitcoin', accountIndex: 4 } as never,
    );

    expect(hoisted.getPublicKey).toHaveBeenCalledTimes(1);
    const { bundle } = hoisted.getPublicKey.mock.calls[0][0] as {
      bundle: TrezorGetPublicKeyBundleItem[];
    };
    expect(bundle.map(item => item.path)).toEqual([
      "m/84'",
      "m/84'/0'/4'",
      "m/84'/1'/4'",
    ]);
  });

  it('createWallet throws when Suite omits the device id', async () => {
    bundleResponse();

    await expect(
      getConnector().createWallet(
        {} as never,
        { blockchainName: 'Bitcoin', accountIndex: 0 } as never,
      ),
    ).rejects.toThrow(TrezorMobileMissingDeviceIdError);
  });

  it('createWallet rejects unsupported blockchains', async () => {
    await expect(
      getConnector().createWallet(
        {} as never,
        { blockchainName: 'Midnight', accountIndex: 0 } as never,
      ),
    ).rejects.toThrow('Trezor mobile only supports Cardano and Bitcoin');
  });

  it('connectAccount dispatches to the connector for the requested blockchain', async () => {
    const accounts = await getConnector().connectAccount(
      {} as never,
      {
        walletId: walletIdFromTrezorDeviceId('suite-device-id'),
        blockchainName: 'Bitcoin',
        device,
        accountIndex: 1,
        accountName: 'Bitcoin #1',
        targetNetworks: new Set(),
      } as never,
    );

    expect(bitcoinConnector.connectHardwareAccounts).toHaveBeenCalledTimes(1);
    expect(accounts).toEqual([{ accountId: 'bitcoin-account' }]);
  });

  it('connectAccount requires a device descriptor', async () => {
    await expect(
      getConnector().connectAccount(
        {} as never,
        {
          walletId: walletIdFromTrezorDeviceId('suite-device-id'),
          blockchainName: 'Bitcoin',
          accountIndex: 1,
          accountName: 'Bitcoin #1',
          targetNetworks: new Set(),
        } as never,
      ),
    ).rejects.toThrow('Trezor device descriptor missing');
  });
});
