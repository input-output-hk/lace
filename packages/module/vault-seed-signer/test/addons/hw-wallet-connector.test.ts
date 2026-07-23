import { WalletType } from '@lace-contract/wallet-repo';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import loadHwWalletConnector from '../../src/addons/hw-wallet-connector';

import type { HwWalletConnector } from '@lace-contract/onboarding-v2';

const cardanoConnector = vi.hoisted(() => ({
  id: 'seed-signer',
  walletType: 'HardwareSeedSigner',
  createWallet: vi.fn(async () => ({ walletId: 'cardano-wallet' })),
  connectAccount: vi.fn(async () => [{ accountId: 'cardano-account' }]),
}));
const bitcoinConnector = vi.hoisted(() => ({
  id: 'seed-signer-bitcoin',
  walletType: 'HardwareSeedSigner',
  createWallet: vi.fn(async () => ({ walletId: 'bitcoin-wallet' })),
  connectAccount: vi.fn(async () => [{ accountId: 'bitcoin-account' }]),
}));

vi.mock('../../src/cardano/hw-wallet-connector', () => ({
  default: () => cardanoConnector,
}));
vi.mock('../../src/bitcoin/connector', () => ({
  default: () => bitcoinConnector,
}));

const getConnector = (): HwWalletConnector =>
  loadHwWalletConnector({} as never, {} as never) as HwWalletConnector;

const createProps = (blockchainName: string) =>
  ({ blockchainName, accountIndex: 0 } as never);

const accountProps = (blockchainName: string) =>
  ({
    blockchainName,
    walletId: 'w',
    accountIndex: 0,
    accountName: 'a',
  } as never);

describe('unified seed-signer hw-wallet-connector', () => {
  beforeEach(() => {
    cardanoConnector.createWallet.mockClear();
    cardanoConnector.connectAccount.mockClear();
    bitcoinConnector.createWallet.mockClear();
    bitcoinConnector.connectAccount.mockClear();
  });

  it('is registered under the Cardano onboarding option id', () => {
    expect(getConnector().id).toBe('seed-signer');
  });

  it('advertises both onboarding option ids so create-by-id resolves either tile', () => {
    expect(getConnector().optionIds).toEqual([
      'seed-signer',
      'seed-signer-bitcoin',
    ]);
  });

  it('serves the HardwareSeedSigner wallet type (resolves for add-account)', () => {
    expect(getConnector().walletType).toBe(WalletType.HardwareSeedSigner);
  });

  it('dispatches createWallet to the Bitcoin connector for Bitcoin', async () => {
    await getConnector().createWallet({} as never, createProps('Bitcoin'));
    expect(bitcoinConnector.createWallet).toHaveBeenCalledTimes(1);
    expect(cardanoConnector.createWallet).not.toHaveBeenCalled();
  });

  it('dispatches createWallet to the Cardano connector for Cardano', async () => {
    await getConnector().createWallet({} as never, createProps('Cardano'));
    expect(cardanoConnector.createWallet).toHaveBeenCalledTimes(1);
    expect(bitcoinConnector.createWallet).not.toHaveBeenCalled();
  });

  it('dispatches connectAccount to the Bitcoin connector for Bitcoin', async () => {
    await getConnector().connectAccount({} as never, accountProps('Bitcoin'));
    expect(bitcoinConnector.connectAccount).toHaveBeenCalledTimes(1);
    expect(cardanoConnector.connectAccount).not.toHaveBeenCalled();
  });

  it('dispatches connectAccount to the Cardano connector for Cardano', async () => {
    await getConnector().connectAccount({} as never, accountProps('Cardano'));
    expect(cardanoConnector.connectAccount).toHaveBeenCalledTimes(1);
    expect(bitcoinConnector.connectAccount).not.toHaveBeenCalled();
  });

  it('throws for an unsupported blockchain', async () => {
    await expect(
      getConnector().createWallet({} as never, createProps('Midnight')),
    ).rejects.toThrow('Midnight');
  });
});
