import { failuresActions } from '@lace-contract/failures';
import { BlockchainNetworkId } from '@lace-contract/network';
import { vaultActions } from '@lace-contract/vault';
import { firstValueFrom, of, toArray } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock is hoisted above these imports, so the lace-client import in the
// side effects resolves to these stubs.
vi.mock('../../src/lace-client', () => ({
  requestConnectHardwareWallet: vi.fn(),
  requestCreateWallet: vi.fn(),
  requestImportWallet: vi.fn(),
  requestRenameAccount: vi.fn(),
  requestWalletManager: vi.fn(),
}));

import { vaultCeremonyFailureId } from '../../src/failure-id';
import {
  requestConnectHardwareWallet,
  requestCreateWallet,
  requestImportWallet,
  requestRenameAccount,
  requestWalletManager,
} from '../../src/lace-client';
import {
  CEREMONY_MOUNT_FAILED_MESSAGE,
  requestAddAccountCeremony,
  requestConnectHardwareCeremony,
  requestCreateWalletCeremony,
  requestImportWalletCeremony,
  requestRemoveAccountCeremony,
  requestRemoveWalletCeremony,
  requestRenameAccountCeremony,
  requestRenameWalletCeremony,
  requestRevealRecoveryPhraseCeremony,
} from '../../src/store/side-effects';

import type { SideEffect } from '../../src';
import type { Ceremony } from '@lace-contract/vault';

const actions = {
  ...vaultActions,
  ...failuresActions,
};

// The create/import ceremonies read `network.selectActiveNetworkId$` (a
// parameterized selector emitting a function). This fakes it: the emitted
// function yields the given active Midnight `BlockchainNetworkId` for
// 'Midnight' (undefined otherwise / when none is set).
const midnightStateObservables = (
  activeMidnightNetworkId?: BlockchainNetworkId,
) =>
  ({
    network: {
      selectActiveNetworkId$: of((blockchain: string) =>
        blockchain === 'Midnight' ? activeMidnightNetworkId : undefined,
      ),
    },
  } as unknown as Parameters<SideEffect>[1]);

const run = async (
  sideEffect: SideEffect,
  requested$: Parameters<SideEffect>[0],
  state$: Parameters<SideEffect>[1] = midnightStateObservables(),
) =>
  firstValueFrom(
    sideEffect(requested$, state$, {
      actions,
    } as Parameters<SideEffect>[2]).pipe(toArray()),
  );

const createRequested$ = () =>
  ({
    vault: {
      createWalletCeremonyRequested$: of(
        vaultActions.vault.createWalletCeremonyRequested({
          origin: 'onboarding',
        }),
      ),
    },
  } as unknown as Parameters<SideEffect>[0]);

const importRequested$ = () =>
  ({
    vault: {
      importWalletCeremonyRequested$: of(
        vaultActions.vault.importWalletCeremonyRequested({
          origin: 'management',
        }),
      ),
    },
  } as unknown as Parameters<SideEffect>[0]);

const addAccountRequested$ = () =>
  ({
    vault: {
      addAccountCeremonyRequested$: of(
        vaultActions.vault.addAccountCeremonyRequested({
          walletId: 'wallet-1',
        }),
      ),
    },
  } as unknown as Parameters<SideEffect>[0]);

const connectHardwareRequested$ = (
  blockchain: 'Bitcoin' | 'Cardano' = 'Cardano',
) =>
  ({
    vault: {
      connectHardwareCeremonyRequested$: of(
        vaultActions.vault.connectHardwareCeremonyRequested({
          device: 'ledger',
          blockchain,
        }),
      ),
    },
  } as unknown as Parameters<SideEffect>[0]);

const renameRequested$ = () =>
  ({
    vault: {
      renameWalletCeremonyRequested$: of(
        vaultActions.vault.renameWalletCeremonyRequested({
          walletId: 'wallet-1',
        }),
      ),
    },
  } as unknown as Parameters<SideEffect>[0]);

const renameAccountRequested$ = () =>
  ({
    vault: {
      renameAccountCeremonyRequested$: of(
        vaultActions.vault.renameAccountCeremonyRequested({
          walletId: 'wallet-1',
          accountId: 'account-1',
        }),
      ),
    },
  } as unknown as Parameters<SideEffect>[0]);

