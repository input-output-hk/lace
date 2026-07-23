import { supportedNetworkIds as bitcoinSupportedNetworkIds } from '@lace-contract/bitcoin-context';
import { supportedNetworkIds as cardanoSupportedNetworkIds } from '@lace-contract/cardano-context';
import { HardwareWalletId, WalletId } from '@lace-contract/wallet-repo';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeLoadHwWalletConnector } from '../src/hw-wallet-connector';

import type {
  HwAccountConnector,
  HwWalletConnector,
} from '@lace-contract/onboarding-v2';
import type { DeviceDescriptor } from '@lace-lib/util-hw';

const device: DeviceDescriptor = {
  kind: 'usb',
  vendorId: 11415,
  productId: 4117,
  serialNumber: 'abc123',
};

const cardanoConnector = {
  blockchainName: 'Cardano',
  connectHardwareAccounts: vi.fn(async () => [
    { accountId: 'cardano-account' },
  ]),
} as unknown as HwAccountConnector;

const bitcoinConnector = {
  blockchainName: 'Bitcoin',
  connectHardwareAccounts: vi.fn(async () => [
    { accountId: 'bitcoin-account' },
  ]),
} as unknown as HwAccountConnector;

const loadModules = vi.fn(async () => [[cardanoConnector, bitcoinConnector]]);

const getConnector = (): HwWalletConnector =>
  makeLoadHwWalletConnector()(
    { loadModules } as never,
    {} as never,
  ) as HwWalletConnector;

const connectorCalls = (connector: HwAccountConnector) =>
  vi.mocked(connector.connectHardwareAccounts).mock.calls;

describe('ledger hw-wallet-connector', () => {
  beforeEach(() => {
    vi.mocked(cardanoConnector.connectHardwareAccounts).mockClear();
    vi.mocked(bitcoinConnector.connectHardwareAccounts).mockClear();
  });

  it('is registered under the ledger onboarding option id', () => {
    expect(getConnector().id).toBe('ledger');
  });

  it('advertises both per-blockchain onboarding option ids', () => {
    expect(getConnector().optionIds).toEqual(['ledger', 'ledger-bitcoin']);
  });

  it('createWallet dispatches Cardano to the Cardano connector with Cardano networks', async () => {
    const wallet = await getConnector().createWallet(
      {} as never,
      { blockchainName: 'Cardano', device, accountIndex: 0 } as never,
    );

    expect(bitcoinConnector.connectHardwareAccounts).not.toHaveBeenCalled();
    const [, props] = connectorCalls(cardanoConnector)[0];
    expect(props.targetNetworks).toEqual(
      new Set(cardanoSupportedNetworkIds.keys()),
    );
    expect(props.walletId).toBe(HardwareWalletId(device));
    expect(wallet.accounts).toEqual([{ accountId: 'cardano-account' }]);
  });

  it('createWallet dispatches Bitcoin to the Bitcoin connector with Bitcoin networks', async () => {
    const wallet = await getConnector().createWallet(
      {} as never,
      { blockchainName: 'Bitcoin', device, accountIndex: 2 } as never,
    );

    expect(cardanoConnector.connectHardwareAccounts).not.toHaveBeenCalled();
    const [, props] = connectorCalls(bitcoinConnector)[0];
    expect(props.targetNetworks).toEqual(
      new Set(bitcoinSupportedNetworkIds.keys()),
    );
    expect(props.accountIndex).toBe(2);
    expect(props.accountName).toBe('Account #2');
    expect(wallet.walletId).toBe(HardwareWalletId(device));
    expect(wallet.type).toBe('HardwareLedger');
    expect(wallet.accounts).toEqual([{ accountId: 'bitcoin-account' }]);
  });

  it('createWallet requires a connected device', async () => {
    await expect(
      getConnector().createWallet(
        {} as never,
        { blockchainName: 'Bitcoin', accountIndex: 0 } as never,
      ),
    ).rejects.toThrow('Ledger wallet creation requires a connected device');
  });

  it('createWallet rejects a blockchain without a registered connector', async () => {
    await expect(
      getConnector().createWallet(
        {} as never,
        { blockchainName: 'Midnight', device, accountIndex: 0 } as never,
      ),
    ).rejects.toThrow('No hw account connector for Midnight on Ledger');
  });

  it('connectAccount forwards the caller target networks to the Bitcoin connector', async () => {
    const walletId = WalletId('usb-hw-11415-4117-abc123');
    const targetNetworks = new Set([[...bitcoinSupportedNetworkIds.keys()][0]]);

    const accounts = await getConnector().connectAccount(
      {} as never,
      {
        walletId,
        blockchainName: 'Bitcoin',
        device,
        accountIndex: 1,
        accountName: 'Bitcoin #1',
        targetNetworks,
      } as never,
    );

    const [, props] = connectorCalls(bitcoinConnector)[0];
    expect(props.targetNetworks).toBe(targetNetworks);
    expect(props.walletId).toBe(walletId);
    expect(props.accountName).toBe('Bitcoin #1');
    expect(accounts).toEqual([{ accountId: 'bitcoin-account' }]);
  });
});
