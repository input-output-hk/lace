import { Cardano } from '@cardano-sdk/core';
import { CardanoNetworkId } from '@lace-contract/cardano-context';
import { Ok } from '@lace-lib/util';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deriveMissingDestinationAccounts,
  deriveMissingDestinationAccountsOnDevice,
} from '../../src/store/side-effects/prepare-destination-accounts';

import type { AnyWallet } from '@lace-contract/wallet-repo';

vi.mock('@lace-contract/cardano-context', async importOriginal => ({
  ...(await importOriginal<object>()),
  deriveAccountExtendedPublicKey: vi.fn(async () => 'xpub-hex'),
}));

/**
 * Stands in for the device connector, including its per-index cache: the real
 * `makeDeviceAccountSource` memoises each export, so asking twice for the same
 * index is one on-device approval. `exportedIndexes` therefore counts
 * APPROVALS, which is the cost this flow is careful about.
 */
const exportedIndexes: number[] = [];
vi.mock('../../src/store/side-effects/device-account-source', () => ({
  makeDeviceAccountSource: vi.fn(async () => ({
    xpubForIndex: vi.fn(async (accountIndex: number) => {
      if (!exportedIndexes.includes(accountIndex)) {
        exportedIndexes.push(accountIndex);
      }
      return 'xpub-hex';
    }),
    accountsForIndex: (accountIndex: number) => [
      {
        accountId: `wallet-${accountIndex}-1`,
        blockchainSpecific: { accountIndex },
      },
    ],
  })),
}));

const NETWORK_ID = CardanoNetworkId(Cardano.ChainIds.Preprod.networkMagic);

const loadedAccount = (accountIndex: number) => ({
  accountId: `wallet-${accountIndex}-1`,
  blockchainName: 'Cardano',
  blockchainNetworkId: NETWORK_ID,
  networkType: 'testnet',
  metadata: { name: `Cardano #${accountIndex}` },
  blockchainSpecific: { accountIndex, extendedAccountPublicKey: 'xpub-hex' },
});

const walletWith = (loadedIndexes: number[]) =>
  ({
    walletId: 'wallet',
    accounts: loadedIndexes.map(loadedAccount),
    blockchainSpecific: { Cardano: { encryptedRootPrivateKey: 'deadbeef' } },
  } as unknown as AnyWallet);

const dependencies = {
  accessAuthSecret: vi.fn((callback: (secret: Uint8Array) => unknown) =>
    of(callback(new Uint8Array(32))),
  ),
} as never;

describe('deriveMissingDestinationAccounts', () => {
  it('derives every planned account when the wallet holds none of them', async () => {
    const { accounts, resolvedIndexes } =
      await deriveMissingDestinationAccounts(
        {
          wallet: walletWith([0]),
          destinationAccountIndexes: [1, 2],
          blockchainNetworkId: NETWORK_ID,
        },
        dependencies,
      );
    expect(resolvedIndexes).toEqual([1, 2]);
    expect(accounts).toHaveLength(2);
  });

  it('derives nothing when every planned account is already loaded', async () => {
    const { accounts, resolvedIndexes } =
      await deriveMissingDestinationAccounts(
        {
          wallet: walletWith([0, 1, 2]),
          destinationAccountIndexes: [1, 2],
          blockchainNetworkId: NETWORK_ID,
        },
        dependencies,
      );
    expect(resolvedIndexes).toEqual([1, 2]);
    expect(accounts).toHaveLength(0);
  });

  /**
   * The reuse path's own mixed case, and the one that mis-routed funds: with a
   * loaded account among the planned set, `resolvedIndexes` returned only the
   * newly derived indexes. The sweep pairs funded source rows to prepared
   * destinations, so a short list moved a source's funds into another source's
   * destination and left the last source with none — in the mode whose whole
   * claim is that the accounts stay apart.
   */
  it('resolves the COMPLETE planned set, in plan order, when only some are loaded', async () => {
    const { accounts, resolvedIndexes } =
      await deriveMissingDestinationAccounts(
        {
          wallet: walletWith([0, 3]),
          destinationAccountIndexes: [2, 3, 4],
          blockchainNetworkId: NETWORK_ID,
        },
        dependencies,
      );
    expect(resolvedIndexes).toEqual([2, 3, 4]);
    // Only the absent ones are created; index 3 is reused as it stands.
    expect(
      accounts.map(
        account =>
          (account.blockchainSpecific as { accountIndex: number }).accountIndex,
      ),
    ).toEqual([2, 4]);
  });
});

