import { Cardano } from '@cardano-sdk/core';
import {
  CardanoAccountId,
  deriveAccountExtendedPublicKey,
  extractOwnedPaymentCredentials,
  filterFrankenUtxos,
} from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-lib/util';
import {
  isNotFoundError,
  PROVIDER_REQUEST_RETRY_CONFIG,
} from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import { defer, firstValueFrom, from, map, of, toArray } from 'rxjs';

import { isScriptUtxo, uniqueRewardAccounts } from '../helpers';

import type { SideEffect } from '../..';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { AnyBlockchainAddress } from '@lace-contract/addresses';
import type {
  CardanoAddressData,
  CardanoProvider,
  CardanoRewardAccount,
  RewardAccountInfo,
} from '@lace-contract/cardano-context';
import type {
  AccountId,
  AnyWallet,
  InMemoryWallet,
  WalletId,
} from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

type Dependencies = Parameters<SideEffect>[2];
type ScanDependencies = Pick<Dependencies, 'cardanoProvider' | 'logger'> & {
  accessAuthSecret: Dependencies['accessAuthSecret'];
};

// Wallet software creates BIP44 account indexes consecutively, so stop after a
// run of unused indexes.
//
// One margin for every source kind. A device probe is not free — a round-trip
// per index, and a confirmation each on a device in expert mode (see
// `device-account-source.ts` for the actual policy) — but a narrower gap buys
// that saving by stranding funds: it stops at the first unused index, so a user
// who skipped one leaves every account above it behind on the retained source.
// Ten costs at most ten probes to conclude "no more accounts", which is worth
// it. Anything past the run still stays behind, where it remains reachable —
// the disclosure model for anything unscanned.
const ACCOUNT_INDEX_GAP = 10;

/**
 * One active account beyond index 0, with the material the sweep needs: its
 * signing identity (accountIndex and xpub), its addresses, and its UTxOs. Reward
 * info is not carried, run-discovery re-fetches it over the whole address union
 * for the S8 refusal.
 */
export type AccountResolution = {
  accountId: AccountId;
  accountIndex: number;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  addresses: GroupedAddress[];
  utxos: Cardano.Utxo[];
};

/**
 * Whether an account is active. NON-narrowing (design risk): active if it holds
 * UTxOs, OR a registered stake key, OR withdrawable rewards. Narrowing to
 * UTxO-presence would silently drop a rewards-only or registered-zero-UTxO
 * account.
 *
 * Callers must pass the RAW stake-scoped UTxOs, never the spendable subset. This
 * answers "was this account index ever used", which is what resets the BIP44 gap,
 * and a UTxO the sweep key cannot spend is still proof the index was used. The
 * separate question of what the sweep may pin is answered by the filtered set.
 * Collapsing the two lets an account holding only unspendable UTxOs close the
 * gap early, stranding funded accounts past it.
 */
export const isAccountActive = ({
  utxos,
  rewardInfo,
}: {
  utxos: Cardano.Utxo[];
  rewardInfo: Pick<RewardAccountInfo, 'isRegistered' | 'withdrawableAmount'>;
}): boolean =>
  utxos.length > 0 ||
  rewardInfo.isRegistered ||
  BigNumber.valueOf(rewardInfo.withdrawableAmount) > 0n;

/**
 * The scan's output: the active accounts found beyond index 0, and the frontier
 * the scan reached. `scannedThroughAccountIndex` is the highest account index
 * probed before the gap stopped the scan (0 when the wallet cannot be scanned).
 * Funds on accounts past it were never checked, so a successful migration can
 * disclose the scanned range instead of implying every account moved.
 */
export type ActiveAccountScanResult = {
  resolutions: AccountResolution[];
  scannedThroughAccountIndex: number;
  /**
   * Scanned UTxOs dropped because their payment credential is a script, summed
   * over every probed account. Disclosed on the review screen because a script
   * credential is the one unspendable shape no pre-submit guard rejects.
   *
   * Covers the SCANNED accounts only. Account 0's dropped set never reaches the
   * store, so run-discovery reads its count back from the provider and adds it
   * to this one.
   *
   * Says NOTHING about ownership. Pairing any script hash with a stake
   * credential needs no secret, so a third party can inflate this. It is also
   * not a DeFi-exposure measure: only positions that kept the stake credential
   * are visible.
   */
  scriptUtxoCount: number;
};