const removeWalletRequested$ = () =>
  ({
    vault: {
      removeWalletCeremonyRequested$: of(
        vaultActions.vault.removeWalletCeremonyRequested({
          walletId: 'wallet-1',
        }),
      ),
    },
  } as unknown as Parameters<SideEffect>[0]);

const removeAccountRequested$ = () =>
  ({
    vault: {
      removeAccountCeremonyRequested$: of(
        vaultActions.vault.removeAccountCeremonyRequested({
          walletId: 'wallet-1',
          accountId: 'account-1',
          accountIndex: 2,
        }),
      ),
    },
  } as unknown as Parameters<SideEffect>[0]);

const revealRecoveryPhraseRequested$ = () =>
  ({
    vault: {
      revealRecoveryPhraseCeremonyRequested$: of(
        vaultActions.vault.revealRecoveryPhraseCeremonyRequested({
          walletId: 'wallet-1',
        }),
      ),
    },
  } as unknown as Parameters<SideEffect>[0]);

const launching = (ceremony: Ceremony, walletId?: string) =>
  vaultActions.vault.ceremonyLaunching({ ceremony, walletId });

// Every launch raises the flag before the round-trip, so the failure path is a
// three-action sequence.
const failure = (ceremony: Ceremony, walletId?: string) => [
  launching(ceremony, walletId),
  failuresActions.failures.addFailure({
    failureId: vaultCeremonyFailureId(ceremony),
    message: CEREMONY_MOUNT_FAILED_MESSAGE,
  }),
  vaultActions.vault.ceremonySettled({ ceremony, mounted: false }),
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requestCreateWalletCeremony', () => {
  it('settles once the host create surface mounts', async () => {
    vi.mocked(requestCreateWallet).mockResolvedValue({
      ok: true,
      value: { mounted: true },
    });
    expect(await run(requestCreateWalletCeremony, createRequested$())).toEqual([
      launching('create'),
      vaultActions.vault.ceremonySettled({
        ceremony: 'create',
        mounted: true,
      }),
    ]);
  });

  it('reports a failure and still settles when the mount is refused', async () => {
    vi.mocked(requestCreateWallet).mockResolvedValue({
      ok: false,
      error: { code: 'refused', message: 'user closed the prompt' },
    });
    expect(await run(requestCreateWalletCeremony, createRequested$())).toEqual(
      failure('create'),
    );
  });

  it('reports a failure when the surface does not mount', async () => {
    vi.mocked(requestCreateWallet).mockResolvedValue({
      ok: true,
      value: { mounted: false },
    });
    expect(await run(requestCreateWalletCeremony, createRequested$())).toEqual(
      failure('create'),
    );
  });

  it('reports a failure when the request rejects', async () => {
    vi.mocked(requestCreateWallet).mockRejectedValue(new Error('boom'));
    expect(await run(requestCreateWalletCeremony, createRequested$())).toEqual(
      failure('create'),
    );
  });

  it('passes the guest active Midnight SDK network to the host create request', async () => {
    vi.mocked(requestCreateWallet).mockResolvedValue({
      ok: true,
      value: { mounted: true },
    });
    await run(
      requestCreateWalletCeremony,
      createRequested$(),
      midnightStateObservables(BlockchainNetworkId('midnight-preprod')),
    );
    expect(requestCreateWallet).toHaveBeenCalledWith('preprod');
  });

  it('omits the network hint when Midnight has no active network', async () => {
    vi.mocked(requestCreateWallet).mockResolvedValue({
      ok: true,
      value: { mounted: true },
    });
    await run(requestCreateWalletCeremony, createRequested$());
    expect(requestCreateWallet).toHaveBeenCalledWith(undefined);
  });
});

describe('requestImportWalletCeremony', () => {
  it('settles once the host import surface mounts', async () => {
    vi.mocked(requestImportWallet).mockResolvedValue({
      ok: true,
      value: { mounted: true },
    });
    expect(await run(requestImportWalletCeremony, importRequested$())).toEqual([
      launching('import'),
      vaultActions.vault.ceremonySettled({
        ceremony: 'import',
        mounted: true,
      }),
    ]);
  });

  it('reports a failure and still settles when the mount is refused', async () => {
    vi.mocked(requestImportWallet).mockResolvedValue({
      ok: false,
      error: { code: 'internal', message: 'host error' },
    });
    expect(await run(requestImportWalletCeremony, importRequested$())).toEqual(
      failure('import'),
    );
  });

  it('passes the guest active Midnight SDK network to the host import request', async () => {
    vi.mocked(requestImportWallet).mockResolvedValue({
      ok: true,
      value: { mounted: true },
    });
    await run(
      requestImportWalletCeremony,
      importRequested$(),
      midnightStateObservables(BlockchainNetworkId('midnight-preprod')),
    );
    expect(requestImportWallet).toHaveBeenCalledWith('preprod');
  });
});

