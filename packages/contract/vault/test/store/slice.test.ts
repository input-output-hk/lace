import { describe, expect, it } from 'vitest';

import {
  vaultActions,
  vaultCapabilitiesAddonContract,
  vaultCeremonyStoreContract,
} from '../../src';
import { vaultReducers, vaultSelectors } from '../../src/store/slice';

describe('vaultActions', () => {
  it('createWalletCeremonyRequested carries the origin', () => {
    expect(
      vaultActions.vault.createWalletCeremonyRequested({
        origin: 'onboarding',
      }),
    ).toEqual({
      type: 'vault/createWalletCeremonyRequested',
      payload: { origin: 'onboarding' },
    });
  });

  it('importWalletCeremonyRequested carries the origin', () => {
    expect(
      vaultActions.vault.importWalletCeremonyRequested({
        origin: 'management',
      }),
    ).toEqual({
      type: 'vault/importWalletCeremonyRequested',
      payload: { origin: 'management' },
    });
  });

  it('connectHardwareCeremonyRequested carries the device and blockchain', () => {
    expect(
      vaultActions.vault.connectHardwareCeremonyRequested({
        device: 'ledger',
        blockchain: 'Bitcoin',
      }),
    ).toEqual({
      type: 'vault/connectHardwareCeremonyRequested',
      payload: { device: 'ledger', blockchain: 'Bitcoin' },
    });
  });

  it('addAccountCeremonyRequested carries the walletId', () => {
    expect(
      vaultActions.vault.addAccountCeremonyRequested({ walletId: 'w1' }),
    ).toEqual({
      type: 'vault/addAccountCeremonyRequested',
      payload: { walletId: 'w1' },
    });
  });

  it('renameWalletCeremonyRequested carries the walletId', () => {
    expect(
      vaultActions.vault.renameWalletCeremonyRequested({ walletId: 'w1' }),
    ).toEqual({
      type: 'vault/renameWalletCeremonyRequested',
      payload: { walletId: 'w1' },
    });
  });

  it('renameAccountCeremonyRequested carries the walletId and accountId', () => {
    expect(
      vaultActions.vault.renameAccountCeremonyRequested({
        walletId: 'w1',
        accountId: 'a1',
      }),
    ).toEqual({
      type: 'vault/renameAccountCeremonyRequested',
      payload: { walletId: 'w1', accountId: 'a1' },
    });
  });

  it('removeWalletCeremonyRequested carries the walletId', () => {
    expect(
      vaultActions.vault.removeWalletCeremonyRequested({ walletId: 'w1' }),
    ).toEqual({
      type: 'vault/removeWalletCeremonyRequested',
      payload: { walletId: 'w1' },
    });
  });

  it('removeAccountCeremonyRequested carries the walletId, accountId and accountIndex', () => {
    expect(
      vaultActions.vault.removeAccountCeremonyRequested({
        walletId: 'w1',
        accountId: 'a1',
        accountIndex: 2,
      }),
    ).toEqual({
      type: 'vault/removeAccountCeremonyRequested',
      payload: { walletId: 'w1', accountId: 'a1', accountIndex: 2 },
    });
  });

  it('revealRecoveryPhraseCeremonyRequested carries the walletId', () => {
    expect(
      vaultActions.vault.revealRecoveryPhraseCeremonyRequested({
        walletId: 'w1',
      }),
    ).toEqual({
      type: 'vault/revealRecoveryPhraseCeremonyRequested',
      payload: { walletId: 'w1' },
    });
  });

  it('ceremonyLaunching names the ceremony and the wallet it targets', () => {
    expect(
      vaultActions.vault.ceremonyLaunching({
        ceremony: 'add-account',
        walletId: 'w1',
      }),
    ).toEqual({
      type: 'vault/ceremonyLaunching',
      payload: { ceremony: 'add-account', walletId: 'w1' },
    });
  });

  it('ceremonySettled names the ceremony and whether the surface mounted', () => {
    expect(
      vaultActions.vault.ceremonySettled({ ceremony: 'create', mounted: true }),
    ).toEqual({
      type: 'vault/ceremonySettled',
      payload: { ceremony: 'create', mounted: true },
    });
    expect(
      vaultActions.vault.ceremonySettled({
        ceremony: 'add-account',
        mounted: false,
      }),
    ).toEqual({
      type: 'vault/ceremonySettled',
      payload: { ceremony: 'add-account', mounted: false },
    });
  });
});

describe('vault slice', () => {
  const reduce = (
    ...actions: { type: string }[]
  ): ReturnType<typeof vaultReducers.vault> =>
    actions.reduce(
      (state, action) => vaultReducers.vault(state, action),
      undefined as unknown as ReturnType<typeof vaultReducers.vault>,
    );

  it('starts with nothing pending', () => {
    expect(reduce({ type: 'unrelated/action' })).toEqual({
      pendingCeremony: null,
    });
  });

  it('ceremonyLaunching records the ceremony and its wallet', () => {
    expect(
      reduce(
        vaultActions.vault.ceremonyLaunching({
          ceremony: 'rename',
          walletId: 'w1',
        }),
      ),
    ).toEqual({ pendingCeremony: { ceremony: 'rename', walletId: 'w1' } });
  });

  it('a second launch replaces the pending one, the host mounting one surface at a time', () => {
    expect(
      reduce(
        vaultActions.vault.ceremonyLaunching({ ceremony: 'create' }),
        vaultActions.vault.ceremonyLaunching({ ceremony: 'import' }),
      ).pendingCeremony,
    ).toEqual({ ceremony: 'import' });
  });

  it('ceremonySettled clears the pending launch when the surface mounted', () => {
    expect(
      reduce(
        vaultActions.vault.ceremonyLaunching({ ceremony: 'create' }),
        vaultActions.vault.ceremonySettled({
          ceremony: 'create',
          mounted: true,
        }),
      ),
    ).toEqual({ pendingCeremony: null });
  });

  it('ceremonySettled clears the pending launch when the surface never mounted', () => {
    expect(
      reduce(
        vaultActions.vault.ceremonyLaunching({
          ceremony: 'remove-account',
          walletId: 'w1',
        }),
        vaultActions.vault.ceremonySettled({
          ceremony: 'remove-account',
          mounted: false,
        }),
      ),
    ).toEqual({ pendingCeremony: null });
  });

  it('selectPendingCeremony reads the pending launch off the slice', () => {
    const pendingCeremony = { ceremony: 'import' as const };
    expect(
      vaultSelectors.vault.selectPendingCeremony({
        vault: { pendingCeremony },
      }),
    ).toBe(pendingCeremony);
  });
});

describe('vault contracts', () => {
  it('ceremony store contract is an exactly-one store', () => {
    expect(vaultCeremonyStoreContract.name).toBe('vault-ceremony-store');
    expect(vaultCeremonyStoreContract.contractType).toBe('store');
    expect(vaultCeremonyStoreContract.instance).toBe('exactly-one');
  });

  it('capabilities addon contract is an exactly-one addon providing loadVaultCapabilities', () => {
    expect(vaultCapabilitiesAddonContract.name).toBe(
      'vault-capabilities-addon',
    );
    expect(vaultCapabilitiesAddonContract.instance).toBe('exactly-one');
    expect(vaultCapabilitiesAddonContract.contractType).toBe('addon');
    if (vaultCapabilitiesAddonContract.contractType === 'addon') {
      expect(vaultCapabilitiesAddonContract.provides.addons).toEqual([
        'loadVaultCapabilities',
      ]);
    }
  });
});