/** One probed account index. See {@link isAccountActive} for the gap split. */
type AccountProbe = {
  /** Present only when the account has something to sweep or sign. */
  resolution: AccountResolution | null;
  /** Whether the index was used on chain at all, which resets the gap. */
  isIndexUsed: boolean;
  scriptUtxoCount: number;
};

const INACTIVE_PROBE: AccountProbe = {
  resolution: null,
  isIndexUsed: false,
  scriptUtxoCount: 0,
};

/**
 * Scans the imported source wallet for active accounts beyond index 0 and
 * returns each with its fetched material (see {@link AccountResolution}), plus
 * the frontier reached (see {@link ActiveAccountScanResult}). Accounts 1+ are not
 * in the store, so it DERIVES each account's xpub from the wallet's encrypted
 * root (unlocked per-iteration under the AuthSecret) and fetches from the
 * provider. Stops after a gap of 10 consecutive inactive indexes. An active
 * account resets the gap.
 */
export type ActiveAccountScan = (
  input: {
    wallet: AnyWallet;
    chainId: Cardano.ChainId;
    /** Device xpub exporter for a hardware source; absent for in-memory. */
    deviceXpubSource?: AccountXpubSource;
    /** Probe exactly these indexes instead of walking until a gap. */
    knownAccountIndexes?: number[];
  },
  dependencies: ScanDependencies,
) => Observable<ActiveAccountScanResult>;

export const toGroupedAddress = ({
  address,
  data,
}: AnyBlockchainAddress<CardanoAddressData>): GroupedAddress => ({
  accountIndex: data!.accountIndex,
  address: Cardano.PaymentAddress(address),
  index: data!.index,
  networkId: data!.networkId,
  rewardAccount: Cardano.RewardAccount(data!.rewardAccount),
  type: data!.type,
  stakeKeyDerivationPath: data!.stakeKeyDerivationPath,
});

/**
 * The reward account's stake-scoped UTxOs. A never-seen stake address 404s to
 * empty. retryBackoff absorbs a transient provider blip before a persistent
 * error surfaces to run-discovery's retryable failure.
 */
export const accountUtxos = async (
  cardanoProvider: CardanoProvider,
  chainId: Cardano.ChainId,
  rewardAccount: CardanoRewardAccount,
): Promise<Cardano.Utxo[]> =>
  firstValueFrom(
    // defer must wrap the call: the provider replays a settled result on
    // re-subscription, so a retry re-issues the request only because it
    // re-invokes this factory.
    defer(() =>
      cardanoProvider.getAccountUtxos({ rewardAccount }, { chainId }),
    ).pipe(
      map(result => {
        if (result.isErr()) {
          if (isNotFoundError(result.unwrapErr())) return [];
          throw result.unwrapErr();
        }
        return result.unwrap();
      }),
      retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
    ),
  );

/** The reward account's registration and withdrawable-rewards info, with retry. */
export const rewardAccountInfo = async (
  cardanoProvider: CardanoProvider,
  chainId: Cardano.ChainId,
  rewardAccount: CardanoRewardAccount,
): Promise<RewardAccountInfo> =>
  firstValueFrom(
    defer(() =>
      cardanoProvider.getRewardAccountInfo({ rewardAccount }, { chainId }),
    ).pipe(
      map(result => {
        // Throw the raw ProviderError, never unwrap()'s wrapper: shouldRetry
        // classifies by `reason`, and the wrapper carries none, which would
        // make every failure retriable — Forbidden and BadRequest included.
        if (result.isErr()) throw result.unwrapErr();
        return result.unwrap();
      }),
      retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
    ),
  );