describe('requestAddAccountCeremony', () => {
  it('threads the add-account hint and settles once the manager surface mounts', async () => {
    vi.mocked(requestWalletManager).mockResolvedValue({
      ok: true,
      value: { mounted: true },
    });
    expect(
      await run(requestAddAccountCeremony, addAccountRequested$()),
    ).toEqual([
      launching('add-account', 'wallet-1'),
      vaultActions.vault.ceremonySettled({
        ceremony: 'add-account',
        mounted: true,
      }),
    ]);
    expect(requestWalletManager).toHaveBeenCalledWith({
      view: 'add-account',
      walletId: 'wallet-1',
    });
  });

  it('reports a failure and still settles when the mount is refused', async () => {
    vi.mocked(requestWalletManager).mockResolvedValue({
      ok: false,
      error: { code: 'refused', message: 'gate refused the sender' },
    });
    expect(
      await run(requestAddAccountCeremony, addAccountRequested$()),
    ).toEqual(failure('add-account', 'wallet-1'));
  });
});

describe('requestRenameWalletCeremony', () => {
  it('threads the rename hint and settles once the manager surface mounts', async () => {
    vi.mocked(requestWalletManager).mockResolvedValue({
      ok: true,
      value: { mounted: true },
    });
    expect(await run(requestRenameWalletCeremony, renameRequested$())).toEqual([
      launching('rename', 'wallet-1'),
      vaultActions.vault.ceremonySettled({
        ceremony: 'rename',
        mounted: true,
      }),
    ]);
    expect(requestWalletManager).toHaveBeenCalledWith({
      view: 'rename',
      walletId: 'wallet-1',
    });
  });

  it('reports a failure and still settles when the mount is refused', async () => {
    vi.mocked(requestWalletManager).mockResolvedValue({
      ok: false,
      error: { code: 'refused', message: 'x' },
    });
    expect(await run(requestRenameWalletCeremony, renameRequested$())).toEqual(
      failure('rename', 'wallet-1'),
    );
  });
});

describe('requestRenameAccountCeremony', () => {
  it('names the account on its OWN host method and settles once the surface mounts', async () => {
    vi.mocked(requestRenameAccount).mockResolvedValue({
      ok: true,
      value: { mounted: true },
    });
    expect(
      await run(requestRenameAccountCeremony, renameAccountRequested$()),
    ).toEqual([
      launching('rename-account', 'wallet-1'),
      vaultActions.vault.ceremonySettled({
        ceremony: 'rename-account',
        mounted: true,
      }),
    ]);
    expect(requestRenameAccount).toHaveBeenCalledWith({
      walletId: 'wallet-1',
      accountId: 'account-1',
    });
    expect(requestWalletManager).not.toHaveBeenCalled();
  });

  it('reports a failure and still settles when the mount is refused', async () => {
    vi.mocked(requestRenameAccount).mockResolvedValue({
      ok: false,
      error: { code: 'refused', message: 'x' },
    });
    expect(
      await run(requestRenameAccountCeremony, renameAccountRequested$()),
    ).toEqual(failure('rename-account', 'wallet-1'));
  });

  it('reports a failure when the host method rejects (an older host has none)', async () => {
    vi.mocked(requestRenameAccount).mockRejectedValue(
      new Error('no such method'),
    );
    expect(
      await run(requestRenameAccountCeremony, renameAccountRequested$()),
    ).toEqual(failure('rename-account', 'wallet-1'));
  });
});

