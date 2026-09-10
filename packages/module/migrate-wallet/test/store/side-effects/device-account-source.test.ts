import { WalletType } from '@lace-contract/wallet-repo';
import { describe, expect, it, vi } from 'vitest';

import { makeDeviceAccountSource } from '../../../src/store/side-effects/device-account-source';

import type { AnyWallet } from '@lace-contract/wallet-repo';

const device = { id: 'usb-1' } as never;
const hwSource = {
  optionId: 'ledger',
  device,
  blockchainName: 'Cardano',
} as never;
const ledgerWallet = {
  walletId: 'wallet-1',
  type: WalletType.HardwareLedger,
  accounts: [],
} as unknown as AnyWallet;

const account = (accountIndex: number) => ({
  accountId: `acct-${accountIndex}`,
  blockchainSpecific: { extendedAccountPublicKey: `xpub-${accountIndex}` },
});

const dependenciesFor = (loadModules: ReturnType<typeof vi.fn>) =>
  ({ loadModules, __getState: () => ({ tag: 'state' }) } as never);

describe('makeDeviceAccountSource', () => {
  it('exports xpubs via the family connector, one device round-trip per index', async () => {
    const connectHardwareAccounts = vi.fn(
      async (_state: unknown, { accountIndex }: { accountIndex: number }) => [
        account(accountIndex),
      ],
    );
    const loadModules = vi.fn(async () => [
      [{ blockchainName: 'Cardano', connectHardwareAccounts }],
    ]);

    const source = await makeDeviceAccountSource(
      {
        wallet: ledgerWallet,
        hwSource,
        targetNetworkId: 'cardano-preprod' as never,
      },
      dependenciesFor(loadModules),
    );

    expect(loadModules).toHaveBeenCalledWith(
      'addons.loadLedgerHwAccountConnector',
    );
    expect(await source?.xpubForIndex(1)).toBe('xpub-1');
    // Cached: a second read of the same index must not re-prompt the device.
    expect(await source?.xpubForIndex(1)).toBe('xpub-1');
    expect(connectHardwareAccounts).toHaveBeenCalledTimes(1);
    expect(connectHardwareAccounts).toHaveBeenCalledWith(
      { tag: 'state' },
      expect.objectContaining({
        device,
        accountIndex: 1,
        walletId: 'wallet-1',
        targetNetworks: new Set(['cardano-preprod']),
      }),
    );
    // The probe's full entities are what discovery merges into the wallet.
    expect(source?.accountsForIndex(1)).toEqual([account(1)]);
    expect(source?.accountsForIndex(2)).toEqual([]);
  });

  it('returns undefined for a family with no per-index export (air-gapped)', async () => {
    const loadModules = vi.fn();
    const source = await makeDeviceAccountSource(
      {
        wallet: { ...ledgerWallet, type: 'Keystone' } as never,
        hwSource,
        targetNetworkId: 'cardano-preprod' as never,
      },
      dependenciesFor(loadModules),
    );
    expect(source).toBeUndefined();
    expect(loadModules).not.toHaveBeenCalled();
  });

  it('returns undefined when no connector serves the blockchain', async () => {
    const loadModules = vi.fn(async () => [
      [{ blockchainName: 'Bitcoin', connectHardwareAccounts: vi.fn() }],
    ]);
    const source = await makeDeviceAccountSource(
      {
        wallet: ledgerWallet,
        hwSource,
        targetNetworkId: 'cardano-preprod' as never,
      },
      dependenciesFor(loadModules),
    );
    expect(source).toBeUndefined();
  });

  it('errors an index whose export produced no xpub instead of reading it as inactive', async () => {
    const connectHardwareAccounts = vi.fn(async () => []);
    const loadModules = vi.fn(async () => [
      [{ blockchainName: 'Cardano', connectHardwareAccounts }],
    ]);
    const source = await makeDeviceAccountSource(
      {
        wallet: ledgerWallet,
        hwSource,
        targetNetworkId: 'cardano-preprod' as never,
      },
      dependenciesFor(loadModules),
    );
    await expect(source?.xpubForIndex(3)).rejects.toThrow(
      'no account xpub for index 3',
    );
  });
});