/**
 * Resolves an account index's xpub. The in-memory source derives it from the
 * encrypted root; a hardware source exports it from the connected device (one
 * on-device approval per export, batched where the family's transport allows);
 * a loaded-wallet source reads it off the wallet's own accounts, so
 * `undefined` means "no such account loaded" — an unused index, not an error.
 */
export type AccountXpubSource = (
  accountIndex: number,
) => Promise<Bip32PublicKeyHex | undefined>;

const resolveProviderAccount = async (
  accountIndex: number,
  {
    walletId,
    chainId,
    xpubForIndex,
  }: {
    walletId: WalletId;
    chainId: Cardano.ChainId;
    xpubForIndex: AccountXpubSource;
  },
  { cardanoProvider, logger }: Omit<ScanDependencies, 'accessAuthSecret'>,
): Promise<AccountProbe> => {
  const extendedAccountPublicKey = await xpubForIndex(accountIndex);
  // No xpub for this index (a loaded-wallet source past its loaded accounts):
  // an unused probe, which advances the stop-gap rather than failing the scan.
  if (extendedAccountPublicKey === undefined) {
    return { resolution: null, isIndexUsed: false, scriptUtxoCount: 0 };
  }

  // Loud-fail on a discovery error, never a silent filter: dropping a failed
  // result would strand that account's funds (empty addresses read as an
  // inactive account and the account is skipped). retryBackoff absorbs a
  // transient blip first, then a persistent error surfaces to run-discovery's
  // retryable failure, so the scan is either complete or visibly failed.
  const discovered = await firstValueFrom(
    cardanoProvider
      // Standard discovery, deliberately NOT thorough. Thorough terminates only
      // once the provider's address set drains, and a script or franken address
      // can never be derived from the xpub, so it would walk all 10000 indexes
      // per stake key and blow the discovery timeout on exactly the wallets this
      // filter exists for. Cost: an owned address past the payment gap of 100 is
      // absent here, so its UTxO is dropped as unowned rather than swept.
      .discoverAddresses(
        { xpub: extendedAccountPublicKey, accountIndex },
        { chainId },
      )
      .pipe(
        map(result => {
          if (result.isErr()) throw result.unwrapErr();
          return result.unwrap();
        }),
        toArray(),
        retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
      ),
  );

  const baseAddresses = discovered.map(toGroupedAddress);
  // Multi-delegation holds one account's funds under several stake keys, and
  // discovery returns base addresses across all of them. Fetch base UTxOs and
  // reward info for EVERY reward account, not just baseAddresses[0]: a single-
  // stake-key fetch strands the funds held under the account's other stake keys.
  // Mirrors account 0, whose store-backed set already spans every stake key.
  const rewardAccounts = uniqueRewardAccounts(baseAddresses);
  if (rewardAccounts.length === 0) return INACTIVE_PROBE;

  const stakeScopedUtxos = (
    await Promise.all(
      rewardAccounts.map(async rewardAccount =>
        accountUtxos(cardanoProvider, chainId, rewardAccount),
      ),
    )
  ).flat();
  // A stake-scoped fetch returns every UTxO carrying this account's stake
  // credential, including ones whose PAYMENT credential is a script or a key
  // hash the wallet does not hold. The sweep key cannot spend either, so pinning
  // them builds a plan the signer can never satisfy.
  const { legitimate: utxos, franken } = filterFrankenUtxos(
    stakeScopedUtxos,
    extractOwnedPaymentCredentials(discovered),
  );
  if (franken.length > 0) {
    logger.warn(
      `Dropped ${franken.length} unspendable UTxOs for scanned account ${accountIndex}`,
    );
  }
  const rewardInfos = await Promise.all(
    rewardAccounts.map(async rewardAccount =>
      rewardAccountInfo(cardanoProvider, chainId, rewardAccount),
    ),
  );

  const scriptUtxoCount = franken.filter(isScriptUtxo).length;
  // The gap asks whether the index was used, so it reads the RAW set.
  const isIndexUsed = rewardInfos.some(rewardInfo =>
    isAccountActive({ utxos: stakeScopedUtxos, rewardInfo }),
  );
  // The resolution asks whether anything can actually move, so it reads the
  // filtered set. An account can be used but have nothing sweepable.
  const hasSweepableValue = rewardInfos.some(rewardInfo =>
    isAccountActive({ utxos, rewardInfo }),
  );

  return {
    isIndexUsed,
    scriptUtxoCount,
    resolution: hasSweepableValue
      ? {
          accountId: CardanoAccountId(
            walletId,
            accountIndex,
            chainId.networkMagic,
          ),
          accountIndex,
          extendedAccountPublicKey,
          addresses: baseAddresses,
          utxos,
        }
      : null,
  };
};

