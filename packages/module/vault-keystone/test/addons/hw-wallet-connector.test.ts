import { beforeEach, describe, expect, it, vi } from 'vitest';

import loadHwWalletConnector from '../../src/addons/hw-wallet-connector';

import type { HwWalletConnector } from '@lace-contract/onboarding-v2';

const cardanoConnector = vi.hoisted(() => ({
  id: 'keystone',
  walletType: 'HardwareKeystone',
  createWallet: vi.fn(async () => ({ walletId: 'keystone-wallet' })),
  connectAccount: vi.fn(async () => [{ accountId: 'keystone-account' }]),
}));

const bitcoinConnector = vi.hoisted(() => ({
  id: 'keystone-bitcoin',
  walletType: 'HardwareKeystone',
  createWallet: vi.fn(async () => ({ walletId: 'keystone-btc-wallet' })),
  connectAccount: vi.fn(async () => [{ accountId: 'keystone-btc-account' }]),
}));

vi.mock('../../src/cardano/hw-wallet-connector', () => ({
  default: () => cardanoConnector,
}));

vi.mock('../../src/bitcoin/connector', () => ({
  default: () => bitcoinConnector,
}));

const getConnector = (): HwWalletConnector =>
  loadHwWalletConnector({} as never, {} as never) as HwWalletConnector;

describe('keystone hw-wallet-connector addon', () => {
  beforeEach(() => {
    cardanoConnector.createWallet.mockClear();
    cardanoConnector.connectAccount.mockClear();
    bitcoinConnector.createWallet.mockClear();
    bitcoinConnector.connectAccount.mockClear();
  });

  it('is registered under the keystone onboarding option id', () => {
    expect(getConnector().id).toBe('keystone');
  });

  it('advertises both per-blockchain onboarding option ids', () => {
    expect(getConnector().optionIds).toEqual(['keystone', 'keystone-bitcoin']);
  });

  it('serves the HardwareKeystone wallet type (resolves for add-account)', () => {
    expect(getConnector().walletType).toBe('HardwareKeystone');
  });

  it('delegates createWallet to the Cardano connector', async () => {
    const wallet = await getConnector().createWallet(
      {} as never,
      { blockchainName: 'Cardano', accountIndex: 0 } as never,
    );
    expect(cardanoConnector.createWallet).toHaveBeenCalledTimes(1);
    expect(bitcoinConnector.createWallet).not.toHaveBeenCalled();
    expect(wallet).toMatchObject({ walletId: 'keystone-wallet' });
  });

  it('delegates createWallet to the Bitcoin connector', async () => {
    const wallet = await getConnector().createWallet(
      {} as never,
      { blockchainName: 'Bitcoin', accountIndex: 0 } as never,
    );
    expect(bitcoinConnector.createWallet).toHaveBeenCalledTimes(1);
    expect(cardanoConnector.createWallet).not.toHaveBeenCalled();
    expect(wallet).toMatchObject({ walletId: 'keystone-btc-wallet' });
  });

  it('delegates connectAccount to the Cardano connector', async () => {
    const accounts = await getConnector().connectAccount(
      {} as never,
      {
        blockchainName: 'Cardano',
        walletId: 'w',
        accountIndex: 0,
        accountName: 'a',
      } as never,
    );
    expect(cardanoConnector.connectAccount).toHaveBeenCalledTimes(1);
    expect(accounts).toEqual([{ accountId: 'keystone-account' }]);
  });

  it('delegates connectAccount to the Bitcoin connector', async () => {
    const accounts = await getConnector().connectAccount(
      {} as never,
      {
        blockchainName: 'Bitcoin',
        walletId: 'w',
        accountIndex: 0,
        accountName: 'a',
      } as never,
    );
    expect(bitcoinConnector.connectAccount).toHaveBeenCalledTimes(1);
    expect(accounts).toEqual([{ accountId: 'keystone-btc-account' }]);
  });

  it('rejects a blockchain neither connector supports', async () => {
    await expect(
      getConnector().createWallet(
        {} as never,
        { blockchainName: 'Midnight', accountIndex: 0 } as never,
      ),
    ).rejects.toThrow('Keystone does not support blockchain: Midnight');
  });
});
