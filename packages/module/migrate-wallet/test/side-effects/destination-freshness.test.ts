import { Cardano } from '@cardano-sdk/core';
import { CardanoNetworkId } from '@lace-contract/cardano-context';
import { Ok } from '@lace-lib/util';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  freshDestinationMapping$,
  isAccountIndexUsed,
  MAX_DESTINATION_PROBE_CEILING,
  resolveUnusedDestinationIndexes,
} from '../../src/store/side-effects/destination-freshness';

import type { AccountMapping } from '../../src/store/slice';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { AnyWallet } from '@lace-contract/wallet-repo';

// Only the key derivation is replaced: the module reads real network-id and
// address value objects, which validate what they are handed.
vi.mock('@lace-contract/cardano-context', async importOriginal => ({
  ...(await importOriginal<object>()),
  // Literal, not the XPUB const: the factory runs at import time, before this
  // module's own bindings are initialised.
  deriveAccountExtendedPublicKey: vi.fn(async () => 'xpub-hex'),
}));

const CHAIN_ID = Cardano.ChainIds.Preprod;
const XPUB = 'xpub-hex' as Bip32PublicKeyHex;

const REWARD_ACCOUNT =
  'stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d';

/** Real bech32: the grouped-address mapper validates what it is handed. */
const UNUSED_ADDRESS =
  'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz';
const USED_ADDRESS =
  'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle';

const address = (index: number, addressBech32 = UNUSED_ADDRESS) => ({
  address: addressBech32,
  data: {
    accountIndex: 0,
    index,
    networkId: 0,
    rewardAccount: REWARD_ACCOUNT,
    type: 0,
    stakeKeyDerivationPath: { index: 0, role: 2 },
  },
});

/**
 * A provider whose every answer is "never seen", overridable per test. Each
 * signal is checked independently, so a test only states the one it is about.
 */
const makeProvider = (overrides: Record<string, unknown> = {}) => ({
  discoverAddresses: vi.fn(() => of(Ok(address(0)))),
  getRewardAccountInfo: vi.fn(() =>
    of(Ok({ isRegistered: false, withdrawableAmount: 0n })),
  ),
  getAccountUtxos: vi.fn(() => of(Ok([]))),
  getAddressTransactionHistory: vi.fn(() => of(Ok([]))),
  ...overrides,
});

const probe = async (provider: ReturnType<typeof makeProvider>) =>
  isAccountIndexUsed(
    { accountIndex: 1, extendedAccountPublicKey: XPUB, chainId: CHAIN_ID },
    { cardanoProvider: provider } as never,
  );

describe('isAccountIndexUsed', () => {
  it('is unused when the account has no history, no rewards and no UTxOs', async () => {
    await expect(probe(makeProvider())).resolves.toBe(false);
  });

  // The case current-state checks miss, and the reason this predicate is not
  // the source scan's: emptied and deregistered leaves nothing to hold, but
  // the addresses are already linked to whoever they transacted with.
  it('is used when an address has transaction history but holds nothing now', async () => {
    const provider = makeProvider({
      getAddressTransactionHistory: vi.fn(() => of(Ok([{ txId: 'tx1' }]))),
    });
    await expect(probe(provider)).resolves.toBe(true);
  });

  it('is used when the stake key is registered', async () => {
    const provider = makeProvider({
      getRewardAccountInfo: vi.fn(() =>
        of(Ok({ isRegistered: true, withdrawableAmount: 0n })),
      ),
    });
    await expect(probe(provider)).resolves.toBe(true);
  });

  it('is used when rewards are withdrawable', async () => {
    const provider = makeProvider({
      getRewardAccountInfo: vi.fn(() =>
        of(Ok({ isRegistered: false, withdrawableAmount: 5n })),
      ),
    });
    await expect(probe(provider)).resolves.toBe(true);
  });

  it('is used when the account holds UTxOs', async () => {
    const provider = makeProvider({
      getAccountUtxos: vi.fn(() => of(Ok([['in', { address: 'a' }]]))),
    });
    await expect(probe(provider)).resolves.toBe(true);
  });
});

