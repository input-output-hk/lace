import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { BigNumber, Err, Ok } from '@lace-lib/util';
import { firstValueFrom, from, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { scanActiveAccounts } from '../../../src/store/side-effects/scan-active-accounts';

import type { AnyBlockchainAddress } from '@lace-contract/addresses';
import type {
  CardanoAddressData,
  CardanoProvider,
  RewardAccountInfo,
} from '@lace-contract/cardano-context';
import type { AnyWallet } from '@lace-contract/wallet-repo';

vi.mock('@lace-contract/cardano-context', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  // Bypass real crypto: the scan derives an account xpub per index, but this
  // test drives discovery/UTxO/reward off the injected provider, not the key.
  deriveAccountExtendedPublicKey: vi.fn().mockResolvedValue('xpub' as never),
}));

const chainId = Cardano.ChainIds.Preprod;
// Real preprod bech32 fixtures: PaymentAddress and RewardAccount validate.
const STAKE_A =
  'stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d';
const STAKE_B =
  'stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx';
const STAKE_EMPTY =
  'stake_test1uqehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gssrtvn';
const PAY_A =
  'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz';
const PAY_B =
  'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle';
const PAY_EMPTY =
  'addr_test1qpktptaz7xlvv0ser3p0r5uwfdx243wccg5u35ar6ss8awv5rs0r8umwxy2zp4y0e0qmthzs2dmgtjt2ahrscq4pwz7q84j6l3';
// A base address whose payment credential is a key hash the wallet does not
// hold. Its own stake credential is irrelevant: the provider mock is keyed by
// reward account, mirroring a stake-scoped fetch that returns whatever a third
// party parked under the account's stake credential.
const PAY_FOREIGN =
  'addr_test1qqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jffw0vfldkgjfgtdmlkyv3m374lps3t3lv7t379ncxn4tp5qlnk7yu';
// A SCRIPT payment credential, the resting-DEX-order shape. Distinct from
// PAY_FOREIGN because the signing guard cannot see this one: required-signer
// derivation skips script credentials, so only the filter stops it.
// Its stake credential IS STAKE_A's, which is why a stake-scoped fetch returns
// it at all.
const PAY_SCRIPT =
  'addr_test1zqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jftuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q5jdz53';

const wallet = {
  blockchainSpecific: { Cardano: { encryptedRootPrivateKey: 'deadbeef' } },
} as unknown as AnyWallet;

const accessAuthSecret = (<T>(callback: (secret: never) => T): T =>
  callback(undefined as never)) as never;

const logger = {
  warn: vi.fn(),
} as unknown as Parameters<typeof scanActiveAccounts>[1]['logger'];

const address = (
  accountIndex: number,
  paymentAddress: string,
  rewardAccount: string,
): AnyBlockchainAddress<CardanoAddressData> =>
  ({
    address: paymentAddress,
    data: {
      accountIndex,
      index: 0,
      networkId: chainId.networkId,
      networkMagic: chainId.networkMagic,
      rewardAccount,
      type: 0,
      stakeKeyDerivationPath: undefined,
    },
  } as unknown as AnyBlockchainAddress<CardanoAddressData>);

const utxo = (paymentAddress: string): Cardano.Utxo =>
  [
    {},
    { address: Cardano.PaymentAddress(paymentAddress) },
  ] as unknown as Cardano.Utxo;

const rewardInfo = (
  overrides: Partial<Pick<RewardAccountInfo, 'isRegistered'>> = {},
): RewardAccountInfo =>
  ({
    isRegistered: false,
    withdrawableAmount: BigNumber(0n),
    ...overrides,
  } as unknown as RewardAccountInfo);

/**
 * Builds a provider whose account-1 discovery spans two stake keys and whose
 * per-stake UTxO/reward reads come from the supplied maps. Every account past 1
 * discovers a single inactive stake key so the gap closes and the scan stops.
 */
const providerFor = ({
  account1Addresses,
  utxosByStake,
  rewardByStake,
}: {
  account1Addresses: AnyBlockchainAddress<CardanoAddressData>[];
  utxosByStake: Record<string, Cardano.Utxo[]>;
  rewardByStake: Record<string, RewardAccountInfo>;
}) => {
  const getAccountUtxos = vi.fn(
    ({ rewardAccount }: { rewardAccount: string }) =>
      of(Ok(utxosByStake[rewardAccount] ?? [])),
  );
  const cardanoProvider = {
    discoverAddresses: ({ accountIndex }: { accountIndex: number }) =>
      from(
        (accountIndex === 1
          ? account1Addresses
          : [address(accountIndex, PAY_EMPTY, STAKE_EMPTY)]
        ).map(a => Ok(a)),
      ),
    getAccountUtxos,
    getRewardAccountInfo: ({ rewardAccount }: { rewardAccount: string }) =>
      of(Ok(rewardByStake[rewardAccount] ?? rewardInfo())),
  } as unknown as CardanoProvider;
  return { cardanoProvider, getAccountUtxos };
};

