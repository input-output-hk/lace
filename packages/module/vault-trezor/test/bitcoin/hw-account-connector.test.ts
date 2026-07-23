import {
  BitcoinNetwork,
  BitcoinNetworkId,
  supportedNetworkIds,
} from '@lace-contract/bitcoin-context';
import { WalletId } from '@lace-contract/wallet-repo';
import {
  serializeExtendedPublicKey,
  XPUB_VERSION_MAINNET,
} from '@lace-lib/bitcoin-air-gapped-protocol';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  exportBitcoinAccountKeys,
  makeBitcoinHwAccountConnector,
} from '../../src/bitcoin/hw-account-connector';

import type {
  TrezorGetPublicKeyBundleItem,
  TrezorGetPublicKeyBundleResponse,
  TrezorHdNode,
} from '../../src/trezor-bitcoin-connect';
import type { BitcoinBip32AccountProps } from '@lace-contract/bitcoin-context';
import type { BlockchainNetworkId } from '@lace-contract/network';

const XPUB_VERSION_TESTNET = 0x04_35_87_cf;

const walletId = WalletId('usb-hw-4617-21441-abc123');

const CHAIN_CODE = '07'.repeat(32);
// The secp256k1 generator point G — a public constant, not a secret.
// prettier-ignore
const PUBLIC_KEY = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'; // gitleaks:allow

const MASTER_FINGERPRINT = 0xde_ad_be_ef;
const ACCOUNT_PARENT_FINGERPRINT = 0x01_02_03_04;
const HARDENED_ZERO = 0x80_00_00_00;

const probeNode: TrezorHdNode = {
  depth: 1,
  childNum: HARDENED_ZERO + 84,
  fingerprint: MASTER_FINGERPRINT,
  chainCode: CHAIN_CODE,
  publicKey: PUBLIC_KEY,
  xpub: 'xpub-probe',
};

const accountNode = (path: string): TrezorHdNode => ({
  depth: 3,
  childNum: HARDENED_ZERO,
  fingerprint: ACCOUNT_PARENT_FINGERPRINT,
  chainCode: CHAIN_CODE,
  publicKey: PUBLIC_KEY,
  xpub: `zpub-at-${path}`,
});

const expectedXpub = (version: number) =>
  serializeExtendedPublicKey({
    version,
    depth: 3,
    parentFingerprint: ACCOUNT_PARENT_FINGERPRINT,
    childNumber: HARDENED_ZERO,
    chainCode: Uint8Array.from(Buffer.from(CHAIN_CODE, 'hex')),
    publicKey: Uint8Array.from(Buffer.from(PUBLIC_KEY, 'hex')),
  });

const successResponse = (
  bundle: TrezorGetPublicKeyBundleItem[],
): TrezorGetPublicKeyBundleResponse => ({
  success: true,
  payload: bundle.map((item, index) =>
    index === 0 ? probeNode : accountNode(item.path),
  ),
});

const getPublicKey = vi.fn(
  async ({ bundle }: { bundle: TrezorGetPublicKeyBundleItem[] }) =>
    successResponse(bundle),
);

const connect = { getPublicKey, signTransaction: vi.fn() };
const getConnect = async () => connect;

const btcSpecific = (account: {
  blockchainSpecific: unknown;
}): BitcoinBip32AccountProps =>
  account.blockchainSpecific as BitcoinBip32AccountProps;

const connector = makeBitcoinHwAccountConnector({ getConnect });

const connectAccounts = async (props: {
  accountIndex: number;
  accountName: string;
  targetNetworks: Set<BlockchainNetworkId>;
}) =>
  connector.connectHardwareAccounts({} as never, {
    walletId,
    device: {
      kind: 'usb',
      vendorId: 4617,
      productId: 21_441,
      serialNumber: 'abc123',
    },
    ...props,
  });

const allNetworks = () => new Set(supportedNetworkIds.keys());