describe('resolveUnusedDestinationIndexes', () => {
  const walk = async ({
    usedIndexes = new Set<number>(),
    xpubByIndex,
    startIndex = 1,
    count = 2,
  }: {
    usedIndexes?: Set<number>;
    xpubByIndex?: Map<number, Bip32PublicKeyHex>;
    startIndex?: number;
    count?: number;
  }) => {
    const probed: number[] = [];
    const provider = makeProvider({
      getAddressTransactionHistory: vi.fn(
        ({ address: queried }: { address: string }) =>
          of(Ok(queried === USED_ADDRESS ? [{ txId: 'tx1' }] : [])),
      ),
      discoverAddresses: vi.fn(({ accountIndex }: { accountIndex: number }) =>
        of(
          Ok(
            usedIndexes.has(accountIndex)
              ? address(0, USED_ADDRESS)
              : address(0),
          ),
        ),
      ),
    });
    const indexes = await resolveUnusedDestinationIndexes(
      {
        startIndex,
        count,
        xpubByIndex,
        chainId: CHAIN_ID,
        xpubForIndex: async (accountIndex: number) => {
          probed.push(accountIndex);
          return XPUB;
        },
      },
      { cardanoProvider: provider } as never,
    );
    return { indexes, probed };
  };

  it('takes the planned indexes when they are unused', async () => {
    const { indexes } = await walk({});
    expect(indexes).toEqual([1, 2]);
  });

  // The gap this closes: a hardware wallet used in another app has on-chain
  // accounts Lace never loaded, so "highest loaded index + 1" is not unused.
  it('advances past an index that has history on chain', async () => {
    const { indexes } = await walk({ usedIndexes: new Set([1, 2]) });
    expect(indexes).toEqual([3, 4]);
  });

  // The rule this pins: a loaded account is a candidate, not an exclusion. An
  // account Lace already holds that has never touched the chain is the target
  // we want — creating a new one instead is waste.
  it('reuses a loaded account that is unused on chain', async () => {
    const { indexes } = await walk({ startIndex: 0, count: 2 });
    expect(indexes).toEqual([0, 1]);
  });

  it('takes a loaded key without deriving one for it', async () => {
    const { indexes, probed } = await walk({
      startIndex: 0,
      count: 1,
      xpubByIndex: new Map([[0, XPUB]]),
    });
    expect(indexes).toEqual([0]);
    expect(probed).not.toContain(0);
  });

  // A long run of used indexes is normal for a wallet driven by another app —
  // accounts are contiguous from 0 — and is exactly what the walk exists to
  // pass through, so it must not be mistaken for a pathological wallet.
  it('walks past a long run of used indexes rather than giving up', async () => {
    const { indexes } = await walk({
      usedIndexes: new Set(Array.from({ length: 30 }, (_, index) => index)),
    });
    expect(indexes).toEqual([30, 31]);
  });

  // The ceiling only stops a provider that reports every index as used from
  // looping forever; it fails before anything is signed.
  it('fails at the runaway ceiling when every index reads as used', async () => {
    await expect(
      walk({
        usedIndexes: new Set(
          Array.from(
            { length: MAX_DESTINATION_PROBE_CEILING + 5 },
            (_, index) => index,
          ),
        ),
      }),
    ).rejects.toThrow('Could not find 2 unused destination accounts');
  });

  it('treats an index with no derivable key as unused', async () => {
    const provider = makeProvider();
    const indexes = await resolveUnusedDestinationIndexes(
      {
        startIndex: 4,
        count: 1,
        chainId: CHAIN_ID,
        xpubForIndex: async () => undefined,
      },
      { cardanoProvider: provider } as never,
    );
    expect(indexes).toEqual([4]);
    expect(provider.discoverAddresses).not.toHaveBeenCalled();
  });
});

