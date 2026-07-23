import {
  BitcoinNetwork,
  BitcoinNetworkId,
  supportedNetworkIds,
} from '@lace-contract/bitcoin-context';
import { WalletId } from '@lace-contract/wallet-repo';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeBitcoinHwAccountConnector } from '../../src/bitcoin/hw-account-connector';

import type { LedgerBitcoinTransport } from '../../src/ledger-bitcoin-transport';
import type { BitcoinBip32AccountProps } from '@lace-contract/bitcoin-context';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { DeviceDescriptor } from '@lace-lib/util-hw';

const walletId = WalletId('usb-hw-11415-4117-abc123');

const device: DeviceDescriptor = {
  kind: 'usb',
  vendorId: 11415,
  productId: 4117,
  serialNumber: 'abc123',
};

const transport = {
  getMasterFingerprint: vi.fn(async () => 'deadbeef'),
  getExtendedPubkey: vi.fn(
    async (_descriptor: DeviceDescriptor, path: string) => `xpub-at-${path}`,
  ),
  signPsbt: vi.fn(),
} satisfies LedgerBitcoinTransport;

const btcSpecific = (account: {
  blockchainSpecific: unknown;
}): BitcoinBip32AccountProps =>
  account.blockchainSpecific as BitcoinBip32AccountProps;

const connector = makeBitcoinHwAccountConnector({ transport });

const connect = async (props: {
  accountIndex: number;
  accountName: string;
  targetNetworks: Set<BlockchainNetworkId>;
}) =>
  connector.connectHardwareAccounts({} as never, {
    walletId,
    device,
    ...props,
  });

const allNetworks = () => new Set(supportedNetworkIds.keys());

/**
 * The shape @ledgerhq transports throw when the open Bitcoin app refuses a
 * silent xpub export for another network's coin type.
 */
const silentExportRefusedError = (): Error => {
  const error = new Error('Ledger device: UNKNOWN_ERROR (0x6a82)');
  error.name = 'TransportStatusError';
  (error as Error & { statusCode: number }).statusCode = 0x6a_82;
  return error;
};