describe('bitcoin trezor hw-account-connector', () => {
  beforeEach(() => {
    getPublicKey.mockClear();
  });

  it('serves the Bitcoin blockchain', () => {
    expect(connector.blockchainName).toBe('Bitcoin');
  });

  it('requests the fingerprint probe and one BIP-84 path per network in a single bundle', async () => {
    await connectAccounts({
      accountIndex: 3,
      accountName: 'Account #3',
      targetNetworks: allNetworks(),
    });

    expect(getPublicKey).toHaveBeenCalledTimes(1);
    expect(getPublicKey).toHaveBeenCalledWith({
      bundle: [
        { path: "m/84'", showOnTrezor: false },
        { path: "m/84'/0'/3'", coin: 'btc', showOnTrezor: false },
        { path: "m/84'/1'/3'", coin: 'test', showOnTrezor: false },
      ],
    });
  });

  it('builds one watch-only account per Bitcoin network', async () => {
    const accounts = await connectAccounts({
      accountIndex: 0,
      accountName: 'Account #0',
      targetNetworks: allNetworks(),
    });

    expect(accounts).toHaveLength(2);
    expect(accounts.map(account => account.networkType)).toEqual([
      'mainnet',
      'testnet',
    ]);
    expect(accounts.map(account => account.blockchainNetworkId)).toEqual([
      BitcoinNetworkId(BitcoinNetwork.Mainnet),
      BitcoinNetworkId(BitcoinNetwork.Testnet),
    ]);
  });

  it('builds the watch-only hardware account shape', async () => {
    const [mainnetAccount] = await connectAccounts({
      accountIndex: 0,
      accountName: 'Account #0',
      targetNetworks: allNetworks(),
    });

    expect(mainnetAccount).toEqual({
      accountType: 'HardwareTrezor',
      blockchainName: 'Bitcoin',
      blockchainNetworkId: BitcoinNetworkId(BitcoinNetwork.Mainnet),
      networkType: 'mainnet',
      walletId,
      accountId: `${walletId}-0-mainnet`,
      metadata: { name: 'Account #0' },
      blockchainSpecific: {
        accountIndex: 0,
        extendedAccountPublicKeys: {
          nativeSegWit: expectedXpub(XPUB_VERSION_MAINNET),
        },
        networkId: BitcoinNetworkId(BitcoinNetwork.Mainnet),
        masterFingerprint: 'deadbeef',
      },
    });
  });

  it('normalizes segwit-versioned device keys to plain xpub/tpub', async () => {
    const accounts = await connectAccounts({
      accountIndex: 0,
      accountName: 'Account #0',
      targetNetworks: allNetworks(),
    });

    const [mainnetKey, testnetKey] = accounts.map(
      account => btcSpecific(account).extendedAccountPublicKeys.nativeSegWit,
    );
    expect(mainnetKey.startsWith('xpub')).toBe(true);
    expect(mainnetKey).toBe(expectedXpub(XPUB_VERSION_MAINNET));
    expect(testnetKey.startsWith('tpub')).toBe(true);
    expect(testnetKey).toBe(expectedXpub(XPUB_VERSION_TESTNET));
  });

  it('stores the master fingerprint as 8-char lowercase hex on every account', async () => {
    const accounts = await connectAccounts({
      accountIndex: 0,
      accountName: 'Account #0',
      targetNetworks: allNetworks(),
    });

    for (const account of accounts) {
      expect(btcSpecific(account).masterFingerprint).toBe('deadbeef');
    }
  });

  it('zero-pads a short master fingerprint to 8 hex chars', async () => {
    getPublicKey.mockImplementationOnce(async ({ bundle }) => ({
      success: true,
      payload: bundle.map((item, index) =>
        index === 0
          ? { ...probeNode, fingerprint: 0x00_ab_cd_ef }
          : accountNode(item.path),
      ),
    }));

    const { masterFingerprint } = await exportBitcoinAccountKeys(connect, {
      accountIndex: 0,
      targetNetworks: allNetworks(),
    });

    expect(masterFingerprint).toBe('00abcdef');
  });

  it('propagates the account index and name into every account', async () => {
    const accounts = await connectAccounts({
      accountIndex: 5,
      accountName: 'Cold Storage',
      targetNetworks: allNetworks(),
    });

    for (const account of accounts) {
      expect(account.metadata.name).toBe('Cold Storage');
      expect(btcSpecific(account).accountIndex).toBe(5);
    }
    expect(accounts.map(account => account.accountId)).toEqual([
      `${walletId}-5-mainnet`,
      `${walletId}-5-testnet4`,
    ]);
  });

  it('honours a mainnet-only target network set', async () => {
    const accounts = await connectAccounts({
      accountIndex: 0,
      accountName: 'Account #0',
      targetNetworks: new Set([BitcoinNetworkId(BitcoinNetwork.Mainnet)]),
    });

    expect(accounts).toHaveLength(1);
    expect(accounts[0].networkType).toBe('mainnet');
    expect(getPublicKey.mock.calls[0][0].bundle).toHaveLength(2);
  });

  it('rejects a target network id of another blockchain', async () => {
    await expect(
      connectAccounts({
        accountIndex: 0,
        accountName: 'Account #0',
        targetNetworks: new Set(['cardano-764824073' as never]),
      }),
    ).rejects.toThrow('Invalid network id: cardano-764824073');
  });

  it('throws when the device returns a failure response', async () => {
    getPublicKey.mockResolvedValueOnce({
      success: false,
      payload: { error: 'User cancelled' },
    });

    await expect(
      connectAccounts({
        accountIndex: 0,
        accountName: 'Account #0',
        targetNetworks: allNetworks(),
      }),
    ).rejects.toThrow('Trezor getPublicKey failed: User cancelled');
  });

  it('exposes the Suite device id from the response envelope', async () => {
    getPublicKey.mockImplementationOnce(async ({ bundle }) => ({
      ...successResponse(bundle),
      device: { features: { device_id: 'suite-device-id' } },
    }));

    const { deviceId } = await exportBitcoinAccountKeys(connect, {
      accountIndex: 0,
      targetNetworks: allNetworks(),
    });

    expect(deviceId).toBe('suite-device-id');
  });

  it('leaves the device id undefined when the envelope omits it', async () => {
    const { deviceId } = await exportBitcoinAccountKeys(connect, {
      accountIndex: 0,
      targetNetworks: allNetworks(),
    });

    expect(deviceId).toBeUndefined();
  });
});