describe('freshDestinationMapping$', () => {
  const NETWORK_ID = CardanoNetworkId(CHAIN_ID.networkMagic);

  const mappingRow = (
    sourceAccountIndex: number,
    destinationAccountIndex: number,
  ) => ({
    sourceAccountIndex,
    destinationAccountIndex,
    coin: '1000000',
    assetCount: 0,
    utxoCount: 1,
  });

  const loadedAccount = (accountIndex: number) => ({
    accountId: `acct-${accountIndex}`,
    blockchainName: 'Cardano',
    blockchainNetworkId: NETWORK_ID,
    blockchainSpecific: { accountIndex, extendedAccountPublicKey: XPUB },
  });

  // No default for the root key: passing `undefined` to a defaulted parameter
  // would silently take the default and give the wallet a root it should lack.
  const walletWith = (
    accountIndexes: number[],
    encryptedRootPrivateKey?: string,
  ) =>
    ({
      accounts: accountIndexes.map(loadedAccount),
      blockchainSpecific: { Cardano: { encryptedRootPrivateKey } },
    } as unknown as AnyWallet);

  const resolve = async ({
    mapping,
    wallet,
    usedIndexes = new Set<number>(),
    fixedDestinationAccountIndex,
  }: {
    mapping: AccountMapping;
    wallet: AnyWallet | undefined;
    usedIndexes?: Set<number>;
    fixedDestinationAccountIndex?: number;
  }) => {
    const accessAuthSecret = vi.fn(
      (callback: (secret: Uint8Array) => unknown) =>
        callback(new Uint8Array(32)) as never,
    );
    const cardanoProvider = makeProvider({
      getAddressTransactionHistory: vi.fn(
        ({ address: queried }: { address: string }) =>
          of(Ok(queried === USED_ADDRESS ? [{ txId: 'tx1' }] : [])),
      ),
      discoverAddresses: vi.fn(({ accountIndex }: { accountIndex: number }) =>
        of(
          Ok(
            usedIndexes.has(accountIndex)
              ? address(0, USED_ADDRESS)
              : address(0),
          ),
        ),
      ),
    });
    const resolved = await firstValueFrom(
      freshDestinationMapping$(
        {
          mapping,
          wallet,
          blockchainNetworkId: NETWORK_ID,
          fixedDestinationAccountIndex,
        },
        { accessAuthSecret, cardanoProvider } as never,
      ),
    );
    return {
      destinationIndexes: resolved.map(row => row.destinationAccountIndex),
      accessAuthSecret,
    };
  };

  // The planned indexes come from a plan built before anything was probed, so
  // "highest loaded + 1" can name accounts another app already transacted with.
  it('repoints the plan onto indexes that are unused on chain', async () => {
    const { destinationIndexes } = await resolve({
      mapping: [mappingRow(0, 2), mappingRow(1, 3)],
      wallet: walletWith([0, 1], 'deadbeef'),
      usedIndexes: new Set([0, 1, 2]),
    });
    expect(destinationIndexes).toEqual([3, 4]);
  });

  // The rule the review screen then states: an account Lace already holds that
  // has never touched the chain is the target, and it costs no derivation.
  it('reuses a loaded account that is unused on chain', async () => {
    const { destinationIndexes, accessAuthSecret } = await resolve({
      mapping: [mappingRow(0, 2)],
      wallet: walletWith([0, 1], 'deadbeef'),
      usedIndexes: new Set([]),
    });
    expect(destinationIndexes).toEqual([0]);
    expect(accessAuthSecret).not.toHaveBeenCalled();
  });

  // Every row landing in one account is the user's own choice of destination,
  // not a search for a free one — probing it would only find it used and move
  // the funds somewhere they did not ask for. Stated by the caller, because the
  // shape of the plan cannot say it (see the test below).
  it('leaves a deliberately fixed destination alone', async () => {
    const { destinationIndexes } = await resolve({
      mapping: [mappingRow(0, 1), mappingRow(1, 1)],
      wallet: walletWith([0, 1], 'deadbeef'),
      usedIndexes: new Set([1]),
      fixedDestinationAccountIndex: 1,
    });
    expect(destinationIndexes).toEqual([1, 1]);
  });

  /**
   * The hole the inferred predicate left. "One planned index, and it happens to
   * be loaded" was read as a deliberate choice and skipped the probe — which is
   * exactly the ordinary one-account migration into an existing wallet, where
   * planning starts at the destination's lowest account. That account can have
   * history, and the funds landed in it unchecked.
   */
  it('probes a lone planned index that is merely loaded, not deliberately fixed', async () => {
    const { destinationIndexes } = await resolve({
      mapping: [mappingRow(0, 0)],
      wallet: walletWith([0], 'deadbeef'),
      usedIndexes: new Set([0]),
    });
    // Account 0 is loaded but used on chain, so the walk moves past it.
    expect(destinationIndexes).toEqual([1]);
  });

  /**
   * A rewards-only row is never migrated, so no account is created for it. It
   * used to consume a resolved index anyway, leaving a hole in the
   * destination's sequence: standard BIP44 recovery stops at the first unused
   * index, so every account above the hole is invisible to other wallets.
   */
  it('gives a rewards-only row no resolved index, so the created accounts stay contiguous', async () => {
    const rewardsOnly = { ...mappingRow(0, 0), utxoCount: 0, coin: '0' };
    const { destinationIndexes } = await resolve({
      mapping: [rewardsOnly, mappingRow(1, 1), mappingRow(2, 2)],
      wallet: walletWith([0], 'deadbeef'),
      usedIndexes: new Set([0]),
    });
    // The two funded rows take 1 and 2 — contiguous from the loaded account —
    // rather than 2 and 3 with the unmigrated row squatting on 1.
    expect(destinationIndexes.slice(1)).toEqual([1, 2]);
  });

  // A destination that can only export keys on-device: probing needs the
  // device, which is not connected at discovery, so the device path does it.
  it('leaves a destination with no derivable root alone', async () => {
    const { destinationIndexes } = await resolve({
      mapping: [mappingRow(0, 2)],
      wallet: walletWith([0]),
      usedIndexes: new Set([2]),
    });
    expect(destinationIndexes).toEqual([2]);
  });
});