describe('requestRemoveWalletCeremony', () => {
  it('threads the remove-wallet hint and settles once the manager surface mounts', async () => {
    vi.mocked(requestWalletManager).mockResolvedValue({
      ok: true,
      value: { mounted: true },
    });
    expect(
      await run(requestRemoveWalletCeremony, removeWalletRequested$()),
    ).toEqual([
      launching('remove-wallet', 'wallet-1'),
      vaultActions.vault.ceremonySettled({
        ceremony: 'remove-wallet',
        mounted: true,
      }),
    ]);
    expect(requestWalletManager).toHaveBeenCalledWith({
      view: 'remove-wallet',
      walletId: 'wallet-1',
    });
  });

  it('reports a failure and still settles when the mount is refused', async () => {
    vi.mocked(requestWalletManager).mockResolvedValue({
      ok: false,
      error: { code: 'refused', message: 'x' },
    });
    expect(
      await run(requestRemoveWalletCeremony, removeWalletRequested$()),
    ).toEqual(failure('remove-wallet', 'wallet-1'));
  });
});

describe('requestRemoveAccountCeremony', () => {
  it('threads the remove-account hint with the account index and settles once the manager surface mounts', async () => {
    vi.mocked(requestWalletManager).mockResolvedValue({
      ok: true,
      value: { mounted: true },
    });
    expect(
      await run(requestRemoveAccountCeremony, removeAccountRequested$()),
    ).toEqual([
      launching('remove-account', 'wallet-1'),
      vaultActions.vault.ceremonySettled({
        ceremony: 'remove-account',
        mounted: true,
      }),
    ]);
    expect(requestWalletManager).toHaveBeenCalledWith({
      view: 'remove-account',
      walletId: 'wallet-1',
      accountIndex: 2,
    });
  });

  it('reports a failure and still settles when the mount is refused', async () => {
    vi.mocked(requestWalletManager).mockResolvedValue({
      ok: false,
      error: { code: 'refused', message: 'x' },
    });
    expect(
      await run(requestRemoveAccountCeremony, removeAccountRequested$()),
    ).toEqual(failure('remove-account', 'wallet-1'));
  });
});

describe('requestRevealRecoveryPhraseCeremony', () => {
  it('threads the recovery-phrase hint and settles once the manager surface mounts', async () => {
    vi.mocked(requestWalletManager).mockResolvedValue({
      ok: true,
      value: { mounted: true },
    });
    expect(
      await run(
        requestRevealRecoveryPhraseCeremony,
        revealRecoveryPhraseRequested$(),
      ),
    ).toEqual([
      launching('recovery-phrase', 'wallet-1'),
      vaultActions.vault.ceremonySettled({
        ceremony: 'recovery-phrase',
        mounted: true,
      }),
    ]);
    expect(requestWalletManager).toHaveBeenCalledWith({
      view: 'recovery-phrase',
      walletId: 'wallet-1',
    });
  });

  it('reports a failure and still settles when the mount is refused', async () => {
    vi.mocked(requestWalletManager).mockResolvedValue({
      ok: false,
      error: { code: 'refused', message: 'x' },
    });
    expect(
      await run(
        requestRevealRecoveryPhraseCeremony,
        revealRecoveryPhraseRequested$(),
      ),
    ).toEqual(failure('recovery-phrase', 'wallet-1'));
  });
});

describe('requestConnectHardwareCeremony', () => {
  it('requests the device pairing and settles once the host surface mounts', async () => {
    vi.mocked(requestConnectHardwareWallet).mockResolvedValue({
      ok: true,
      value: { mounted: true },
    });
    expect(
      await run(requestConnectHardwareCeremony, connectHardwareRequested$()),
    ).toEqual([
      launching('connect-hardware'),
      vaultActions.vault.ceremonySettled({
        ceremony: 'connect-hardware',
        mounted: true,
      }),
    ]);
    expect(requestConnectHardwareWallet).toHaveBeenCalledWith(
      'ledger',
      'Cardano',
    );
  });

  it('threads the chosen blockchain through to the host request', async () => {
    vi.mocked(requestConnectHardwareWallet).mockResolvedValue({
      ok: true,
      value: { mounted: true },
    });
    await run(
      requestConnectHardwareCeremony,
      connectHardwareRequested$('Bitcoin'),
    );
    expect(requestConnectHardwareWallet).toHaveBeenCalledWith(
      'ledger',
      'Bitcoin',
    );
  });

  it('reports a failure and still settles when the mount is refused', async () => {
    vi.mocked(requestConnectHardwareWallet).mockResolvedValue({
      ok: false,
      error: { code: 'refused', message: 'user closed the prompt' },
    });
    expect(
      await run(requestConnectHardwareCeremony, connectHardwareRequested$()),
    ).toEqual(failure('connect-hardware'));
  });
});