export const scanActiveAccounts: ActiveAccountScan = (
  { wallet, chainId, deviceXpubSource, knownAccountIndexes },
  dependencies,
) =>
  defer(() => {
    const encryptedRootPrivateKey = (wallet as InMemoryWallet)
      .blockchainSpecific?.Cardano?.encryptedRootPrivateKey;
    // An in-memory source derives xpubs from its encrypted root; a hardware
    // source needs a device exporter supplied by the caller. With neither
    // (script wallets, or a hardware family with no per-index export) there is
    // nothing to probe beyond account 0. Emit synchronously so that case does
    // not spin up the async loop.
    const xpubForIndex: AccountXpubSource | undefined = encryptedRootPrivateKey
      ? async accountIndex =>
          firstValueFrom(
            dependencies.accessAuthSecret(authSecret =>
              from(
                // Derive INSIDE accessAuthSecret so the secret clone is bounded
                // to the derive; the provider round-trips happen outside it.
                deriveAccountExtendedPublicKey({
                  encryptedRootPrivateKey,
                  accountIndex,
                  authSecret,
                }),
              ),
            ),
          )
      : deviceXpubSource;
    if (!xpubForIndex)
      return of<ActiveAccountScanResult>({
        resolutions: [],
        scannedThroughAccountIndex: 0,
        scriptUtxoCount: 0,
      });
    const { walletId } = wallet;

    return from(
      (async (): Promise<ActiveAccountScanResult> => {
        const resolutions: AccountResolution[] = [];
        let scriptUtxoCount = 0;

        // A loaded wallet lists its accounts, so probe exactly those — but
        // ONLY when it cannot derive its own keys.
        //
        // The list is the better source for a hardware wallet: indexes past
        // the loaded set read as undefined, so a gap walk stops at the first
        // one and leaves an account beyond it behind. For a source with an
        // encrypted root the opposite holds — it can derive any index, and
        // Lace's account list is not evidence of what the seed has on chain. A
        // seed used at account 2 in another app, with only 0 and 1 loaded here,
        // had account 2's funds stranded; the same phrase typed on the phrase
        // screen finds them, because that path has no list to trust.
        if (knownAccountIndexes !== undefined && !encryptedRootPrivateKey) {
          for (const index of knownAccountIndexes) {
            const probe = await resolveProviderAccount(
              index,
              { walletId, chainId, xpubForIndex },
              dependencies,
            );
            if (probe.resolution) resolutions.push(probe.resolution);
            scriptUtxoCount += probe.scriptUtxoCount;
          }
          return {
            resolutions,
            scriptUtxoCount,
            scannedThroughAccountIndex: Math.max(0, ...knownAccountIndexes),
          };
        }

        let inactiveRun = 0;
        let accountIndex = 1;
        while (inactiveRun < ACCOUNT_INDEX_GAP) {
          const probe = await resolveProviderAccount(
            accountIndex,
            { walletId, chainId, xpubForIndex },
            dependencies,
          );
          if (probe.resolution) resolutions.push(probe.resolution);
          scriptUtxoCount += probe.scriptUtxoCount;
          inactiveRun = probe.isIndexUsed ? 0 : inactiveRun + 1;
          accountIndex += 1;
        }
        // accountIndex sits one past the last probed index at loop exit.
        return {
          resolutions,
          scriptUtxoCount,
          scannedThroughAccountIndex: accountIndex - 1,
        };
      })(),
    );
  });