/** Real bech32: the grouped-address mapper validates what it is handed. */
const UNUSED_ADDRESS =
  'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz';
const USED_ADDRESS =
  'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle';
const REWARD_ACCOUNT =
  'stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d';

const discovered = (addressBech32: string) => ({
  address: addressBech32,
  data: {
    accountIndex: 0,
    index: 0,
    networkId: 0,
    rewardAccount: REWARD_ACCOUNT,
    type: 0,
    stakeKeyDerivationPath: { index: 0, role: 2 },
  },
});

/** Reports the given indexes as used on chain, everything else as never seen. */
const providerWith = (usedIndexes: Set<number>) => ({
  discoverAddresses: vi.fn(({ accountIndex }: { accountIndex: number }) =>
    of(
      Ok(
        discovered(
          usedIndexes.has(accountIndex) ? USED_ADDRESS : UNUSED_ADDRESS,
        ),
      ),
    ),
  ),
  getRewardAccountInfo: vi.fn(() =>
    of(Ok({ isRegistered: false, withdrawableAmount: 0n })),
  ),
  getAccountUtxos: vi.fn(() => of(Ok([]))),
  getAddressTransactionHistory: vi.fn(({ address }: { address: string }) =>
    of(Ok(address === USED_ADDRESS ? [{ txId: 'tx1' }] : [])),
  ),
});

const deviceDeps = (usedIndexes: Set<number>) =>
  ({
    cardanoProvider: providerWith(usedIndexes),
    __getState: vi.fn(),
    loadModules: vi.fn(),
  } as never);

describe('deriveMissingDestinationAccountsOnDevice', () => {
  beforeEach(() => {
    exportedIndexes.length = 0;
  });

  /**
   * The regression this covers: the device path used to return the planned
   * indexes unchanged whenever they were all already loaded. A hardware
   * destination is never probed at discovery either — `freshDestinationMapping$`
   * needs an encrypted root to derive candidate keys — so that early return was
   * the only freshness check there was, and skipping it could land preserved
   * funds in accounts that already have on-chain history.
   */
  it('probes loaded accounts and walks past ones already used on chain', async () => {
    const { resolvedIndexes } = await deriveMissingDestinationAccountsOnDevice(
      {
        wallet: walletWith([0, 1]),
        destinationAccountIndexes: [0, 1],
        blockchainNetworkId: NETWORK_ID,
        device: {} as never,
      },
      deviceDeps(new Set([0, 1])),
    );
    expect(resolvedIndexes).toEqual([2, 3]);
  });

  it('reuses a loaded account that is unused on chain, spending no approval', async () => {
    const { accounts, resolvedIndexes } =
      await deriveMissingDestinationAccountsOnDevice(
        {
          wallet: walletWith([0, 1]),
          destinationAccountIndexes: [0, 1],
          blockchainNetworkId: NETWORK_ID,
          device: {} as never,
        },
        deviceDeps(new Set()),
      );
    expect(resolvedIndexes).toEqual([0, 1]);
    // Loaded and unused: nothing created, and no on-device export driven.
    expect(accounts).toHaveLength(0);
    expect(exportedIndexes).toEqual([]);
  });

  it('exports only the accounts the wallet does not hold', async () => {
    const { accounts } = await deriveMissingDestinationAccountsOnDevice(
      {
        wallet: walletWith([0]),
        destinationAccountIndexes: [0, 1],
        blockchainNetworkId: NETWORK_ID,
        device: {} as never,
      },
      deviceDeps(new Set()),
    );
    expect(exportedIndexes).toEqual([1]);
    expect(accounts).toHaveLength(1);
  });
});