describe('bitcoin ledger hw-account-connector', () => {
  beforeEach(() => {
    transport.getMasterFingerprint.mockClear();
    transport.getExtendedPubkey.mockClear();
  });

  it('serves the Bitcoin blockchain', () => {
    expect(connector.blockchainName).toBe('Bitcoin');
  });

  it('builds one watch-only account per Bitcoin network', async () => {
    const accounts = await connect({
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

  it('derives the BIP-84 native-segwit path per network coin type', async () => {
    await connect({
      accountIndex: 3,
      accountName: 'Account #3',
      targetNetworks: allNetworks(),
    });

    expect(transport.getExtendedPubkey).toHaveBeenCalledTimes(2);
    expect(transport.getExtendedPubkey).toHaveBeenNthCalledWith(
      1,
      device,
      "m/84'/0'/3'",
    );
    expect(transport.getExtendedPubkey).toHaveBeenNthCalledWith(
      2,
      device,
      "m/84'/1'/3'",
    );
  });

  it('fetches the master fingerprint once for both networks', async () => {
    const accounts = await connect({
      accountIndex: 0,
      accountName: 'Account #0',
      targetNetworks: allNetworks(),
    });

    expect(transport.getMasterFingerprint).toHaveBeenCalledTimes(1);
    expect(transport.getMasterFingerprint).toHaveBeenCalledWith(device);
    for (const account of accounts) {
      expect(btcSpecific(account).masterFingerprint).toBe('deadbeef');
    }
  });

  it('builds the watch-only hardware account shape', async () => {
    const [mainnetAccount] = await connect({
      accountIndex: 0,
      accountName: 'Account #0',
      targetNetworks: allNetworks(),
    });

    expect(mainnetAccount).toEqual({
      accountType: 'HardwareLedger',
      blockchainName: 'Bitcoin',
      blockchainNetworkId: BitcoinNetworkId(BitcoinNetwork.Mainnet),
      networkType: 'mainnet',
      walletId,
      accountId: `${walletId}-0-mainnet`,
      metadata: { name: 'Account #0' },
      blockchainSpecific: {
        accountIndex: 0,
        extendedAccountPublicKeys: { nativeSegWit: "xpub-at-m/84'/0'/0'" },
        networkId: BitcoinNetworkId(BitcoinNetwork.Mainnet),
        masterFingerprint: 'deadbeef',
      },
    });
  });

  it('propagates the account index and name into every account', async () => {
    const accounts = await connect({
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
    const accounts = await connect({
      accountIndex: 0,
      accountName: 'Account #0',
      targetNetworks: new Set([BitcoinNetworkId(BitcoinNetwork.Mainnet)]),
    });

    expect(accounts).toHaveLength(1);
    expect(accounts[0].networkType).toBe('mainnet');
    expect(transport.getExtendedPubkey).toHaveBeenCalledTimes(1);
  });

  it('rejects a target network id of another blockchain', async () => {
    await expect(
      connect({
        accountIndex: 0,
        accountName: 'Account #0',
        targetNetworks: new Set(['cardano-764824073' as never]),
      }),
    ).rejects.toThrow('Invalid network id: cardano-764824073');
  });

  it('skips a network whose coin type the open app refuses to export', async () => {
    transport.getExtendedPubkey.mockImplementation(
      async (_descriptor, path) => {
        if (path.startsWith("m/84'/1'")) throw silentExportRefusedError();
        return `xpub-at-${path}`;
      },
    );

    const accounts = await connect({
      accountIndex: 0,
      accountName: 'Account #0',
      targetNetworks: allNetworks(),
    });

    expect(accounts).toHaveLength(1);
    expect(accounts[0].networkType).toBe('mainnet');
    expect(transport.getExtendedPubkey).toHaveBeenCalledTimes(2);
  });

  it('skips a refused network when the refusal kept its message but lost its statusCode', async () => {
    transport.getExtendedPubkey.mockImplementation(
      async (_descriptor, path) => {
        if (path.startsWith("m/84'/1'")) {
          const error = new Error('Ledger device: UNKNOWN_ERROR (0x6a82)');
          error.name = 'TransportStatusError';
          throw error;
        }
        return `xpub-at-${path}`;
      },
    );

    const accounts = await connect({
      accountIndex: 0,
      accountName: 'Account #0',
      targetNetworks: allNetworks(),
    });

    expect(accounts).toHaveLength(1);
    expect(accounts[0].networkType).toBe('mainnet');
  });

  it('keeps the testnet account when only the mainnet export is refused', async () => {
    transport.getExtendedPubkey.mockImplementation(
      async (_descriptor, path) => {
        if (path.startsWith("m/84'/0'")) throw silentExportRefusedError();
        return `xpub-at-${path}`;
      },
    );

    const accounts = await connect({
      accountIndex: 0,
      accountName: 'Account #0',
      targetNetworks: allNetworks(),
    });

    expect(accounts).toHaveLength(1);
    expect(accounts[0].networkType).toBe('testnet');
  });

  it('throws the refusal when the app serves none of the target networks', async () => {
    transport.getExtendedPubkey.mockImplementation(async () => {
      throw silentExportRefusedError();
    });

    await expect(
      connect({
        accountIndex: 0,
        accountName: 'Account #0',
        targetNetworks: allNetworks(),
      }),
    ).rejects.toThrow('UNKNOWN_ERROR (0x6a82)');
  });

  it('propagates export errors that are not a silent export refusal', async () => {
    transport.getExtendedPubkey.mockImplementation(async () => {
      throw new Error('Ledger device: INS_NOT_SUPPORTED (0x6d00)');
    });

    await expect(
      connect({
        accountIndex: 0,
        accountName: 'Account #0',
        targetNetworks: allNetworks(),
      }),
    ).rejects.toThrow('INS_NOT_SUPPORTED');
  });
});