describe('scanActiveAccounts multi-stake-key resolution', () => {
  beforeEach(() => vi.clearAllMocks());

  it('unions base UTxOs across every stake key of a scanned account', async () => {
    const { cardanoProvider, getAccountUtxos } = providerFor({
      account1Addresses: [
        address(1, PAY_A, STAKE_A),
        address(1, PAY_B, STAKE_B),
      ],
      utxosByStake: { [STAKE_A]: [utxo(PAY_A)], [STAKE_B]: [utxo(PAY_B)] },
      rewardByStake: {},
    });

    const { resolutions } = await firstValueFrom(
      scanActiveAccounts(
        { wallet, chainId },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(resolutions).toHaveLength(1);
    // Both stake keys' UTxOs are in the swept set, not just the first.
    expect(resolutions[0].utxos).toHaveLength(2);
    const queried = getAccountUtxos.mock.calls.map(
      ([{ rewardAccount }]) => rewardAccount,
    );
    expect(queried).toContain(STAKE_A);
    expect(queried).toContain(STAKE_B);
  });

  it('keeps an account funded only under a secondary stake key', async () => {
    const { cardanoProvider } = providerFor({
      account1Addresses: [
        address(1, PAY_A, STAKE_A),
        address(1, PAY_B, STAKE_B),
      ],
      // Stake key 0 empty and unregistered, all funds under stake key 1.
      utxosByStake: { [STAKE_B]: [utxo(PAY_B)] },
      rewardByStake: {},
    });

    const { resolutions } = await firstValueFrom(
      scanActiveAccounts(
        { wallet, chainId },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(resolutions).toHaveLength(1);
    expect(resolutions[0].utxos).toHaveLength(1);
  });

  it('keeps an account active via a secondary stake key registration alone', async () => {
    const { cardanoProvider } = providerFor({
      account1Addresses: [
        address(1, PAY_A, STAKE_A),
        address(1, PAY_B, STAKE_B),
      ],
      utxosByStake: {},
      rewardByStake: { [STAKE_B]: rewardInfo({ isRegistered: true }) },
    });

    const { resolutions } = await firstValueFrom(
      scanActiveAccounts(
        { wallet, chainId },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(resolutions).toHaveLength(1);
  });
});

describe('scanActiveAccounts payment credential reconciliation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('drops a UTxO whose payment credential is absent from the account addresses', async () => {
    const { cardanoProvider } = providerFor({
      account1Addresses: [address(1, PAY_A, STAKE_A)],
      // Carries the account's stake credential, so the stake-scoped fetch
      // returns it, but the sweep key cannot spend it.
      utxosByStake: { [STAKE_A]: [utxo(PAY_FOREIGN)] },
      // Registration alone keeps the account active once its only UTxO is
      // dropped, so the assertion sees a resolution with an empty pinned set
      // rather than no resolution at all.
      rewardByStake: { [STAKE_A]: rewardInfo({ isRegistered: true }) },
    });

    const { resolutions } = await firstValueFrom(
      scanActiveAccounts(
        { wallet, chainId },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(resolutions).toHaveLength(1);
    expect(resolutions[0].utxos).toEqual([]);
  });

  it('keeps the owned UTxOs of an account that also holds an unspendable one', async () => {
    const { cardanoProvider } = providerFor({
      account1Addresses: [address(1, PAY_A, STAKE_A)],
      utxosByStake: { [STAKE_A]: [utxo(PAY_A), utxo(PAY_FOREIGN)] },
      rewardByStake: {},
    });

    const { resolutions } = await firstValueFrom(
      scanActiveAccounts(
        { wallet, chainId },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(resolutions).toHaveLength(1);
    expect(resolutions[0].utxos).toEqual([utxo(PAY_A)]);
  });
});

describe('scanActiveAccounts script-locked UTxOs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('drops a script-credential UTxO the signing guard cannot see and counts it', async () => {
    const { cardanoProvider } = providerFor({
      account1Addresses: [address(1, PAY_A, STAKE_A)],
      utxosByStake: { [STAKE_A]: [utxo(PAY_SCRIPT)] },
      rewardByStake: { [STAKE_A]: rewardInfo({ isRegistered: true }) },
    });

    const { resolutions, scriptUtxoCount } = await firstValueFrom(
      scanActiveAccounts(
        { wallet, chainId },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(resolutions[0].utxos).toEqual([]);
    expect(scriptUtxoCount).toBe(1);
  });

  it('excludes a foreign key hash from the script count, which the pre-submit signing guard already rejects', async () => {
    const { cardanoProvider } = providerFor({
      account1Addresses: [address(1, PAY_A, STAKE_A)],
      utxosByStake: { [STAKE_A]: [utxo(PAY_FOREIGN)] },
      rewardByStake: { [STAKE_A]: rewardInfo({ isRegistered: true }) },
    });

    const { scriptUtxoCount } = await firstValueFrom(
      scanActiveAccounts(
        { wallet, chainId },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(scriptUtxoCount).toBe(0);
  });

  it('warns with the count of dropped UTxOs', async () => {
    const { cardanoProvider } = providerFor({
      account1Addresses: [address(1, PAY_A, STAKE_A)],
      utxosByStake: { [STAKE_A]: [utxo(PAY_SCRIPT), utxo(PAY_FOREIGN)] },
      rewardByStake: { [STAKE_A]: rewardInfo({ isRegistered: true }) },
    });

    await firstValueFrom(
      scanActiveAccounts(
        { wallet, chainId },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(logger.warn).toHaveBeenCalledWith(
      'Dropped 2 unspendable UTxOs for scanned account 1',
    );
  });
});

describe('scanActiveAccounts account-index gap', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resets the gap on an index used only by unspendable UTxOs, so later funded accounts are still probed', async () => {
    const { cardanoProvider } = providerFor({
      // Nothing sweepable and no registration, so the account yields no
      // resolution, but the UTxO still proves index 1 was used.
      account1Addresses: [address(1, PAY_A, STAKE_A)],
      utxosByStake: { [STAKE_A]: [utxo(PAY_SCRIPT)] },
      rewardByStake: {},
    });

    const { resolutions, scannedThroughAccountIndex } = await firstValueFrom(
      scanActiveAccounts(
        { wallet, chainId },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(resolutions).toHaveLength(0);
    // Index 1 reset the gap, so the scan ran to 11 rather than stopping at 10.
    expect(scannedThroughAccountIndex).toBe(11);
  });
});

describe('scanActiveAccounts non-scannable wallet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('[cov non-scannable] returns an empty result synchronously without calling the provider for a wallet with no encrypted root key', async () => {
    const nonInMemoryWallet = {
      blockchainSpecific: { Cardano: {} },
    } as unknown as AnyWallet;
    const getAccountUtxos = vi.fn();
    const getRewardAccountInfo = vi.fn();
    const cardanoProvider = {
      discoverAddresses: vi.fn(),
      getAccountUtxos,
      getRewardAccountInfo,
    } as unknown as CardanoProvider;

    const result = await firstValueFrom(
      scanActiveAccounts(
        { wallet: nonInMemoryWallet, chainId },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(result).toEqual({
      resolutions: [],
      scriptUtxoCount: 0,
      scannedThroughAccountIndex: 0,
    });
    expect(getAccountUtxos).not.toHaveBeenCalled();
    expect(getRewardAccountInfo).not.toHaveBeenCalled();
  });
});

describe('scanActiveAccounts accountUtxos error handling', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads a never-seen stake key as empty on a 404, keeping the account from its other key', async () => {
    const getAccountUtxos = vi.fn(
      ({ rewardAccount }: { rewardAccount: string }) => {
        if (rewardAccount === STAKE_A)
          return of(Err(new ProviderError(ProviderFailure.NotFound)));
        // Only account 1's second stake key holds funds. Every later account
        // (STAKE_EMPTY) stays empty so the gap of 10 closes and the scan stops.
        if (rewardAccount === STAKE_B) return of(Ok([utxo(PAY_B)]));
        return of(Ok([]));
      },
    );
    const cardanoProvider = {
      discoverAddresses: ({ accountIndex }: { accountIndex: number }) =>
        from(
          (accountIndex === 1
            ? [address(1, PAY_A, STAKE_A), address(1, PAY_B, STAKE_B)]
            : [address(accountIndex, PAY_EMPTY, STAKE_EMPTY)]
          ).map(a => Ok(a)),
        ),
      getAccountUtxos,
      getRewardAccountInfo: () => of(Ok(rewardInfo())),
    } as unknown as CardanoProvider;

    const { resolutions } = await firstValueFrom(
      scanActiveAccounts(
        { wallet, chainId },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(resolutions).toHaveLength(1);
    expect(resolutions[0].utxos).toHaveLength(1);
  });

  // Real timers: fake timers deadlock against scanActiveAccounts' async IIFE and
  // the rxjs retry scheduler. retryBackoff exhausts 3 real backoff delays
  // (~2.1s) before the error surfaces, which is why this case is slower.
  it('errors the scan on a persistent non-404 failure instead of dropping the account silently', async () => {
    const getAccountUtxos = vi
      .fn()
      .mockReturnValue(of(Err(new ProviderError(ProviderFailure.Unhealthy))));
    const cardanoProvider = {
      discoverAddresses: ({ accountIndex }: { accountIndex: number }) =>
        from(
          (accountIndex === 1
            ? [address(1, PAY_A, STAKE_A)]
            : [address(accountIndex, PAY_EMPTY, STAKE_EMPTY)]
          ).map(a => Ok(a)),
        ),
      getAccountUtxos,
      getRewardAccountInfo: () => of(Ok(rewardInfo())),
    } as unknown as CardanoProvider;

    await expect(
      firstValueFrom(
        scanActiveAccounts(
          { wallet, chainId },
          { cardanoProvider, accessAuthSecret, logger },
        ),
      ),
    ).rejects.toThrow(ProviderError);
  });

  // Real timers: fake timers deadlock against scanActiveAccounts' async IIFE and
  // the rxjs retry scheduler. retryBackoff exhausts 3 real backoff delays
  // (~2.1s) before the error surfaces, which is why this case is slower.
  it('[cov reward-info-err] errors the scan on a persistent reward-info failure instead of dropping the account silently', async () => {
    const getRewardAccountInfo = vi
      .fn()
      .mockReturnValue(of(Err(new ProviderError(ProviderFailure.Unhealthy))));
    const cardanoProvider = {
      discoverAddresses: ({ accountIndex }: { accountIndex: number }) =>
        from(
          (accountIndex === 1
            ? [address(1, PAY_A, STAKE_A)]
            : [address(accountIndex, PAY_EMPTY, STAKE_EMPTY)]
          ).map(a => Ok(a)),
        ),
      getAccountUtxos: () => of(Ok([])),
      getRewardAccountInfo,
    } as unknown as CardanoProvider;

    // shouldRetry reads `reason`, which only the raw ProviderError carries.
    await expect(
      firstValueFrom(
        scanActiveAccounts(
          { wallet, chainId },
          { cardanoProvider, accessAuthSecret, logger },
        ),
      ),
    ).rejects.toThrow(ProviderError);
  });
});

// Real timers: fake timers deadlock against the scan's async IIFE and the rxjs
// retry scheduler, so each recovery case pays one real 300ms backoff.
describe('scanActiveAccounts provider retry', () => {
  beforeEach(() => vi.clearAllMocks());

  it('recovers the scan when a transient accountUtxos failure clears on retry', async () => {
    let pendingFailures = 1;
    const getAccountUtxos = vi.fn(
      ({ rewardAccount }: { rewardAccount: string }) => {
        if (rewardAccount === STAKE_A && pendingFailures-- > 0)
          return of(Err(new ProviderError(ProviderFailure.Unhealthy)));
        return of(Ok(rewardAccount === STAKE_A ? [utxo(PAY_A)] : []));
      },
    );
    const cardanoProvider = {
      discoverAddresses: ({ accountIndex }: { accountIndex: number }) =>
        from(
          (accountIndex === 1
            ? [address(1, PAY_A, STAKE_A)]
            : [address(accountIndex, PAY_EMPTY, STAKE_EMPTY)]
          ).map(a => Ok(a)),
        ),
      getAccountUtxos,
      getRewardAccountInfo: () => of(Ok(rewardInfo())),
    } as unknown as CardanoProvider;

    const { resolutions } = await firstValueFrom(
      scanActiveAccounts(
        { wallet, chainId },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(resolutions).toHaveLength(1);
    expect(resolutions[0].utxos).toHaveLength(1);
    // A retry that only re-subscribed would leave this at 1.
    expect(
      getAccountUtxos.mock.calls.filter(
        ([{ rewardAccount }]) => rewardAccount === STAKE_A,
      ),
    ).toHaveLength(2);
  });

  it('recovers the scan when a transient rewardAccountInfo failure clears on retry', async () => {
    let pendingFailures = 1;
    const getRewardAccountInfo = vi.fn(
      ({ rewardAccount }: { rewardAccount: string }) => {
        if (rewardAccount === STAKE_A && pendingFailures-- > 0)
          return of(Err(new ProviderError(ProviderFailure.Unhealthy)));
        return of(Ok(rewardInfo()));
      },
    );
    const cardanoProvider = {
      discoverAddresses: ({ accountIndex }: { accountIndex: number }) =>
        from(
          (accountIndex === 1
            ? [address(1, PAY_A, STAKE_A)]
            : [address(accountIndex, PAY_EMPTY, STAKE_EMPTY)]
          ).map(a => Ok(a)),
        ),
      getAccountUtxos: ({ rewardAccount }: { rewardAccount: string }) =>
        of(Ok(rewardAccount === STAKE_A ? [utxo(PAY_A)] : [])),
      getRewardAccountInfo,
    } as unknown as CardanoProvider;

    const { resolutions } = await firstValueFrom(
      scanActiveAccounts(
        { wallet, chainId },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(resolutions).toHaveLength(1);
    expect(
      getRewardAccountInfo.mock.calls.filter(
        ([{ rewardAccount }]) => rewardAccount === STAKE_A,
      ),
    ).toHaveLength(2);
  });

  it('fails the scan on a non-retriable rewardAccountInfo failure without burning the backoff', async () => {
    const getRewardAccountInfo = vi
      .fn()
      .mockReturnValue(of(Err(new ProviderError(ProviderFailure.Forbidden))));
    const cardanoProvider = {
      discoverAddresses: ({ accountIndex }: { accountIndex: number }) =>
        from(
          (accountIndex === 1
            ? [address(1, PAY_A, STAKE_A)]
            : [address(accountIndex, PAY_EMPTY, STAKE_EMPTY)]
          ).map(a => Ok(a)),
        ),
      getAccountUtxos: () => of(Ok([])),
      getRewardAccountInfo,
    } as unknown as CardanoProvider;

    await expect(
      firstValueFrom(
        scanActiveAccounts(
          { wallet, chainId },
          { cardanoProvider, accessAuthSecret, logger },
        ),
      ),
    ).rejects.toThrow(ProviderError);
    // A wrapped error would carry no `reason`, and defer would then retry this
    // Forbidden 4 times.
    expect(getRewardAccountInfo).toHaveBeenCalledTimes(1);
  });
});

describe('scanActiveAccounts frontier', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports the last probed index after a gap of 10 inactive accounts', async () => {
    const { cardanoProvider } = providerFor({
      account1Addresses: [address(1, PAY_EMPTY, STAKE_EMPTY)],
      utxosByStake: {},
      rewardByStake: {},
    });

    const { resolutions, scannedThroughAccountIndex } = await firstValueFrom(
      scanActiveAccounts(
        { wallet, chainId },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(resolutions).toHaveLength(0);
    // Accounts 1 through 10 probed and inactive, closing the gap of 10.
    expect(scannedThroughAccountIndex).toBe(10);
  });

  it('[cov frontier] resets the gap on an active account, closing a fresh gap of 10 past it', async () => {
    const { cardanoProvider } = providerFor({
      account1Addresses: [address(1, PAY_A, STAKE_A)],
      utxosByStake: { [STAKE_A]: [utxo(PAY_A)] },
      rewardByStake: {},
    });

    const { resolutions, scannedThroughAccountIndex } = await firstValueFrom(
      scanActiveAccounts(
        { wallet, chainId },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(resolutions).toHaveLength(1);
    // Account 1 is active (resets inactiveRun to 0); accounts 2-11 are
    // inactive, closing a fresh gap of 10 at index 11.
    expect(scannedThroughAccountIndex).toBe(11);
  });
});

describe('scanActiveAccounts hardware source', () => {
  beforeEach(() => vi.clearAllMocks());

  const hardwareWallet = {
    walletId: 'hw-wallet',
    blockchainSpecific: {},
  } as unknown as AnyWallet;

  /**
   * What the gap of 5 buys. A user who created accounts 1 and 3 and left 2
   * unused is ordinary; with a gap of 1 the scan stopped at 2 and account 3's
   * funds were silently left on the retained source.
   */
  it('finds an account past a skipped index', async () => {
    const cardanoProvider = {
      // 1 and 3 hold funds under their own stake keys; everything else is a
      // never-used address, so the run of unused indexes closes the scan.
      discoverAddresses: ({ accountIndex }: { accountIndex: number }) =>
        from(
          [
            accountIndex === 1
              ? address(1, PAY_A, STAKE_A)
              : accountIndex === 3
              ? address(3, PAY_B, STAKE_B)
              : address(accountIndex, PAY_EMPTY, STAKE_EMPTY),
          ].map(a => Ok(a)),
        ),
      getAccountUtxos: ({ rewardAccount }: { rewardAccount: string }) =>
        of(
          Ok(
            rewardAccount === STAKE_A
              ? [utxo(PAY_A)]
              : rewardAccount === STAKE_B
              ? [utxo(PAY_B)]
              : [],
          ),
        ),
      getRewardAccountInfo: () => of(Ok(rewardInfo())),
    } as unknown as CardanoProvider;

    const { resolutions } = await firstValueFrom(
      scanActiveAccounts(
        {
          wallet: hardwareWallet,
          chainId,
          deviceXpubSource: vi.fn(
            async (accountIndex: number) =>
              `device-xpub-${accountIndex}` as never,
          ),
        },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(resolutions.map(({ accountIndex }) => accountIndex)).toEqual([1, 3]);
  });

  it('probes accounts 1+ through the device xpub source when the wallet has no root', async () => {
    const { cardanoProvider } = providerFor({
      account1Addresses: [address(1, PAY_A, STAKE_A)],
      utxosByStake: { [STAKE_A]: [utxo(PAY_A)] },
      rewardByStake: {},
    });
    const deviceXpubSource = vi.fn(
      async (accountIndex: number) => `device-xpub-${accountIndex}` as never,
    );

    const { resolutions, scannedThroughAccountIndex } = await firstValueFrom(
      scanActiveAccounts(
        { wallet: hardwareWallet, chainId, deviceXpubSource },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(resolutions).toHaveLength(1);
    // The resolution carries the DEVICE-exported xpub — the signer for this
    // account is device-bound, so a root-derived key could never witness it.
    expect(resolutions[0].extendedAccountPublicKey).toBe('device-xpub-1');
    // One gap for every source kind: account 1 active, then ten unused in a row
    // (2-11) closes it, same as the root-derived scan. A narrower device-only
    // gap would stop sooner and strand everything above a skipped index.
    expect(scannedThroughAccountIndex).toBe(11);
    expect(deviceXpubSource).toHaveBeenCalledTimes(11);
  });

  it('probes exactly the loaded indexes for a hardware source, so an account past a gap is not lost', async () => {
    const { cardanoProvider } = providerFor({
      account1Addresses: [address(1, PAY_A, STAKE_A)],
      utxosByStake: { [STAKE_A]: [utxo(PAY_A)] },
      rewardByStake: {},
    });
    const deviceXpubSource = vi.fn(
      async (accountIndex: number) => `device-xpub-${accountIndex}` as never,
    );

    const { scannedThroughAccountIndex } = await firstValueFrom(
      scanActiveAccounts(
        {
          wallet: hardwareWallet,
          chainId,
          deviceXpubSource,
          // Index 1 absent: a gap walk would stop there and never reach 3.
          knownAccountIndexes: [1, 3],
        },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    expect(scannedThroughAccountIndex).toBe(3);
    expect(deviceXpubSource.mock.calls.map(([index]) => index)).toEqual([1, 3]);
  });

  /**
   * The list is Lace's view, not the seed's. A root-holding source can derive
   * any index, so trusting the list stranded funds an account the same phrase
   * would have found: seed used at account 2 in another app, only 0 and 1 ever
   * loaded here.
   */
  it('gap-walks past the loaded indexes when the source has a root to derive from', async () => {
    const { cardanoProvider } = providerFor({
      account1Addresses: [address(1, PAY_A, STAKE_A)],
      utxosByStake: { [STAKE_A]: [utxo(PAY_A)] },
      rewardByStake: {},
    });

    const { scannedThroughAccountIndex } = await firstValueFrom(
      scanActiveAccounts(
        { wallet, chainId, knownAccountIndexes: [1] },
        { cardanoProvider, accessAuthSecret, logger },
      ),
    );

    // Ran the software gap walk (active at 1, then ten unused) rather than
    // stopping at the one index Lace happens to hold.
    expect(scannedThroughAccountIndex).toBe(11);
  });
});
