import {
  BitcoinAccountId,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import {
  CardanoAccountId,
  cardanoNetworkMagicToNetworkType,
  CardanoNetworkId,
} from '@lace-contract/cardano-context';
import {
  MidnightAccountId,
  MidnightNetworkId,
  midnightNetworkIdToNetworkType,
} from '@lace-contract/midnight-context';
import { WalletId, WalletType } from '@lace-contract/wallet-repo';
import {
  concat,
  concatMap,
  EMPTY,
  expand,
  first,
  from,
  map,
  merge,
  mergeMap,
  of,
  switchMap,
  take,
  timer,
  withLatestFrom,
} from 'rxjs';

import type { SideEffect } from '../..';
import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { BitcoinBip32AccountProps } from '@lace-contract/bitcoin-context';
import type { CardanoBip32AccountProps } from '@lace-contract/cardano-context';
import type { MidnightSDKNetworkId } from '@lace-contract/midnight-context';
import type {
  AccountId,
  AnyWallet,
  HardwareWalletAccount,
  HardwareWalletKeystone,
  HardwareWalletLedger,
  HardwareWalletSeedSigner,
  HardwareWalletTrezor,
  InMemoryWallet,
  InMemoryWalletAccount,
  LazyInMemoryWallet,
  LazyInMemoryWalletAccount,
  WalletMetadata,
} from '@lace-contract/wallet-repo';
import type { WalletInfo } from '@lace-lib/extension-shell-api';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

/** How often the guest re-reads the host vault while waiting for a change. */
const POLL_INTERVAL_MS = 1500;
/**
 * Upper bound on how long ONE window keeps polling before giving up, so the host
 * SW can idle again when no change lands in it (e.g. the user cancelled a
 * ceremony). A window that DOES observe a change re-arms — see
 * {@link hydrateWalletRepo} — so the polling stops on the first quiet window,
 * never on a change.
 */
const POLL_CEILING_MS = 60 * 1000;
const MAX_POLLS = Math.ceil(POLL_CEILING_MS / POLL_INTERVAL_MS);
/** The tick a ceremony window drops to once its fast phase is spent. */
const CEREMONY_SLOW_INTERVAL_MS = 5000;
/**
 * How long a CEREMONY window (a mount request, see {@link hydrateWalletRepo})
 * keeps polling. An air-gapped pairing is a human-paced two-way QR exchange
 * that routinely outlives {@link POLL_CEILING_MS}, and its host window hands
 * the guest no completion signal (ADR 34 pull model) — a window that expired at
 * a minute left the wallet in the host vault and the user on the device picker.
 * The cadence backs off rather than staying fast, so the extra reach costs ~110
 * reads instead of ~400.
 */
const CEREMONY_POLL_CEILING_MS = 10 * 60 * 1000;
const CEREMONY_SLOW_POLLS = Math.ceil(
  (CEREMONY_POLL_CEILING_MS - POLL_CEILING_MS) / CEREMONY_SLOW_INTERVAL_MS,
);
/**
 * A window-refocus re-arm polls the host vault ONCE: attention returning is a
 * hint that something may have changed, not a ceremony to wait on, and one read
 * per focus keeps ordinary attention churn cheap. A genuine miss re-arms on the
 * next focus — and a focus event is not guaranteed at all when a host-owned
 * ceremony window closes, which is why the ceremony's own window (not this) is
 * what a slow pairing depends on.
 */
const REFOCUS_MAX_POLLS = 1;

/** The SECRET-FREE public props a projected Midnight account carries (ADR 43):
 * the engine-computed publics written back to the vault. The guest UI reads
 * `networkId` (via `isInMemoryMidnightAccount`, which checks only
 * accountType/blockchainName); the state itself flows through redux from the
 * midnight-host-pull poller. No key/seed — signing is a host ceremony. */
type MidnightShellAccountProps = {
  accountIndex: number;
  networkId: MidnightSDKNetworkId;
  shieldedAddress: string;
  unshieldedAddress: string;
  dustAddress: string;
  publicKeys: { coinPublicKey: string; encryptionPublicKey: string };
};

// A shell holds a wallet's Cardano, Bitcoin AND Midnight accounts side by side,
// so its account props are the union of each chain's public props (ADR 11: each
// account carries its own network).
type ShellAccountProps =
  | BitcoinBip32AccountProps
  | CardanoBip32AccountProps
  | MidnightShellAccountProps;
type Shell = InMemoryWallet<ShellAccountProps>;
type ShellAccount = InMemoryWalletAccount<ShellAccountProps>;
// A LazyInMemory wallet carries the same public material as an InMemory one and
// differs in what is NOT at rest: Lace persists no seed for it, so no host
// ceremony can ever unseal it. It projects READ-ONLY — reads work off the same
// xpubs, while HostSignerFactory.canSign and the host's
// SIGNABLE_CARDANO_WALLET_TYPES both refuse the type. Do NOT project it as
// InMemory to make signing look available: the host would refuse mid-ceremony.
type LazyShell = LazyInMemoryWallet<ShellAccountProps>;
type LazyShellAccount = LazyInMemoryWalletAccount<ShellAccountProps>;
// A host-paired hardware wallet (Ledger, Trezor, Keystone or SeedSigner)
// projects as a WATCH-ONLY shell (ADR 44 / ADR 44 / ADR 44): the same public
// Cardano material as an InMemory shell, but `type`/`accountType` mark the paired
// device so the guest signer routes through the host device ceremony. All four
// device types share one account shape — HardwareWalletAccount's accountType
// union covers them.
type HardwareKeystoneShell = HardwareWalletKeystone<ShellAccountProps>;
type HardwareLedgerShell = HardwareWalletLedger<ShellAccountProps>;
type HardwareSeedSignerShell = HardwareWalletSeedSigner<ShellAccountProps>;
type HardwareTrezorShell = HardwareWalletTrezor<ShellAccountProps>;
type HardwareShellAccount = HardwareWalletAccount<ShellAccountProps>;
type ProjectedHardwareType =
  | 'HardwareKeystone'
  | 'HardwareLedger'
  | 'HardwareSeedSigner'
  | 'HardwareTrezor';
type ProjectedWallet =
  | HardwareKeystoneShell
  | HardwareLedgerShell
  | HardwareSeedSignerShell
  | HardwareTrezorShell
  | LazyShell
  | Shell;

/** The add/remove/update work needed to reconcile the repo with the host vault. */
export type WalletRepoDiff = {
  toAdd: ProjectedWallet[];
  toRemove: { walletId: WalletId; accountIds: AccountId[] }[];
  // `accounts` stays a homogeneous per-wallet-type array (never a mixed
  // InMemory|Hardware union): the repo's `updateWallet` payload is
  // `Partial<AnyWallet>`, which each wallet type's account array satisfies but a
  // mixed array does not — so `diffWallets` discriminates before building it.
  toUpdate: {
    id: WalletId;
    changes:
      | { metadata: WalletMetadata; accounts: HardwareShellAccount[] }
      | { metadata: WalletMetadata; accounts: LazyShellAccount[] }
      | { metadata: WalletMetadata; accounts: ShellAccount[] };
  }[];
};

/** Project one host `WalletInfo.cardanoAccounts` entry into a SECRET-FREE
 * wallet-repo account — each account carries its OWN network (ADR 11: the wire
 * ships networkMagic + networkId per account, so the guest builds the chainId +
 * derives the network without a baked magic→id map). PUBLIC material only. */
const cardanoAccountToShellEntity = (
  walletId: WalletId,
  account: WalletInfo['cardanoAccounts'][number],
): ShellAccount => {
  const chainId: Cardano.ChainId = {
    networkId: account.networkId,
    networkMagic: account.networkMagic,
  };
  return {
    accountId: CardanoAccountId(
      walletId,
      account.accountIndex,
      chainId.networkMagic,
    ),
    walletId,
    blockchainName: 'Cardano',
    accountType: 'InMemory',
    networkType: cardanoNetworkMagicToNetworkType(chainId.networkMagic),
    blockchainNetworkId: CardanoNetworkId(chainId.networkMagic),
    metadata: { name: account.name },
    blockchainSpecific: {
      accountIndex: account.accountIndex,
      extendedAccountPublicKey: account.xpub as Bip32PublicKeyHex,
      chainId,
    },
  };
};

/** Project one host `WalletInfo.cardanoAccounts` entry into a SECRET-FREE
 * watch-only hardware wallet-repo account (ADR 44 / ADR 44 / ADR 44): identical
 * PUBLIC Cardano material to the InMemory projection, but marked with the paired
 * device's `accountType` (Ledger / Trezor / Keystone / SeedSigner) so the guest
 * signer routes signing through the host device ceremony. `networkId` rides
 * alongside `chainId` to match the monolith's migrated hardware account shape
 * (blockchain-cardano's hardware `blockchainSpecific`). */
const cardanoAccountToHardwareShellEntity = (
  walletId: WalletId,
  account: WalletInfo['cardanoAccounts'][number],
  accountType: ProjectedHardwareType,
): HardwareShellAccount => {
  const chainId: Cardano.ChainId = {
    networkId: account.networkId,
    networkMagic: account.networkMagic,
  };
  const networkId = CardanoNetworkId(chainId.networkMagic);
  return {
    accountId: CardanoAccountId(
      walletId,
      account.accountIndex,
      chainId.networkMagic,
    ),
    walletId,
    blockchainName: 'Cardano',
    accountType,
    networkType: cardanoNetworkMagicToNetworkType(chainId.networkMagic),
    blockchainNetworkId: networkId,
    metadata: { name: account.name },
    blockchainSpecific: {
      chainId,
      accountIndex: account.accountIndex,
      extendedAccountPublicKey: account.xpub as Bip32PublicKeyHex,
      networkId,
    } satisfies CardanoBip32AccountProps,
  };
};

/** Project one host `WalletInfo.bitcoinAccounts` entry into a SECRET-FREE
 * wallet-repo account, matching the monolith's `buildAccountsForNetworks`
 * (blockchain-bitcoin): `network` rides the wire because the wallet holds both
 * network accounts at each index, so it — not the account index alone —
 * disambiguates the accountId. PUBLIC material only (the per-purpose xpub set;
 * no seed). */
const bitcoinAccountToShellEntity = (
  walletId: WalletId,
  account: WalletInfo['bitcoinAccounts'][number],
): ShellAccount => {
  const networkId = BitcoinNetworkId(account.network);
  return {
    accountId: BitcoinAccountId(
      walletId,
      account.accountIndex,
      BitcoinNetworkId.getBitcoinNetwork(networkId),
    ),
    walletId,
    blockchainName: 'Bitcoin',
    accountType: 'InMemory',
    networkType: account.network === 'mainnet' ? 'mainnet' : 'testnet',
    blockchainNetworkId: networkId,
    metadata: { name: account.name },
    blockchainSpecific: {
      accountIndex: account.accountIndex,
      extendedAccountPublicKeys: account.xpubs,
      networkId,
    },
  };
};

/** Project one host `WalletInfo.bitcoinAccounts` entry into a SECRET-FREE
 * watch-only hardware wallet-repo account (ADR 44 / ADR 44 / ADR 44): the
 * watch-only shape a device enable-Bitcoin export produces — the `nativeSegWit`
 * xpub only plus the device `masterFingerprint` — marked with the paired
 * device's `accountType` (Ledger / Trezor / Keystone / SeedSigner) so the guest
 * signer routes signing through the host device ceremony. Matches the monolith's
 * `BitcoinBip32AccountProps`, so blockchain-bitcoin's `masterFingerprint`-gated
 * HW-aware build path (prev-tx embedding, change key-origin stamping) fires with
 * zero monolith changes. PUBLIC material only — the device holds the keys. */
const bitcoinAccountToHardwareShellEntity = (
  walletId: WalletId,
  account: WalletInfo['bitcoinAccounts'][number],
  accountType: ProjectedHardwareType,
): HardwareShellAccount => {
  const networkId = BitcoinNetworkId(account.network);
  return {
    accountId: BitcoinAccountId(
      walletId,
      account.accountIndex,
      BitcoinNetworkId.getBitcoinNetwork(networkId),
    ),
    walletId,
    blockchainName: 'Bitcoin',
    accountType,
    networkType: account.network === 'mainnet' ? 'mainnet' : 'testnet',
    blockchainNetworkId: networkId,
    metadata: { name: account.name },
    blockchainSpecific: {
      accountIndex: account.accountIndex,
      extendedAccountPublicKeys: { nativeSegWit: account.xpubs.nativeSegWit },
      networkId,
      masterFingerprint: account.masterFingerprint,
    } satisfies BitcoinBip32AccountProps,
  };
};

/** Project one host `WalletInfo.midnightAccounts` entry into a SECRET-FREE
 * wallet-repo account (ADR 43). Present ONLY once the host engine has computed
 * the account's publics and written them back — a freshly created wallet has no
 * entry, so the midnight-host-pull poller keys off the wallet (not this account)
 * to drive the first sync. `walletName` is the fallback for a host predating the
 * per-account `name` on the Midnight wire — without it a renamed Midnight
 * account would read as the wallet's name. PUBLIC material only — no key or
 * seed. */
const midnightAccountToShellEntity = (
  walletId: WalletId,
  walletName: string,
  account: NonNullable<WalletInfo['midnightAccounts']>[number],
): ShellAccount => {
  const networkId = account.networkId as MidnightSDKNetworkId;
  return {
    accountId: MidnightAccountId(walletId, account.accountIndex, networkId),
    walletId,
    blockchainName: 'Midnight',
    accountType: 'InMemory',
    networkType: midnightNetworkIdToNetworkType(networkId),
    blockchainNetworkId: MidnightNetworkId(networkId),
    metadata: { name: account.name ?? walletName },
    blockchainSpecific: {
      accountIndex: account.accountIndex,
      networkId,
      shieldedAddress: account.shieldedAddress,
      unshieldedAddress: account.unshieldedAddress,
      dustAddress: account.dustAddress,
      publicKeys: account.publicKeys,
    },
  };
};

/** Re-mark a projected account as lazy. `LazyInMemoryWalletAccount` differs
 * from `InMemoryWalletAccount` in the `accountType` discriminator alone — the
 * public material is identical — and no signer factory in the guest loadout
 * claims 'LazyInMemory', so the account reads normally and refuses to sign. */
const toLazyShellAccount = (account: ShellAccount): LazyShellAccount => ({
  ...account,
  accountType: 'LazyInMemory',
});

/** Map a host `WalletInfo.type` wire string to the guest `accountType` for a
 * watch-only hardware projection, or `undefined` when the type is not a
 * host-paired hardware wallet. Keystone / SeedSigner join Ledger / Trezor: a
 * migrated air-gapped wallet relocates into the host vault and now projects to
 * the guest for reads (ADR 44); signing still refuses these two types until the
 * host ceremonies land. */
const projectedHardwareAccountType = (
  walletType: string,
): ProjectedHardwareType | undefined => {
  if (walletType === (WalletType.HardwareKeystone as string))
    return 'HardwareKeystone';
  if (walletType === (WalletType.HardwareLedger as string))
    return 'HardwareLedger';
  if (walletType === (WalletType.HardwareSeedSigner as string))
    return 'HardwareSeedSigner';
  if (walletType === (WalletType.HardwareTrezor as string))
    return 'HardwareTrezor';
  return undefined;
};

/**
 * Project one host `WalletInfo` into a SECRET-FREE wallet-repo shell: an
 * `InMemoryWallet`  carrying EVERY Cardano and Bitcoin account across
 * networks plus any engine-computed Midnight accounts (ADR 43), OR a watch-only
 * hardware shell (Ledger / Trezor / Keystone / SeedSigner, ADR 44 / ADR 44 /
 * ADR 44) carrying its Cardano and watch-only Bitcoin accounts (ADR 44). All
 * hold PUBLIC material only — no `encryptedRootPrivateKey` /
 * `encryptedRecoveryPhrase` / seed — because signing is a host ceremony (the
 * host sign-guard makes it safe: a hardware sign is a device ceremony, an
 * InMemory sign an unseal ceremony), OR a read-only `LazyInMemoryWallet` — the
 * same public projection as an InMemory shell, marked lazy because no signer in
 * the guest claims that account type and no host ceremony can unseal a wallet
 * whose seed Lace never persisted. Any other type (Script/MultiSig) or an
 * account-less wallet returns undefined. Every hardware type projects with an
 * account on EITHER chain: a pairing names the blockchain it provisions, so any
 * of the four devices can be Bitcoin-only (ADR 44).
 */
export const walletInfoToShellEntity = (
  info: WalletInfo,
): ProjectedWallet | undefined => {
  // WalletInfo.type is an open wire string; the enum values narrow it. A
  // host-paired hardware wallet projects as a watch-only shell — the device
  // holds the keys, so no secret crosses (ADR 44 / ADR 44 / ADR 44).
  const accountType = projectedHardwareAccountType(info.type);
  if (accountType) {
    // A pairing names its blockchain (ADR 44), so ANY of the four device types
    // can be Bitcoin-only — a Bitcoin-first pairing extracts no Cardano material
    // at all, and a migrated air-gapped wallet may hold only Bitcoin. Only a
    // wallet with no account on either chain is unprojectable.
    if (
      info.cardanoAccounts.length === 0 &&
      info.bitcoinAccounts.length === 0
    ) {
      return undefined;
    }
    const walletId = WalletId(info.walletId);
    const metadata = { name: info.name, order: info.order };
    // Watch-only projection — the device holds the keys; no secret crosses.
    // `derivationType` stays host-internal (it drives device derivation, not
    // xpub-onward address derivation), so the Trezor shell omits it (ADR 44).
    const blockchainSpecific = {};
    const accounts: HardwareShellAccount[] = [
      ...info.cardanoAccounts.map(account =>
        cardanoAccountToHardwareShellEntity(walletId, account, accountType),
      ),
      ...info.bitcoinAccounts.map(account =>
        bitcoinAccountToHardwareShellEntity(walletId, account, accountType),
      ),
    ];
    const base = { walletId, metadata, blockchainSpecific, accounts };
    switch (accountType) {
      case 'HardwareKeystone':
        return { ...base, type: WalletType.HardwareKeystone };
      case 'HardwareLedger':
        return { ...base, type: WalletType.HardwareLedger };
      case 'HardwareSeedSigner':
        return { ...base, type: WalletType.HardwareSeedSigner };
      case 'HardwareTrezor':
        return { ...base, type: WalletType.HardwareTrezor };
    }
  }

  const isLazy = info.type === (WalletType.LazyInMemory as string);
  if (!isLazy && info.type !== (WalletType.InMemory as string)) {
    return undefined;
  }
  if (
    info.cardanoAccounts.length === 0 &&
    info.bitcoinAccounts.length === 0 &&
    (info.midnightAccounts?.length ?? 0) === 0
  ) {
    return undefined;
  }

  const walletId = WalletId(info.walletId);
  const metadata = { name: info.name, order: info.order };
  // Public projection only — deliberately no encrypted root key / seed.
  const blockchainSpecific = {};
  const accounts: ShellAccount[] = [
    ...info.cardanoAccounts.map(account =>
      cardanoAccountToShellEntity(walletId, account),
    ),
    ...info.bitcoinAccounts.map(account =>
      bitcoinAccountToShellEntity(walletId, account),
    ),
    ...(info.midnightAccounts ?? []).map(account =>
      midnightAccountToShellEntity(walletId, info.name, account),
    ),
  ];
  // `isPassphraseConfirmed` is absent from the lazy shell by construction: the
  // wallet has no Lace-held recovery phrase to confirm.
  return isLazy
    ? {
        walletId,
        type: WalletType.LazyInMemory,
        metadata,
        blockchainSpecific,
        accounts: accounts.map(toLazyShellAccount),
      }
    : {
        walletId,
        type: WalletType.InMemory,
        isPassphraseConfirmed: true,
        metadata,
        blockchainSpecific,
        accounts,
      };
};

// The wallet types the guest projects as shells: InMemory (unseal ceremony) and
// host-paired Ledger/Trezor/Keystone/SeedSigner (device ceremony, ADR 44
// D8 / ADR 44). Air-gapped types project read-only for now — signing still
// refuses them (ADR 44). LazyInMemory projects read-only permanently — see
// LazyShell. An omission here HIDES a wallet the host still holds, so a type is
// left out only when the wire cannot describe it (see unprojectableReason).
const PROJECTED_WALLET_TYPES: readonly string[] = [
  WalletType.HardwareKeystone,
  WalletType.HardwareLedger,
  WalletType.HardwareSeedSigner,
  WalletType.HardwareTrezor,
  WalletType.InMemory,
  WalletType.LazyInMemory,
];

/** Why a host wallet type has no guest projection. MultiSig is named rather
 * than left to an allowlist omission: `wallets.list` carries no `ownSigners`
 * set, so the guest cannot build a `MultiSigWalletAccount` even read-only —
 * projecting one would require a wire change, not an allowlist entry. */
const unprojectableReason = (walletType: string): string =>
  walletType === (WalletType.MultiSig as string)
    ? 'MultiSig is unsupported in the shell — the wallets.list wire carries no co-signer set to rebuild its accounts from'
    : `no guest projection exists for type ${walletType}`;

const projectHostWallets = (
  hostWallets: readonly WalletInfo[],
  logger: Logger,
): ProjectedWallet[] =>
  hostWallets.flatMap(info => {
    if (!PROJECTED_WALLET_TYPES.includes(info.type)) {
      logger.warn(
        `cardano-host-pull: wallet ${
          info.walletId
        } is NOT shown in the guest — ${unprojectableReason(
          info.type,
        )}. It stays in the host vault, and the diff never removes a wallet the vault still holds.`,
      );
      return [];
    }
    const shell = walletInfoToShellEntity(info);
    if (!shell) {
      // A PROJECTED type that still failed the per-type account guards — the
      // wallet is in the vault but the guest cannot render it, so say which
      // account counts produced that, rather than letting it look like a wallet
      // the host no longer holds.
      logger.warn(
        `cardano-host-pull: wallet ${info.walletId} (type ${
          info.type
        }) projects no shell — cardano: ${
          info.cardanoAccounts.length
        }, bitcoin: ${info.bitcoinAccounts.length}, midnight: ${
          info.midnightAccounts?.length ?? 0
        }`,
      );
      return [];
    }
    return [shell];
  });

// Locale-independent, so equal key multisets always align index-by-index.
const compareKeys = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

/** One account's identity AND its display name, joined by a separator no
 * accountId contains (ADR 13 ids are `-`-joined printable segments), so the
 * multiset comparison below cannot conflate an id/name pair with a different
 * split of the same characters. */
const accountKey = (account: {
  accountId: AccountId;
  metadata: { name: string };
}): string => `${account.accountId} ${account.metadata.name}`;

/** Whether two account sets carry the same ids AND the same per-account names.
 * Names are part of the comparison because the host vault is authoritative for
 * them: a rename changes no accountId, so an id-only diff would drop it and the
 * next projection would silently revert the guest's view to the stale name. */
const sameAccounts = (
  a: readonly { accountId: AccountId; metadata: { name: string } }[],
  b: readonly { accountId: AccountId; metadata: { name: string } }[],
): boolean => {
  if (a.length !== b.length) return false;
  const keysA = a.map(accountKey).sort(compareKeys);
  const keysB = b.map(accountKey).sort(compareKeys);
  return keysA.every((key, index) => key === keysB[index]);
};

const toShellUpdate = (w: Shell) => ({
  id: w.walletId,
  changes: { metadata: w.metadata, accounts: w.accounts },
});

const toLazyUpdate = (w: LazyShell) => ({
  id: w.walletId,
  changes: { metadata: w.metadata, accounts: w.accounts },
});

const toHardwareUpdate = (w: Exclude<ProjectedWallet, LazyShell | Shell>) => ({
  id: w.walletId,
  changes: { metadata: w.metadata, accounts: w.accounts },
});

/** Diff the host-projected shells against the current wallet-repo entities,
 * reconciling at ACCOUNT grain: a wallet whose account set changed (new or
 * removed accounts, or a RENAMED account) OR whose metadata changed produces a
 * wallet update carrying the full projected accounts array (the host vault is
 * authoritative).
 *
 * `hostWalletIds` is the FULL `wallets.list` id set, not just the projected
 * ones: removal must follow the vault, never the projection. A wallet the host
 * still holds but the guest cannot project (an unsupported type, or one whose
 * accounts failed the guards) is left alone — dropping it would delete a live
 * wallet from the repo, taking its other chains' accounts with it. */
export const diffWallets = (
  projected: readonly ProjectedWallet[],
  current: readonly AnyWallet[],
  hostWalletIds: ReadonlySet<string>,
): WalletRepoDiff => {
  const projectedById = new Map(projected.map(w => [w.walletId, w]));
  const currentById = new Map(current.map(w => [w.walletId, w]));

  const toAdd = projected.filter(w => !currentById.has(w.walletId));
  const toRemove = current
    .filter(
      w => !projectedById.has(w.walletId) && !hostWalletIds.has(w.walletId),
    )
    .map(w => ({
      walletId: w.walletId,
      accountIds: w.accounts.map(account => account.accountId),
    }));
  const toUpdate = projected
    .filter(w => {
      const existing = currentById.get(w.walletId);
      return (
        !!existing &&
        (existing.metadata.name !== w.metadata.name ||
          existing.metadata.order !== w.metadata.order ||
          !sameAccounts(existing.accounts, w.accounts))
      );
    })
    // Discriminate InMemory vs LazyInMemory vs hardware so `accounts` is a
    // homogeneous array (see WalletRepoDiff): the repo's `Partial<AnyWallet>`
    // update payload accepts any ONE wallet type's account array (Ledger and
    // Trezor share the same HardwareWalletAccount shape), but never a mixed union.
    .map(w => {
      if (w.type === WalletType.InMemory) return toShellUpdate(w);
      if (w.type === WalletType.LazyInMemory) return toLazyUpdate(w);
      return toHardwareUpdate(w);
    });

  return { toAdd, toRemove, toUpdate };
};

const isDiffEmpty = (diff: WalletRepoDiff): boolean =>
  diff.toAdd.length === 0 &&
  diff.toRemove.length === 0 &&
  diff.toUpdate.length === 0;

/** One emission per vault read, `maxPolls` of them at the fast cadence. */
const flatReads = (maxPolls: number): Observable<number> =>
  timer(0, POLL_INTERVAL_MS).pipe(take(maxPolls));

/**
 * One emission per vault read for a ceremony window: the fast cadence for the
 * first {@link POLL_CEILING_MS}, then {@link CEREMONY_SLOW_INTERVAL_MS} out to
 * {@link CEREMONY_POLL_CEILING_MS}. The slow phase starts when the fast one
 * completes — on its LAST tick, one fast interval short of the nominal minute —
 * so the tail runs that much short of the ceiling. Immaterial for a window whose
 * job is to outlive a human at a QR code.
 */
const ceremonyReads = (): Observable<number> =>
  concat(
    flatReads(MAX_POLLS),
    timer(CEREMONY_SLOW_INTERVAL_MS, CEREMONY_SLOW_INTERVAL_MS).pipe(
      take(CEREMONY_SLOW_POLLS),
    ),
  );

/**
 * Read-through projection of the host vault into the guest wallet-repo (ADR 34
 * pull model — no push events). A poll window reads `wallets.list` until the
 * projected set differs from the repo (or a poll ceiling elapses), so the host
 * SW can idle again once a change is observed or none ever lands. Three triggers
 * open a window:
 *
 * - boot opens the flat {@link MAX_POLLS} window;
 * - each explicit `syncWalletsRequested` (a ceremony mount request) opens the
 *   backing-off {@link CEREMONY_POLL_CEILING_MS} window, long enough to outlast
 *   a hand-driven air-gapped QR exchange;
 * - `windowRefocus$` opens a cheap {@link REFOCUS_MAX_POLLS} window ONCE the
 *   window it followed has closed — the guest regaining attention is a hint that
 *   something may have changed, never a reason to abandon a window that is
 *   already watching for it.
 *
 * Boot and mount both re-arm after every change they observe (see
 * {@link rearmingWindow}); the single refocus read does not — a hint that turned
 * out to matter comes back with the next focus.
 *
 * A boot/mount trigger supersedes whatever window is open (one in flight at a
 * time), so no stale answer outlives its trigger and focus churn never stacks
 * windows.
 *
 * Each account carries its own network (ADR 11), so the projection is
 * network-independent; cardano-sync filters to the active-network accounts.
 * Projects PUBLIC data only — the Cardano secret never exists guest-side.
 */
export const hydrateWalletRepo: SideEffect = (
  { cardanoHostPull: { syncWalletsRequested$ } },
  { wallets: { selectAll$ } },
  { actions, logger, listHostWallets, windowRefocus$ },
) => {
  /** One window: emits exactly ONE batch — the first non-empty diff it observes,
   * or `[]` when the reads ran out without one — then completes. */
  const pollWindow = (reads$: Observable<unknown>) =>
    reads$.pipe(
      concatMap(() => listHostWallets()),
      withLatestFrom(selectAll$),
      map(([result, current]) => {
        if (!result.ok) return [];
        const projected = projectHostWallets(result.value, logger);
        const diff = diffWallets(
          projected,
          current,
          new Set(result.value.map(info => info.walletId)),
        );
        if (isDiffEmpty(diff)) return [];
        return [
          ...diff.toRemove.map(({ walletId, accountIds }) =>
            actions.wallets.removeWallet(walletId, accountIds),
          ),
          ...diff.toAdd.map(shell => actions.wallets.addWallet(shell)),
          ...diff.toUpdate.map(({ id, changes }) =>
            actions.wallets.updateWallet({ id, changes }),
          ),
        ];
      }),
      first(dispatchable => dispatchable.length > 0, []),
    );

  const dispatchBatches = <T>(batches$: Observable<T[]>): Observable<T> =>
    batches$.pipe(mergeMap(batch => from(batch)));

  /**
   * A window's first observed change is rarely the session's last, so every
   * change re-arms a bounded follow-up window and the chain ends on the first
   * window that observes nothing. Both triggers need it, for different reasons:
   *
   * - a ceremony mount is a SESSION, not one op — the host wallet manager runs
   *   rename / remove / add-account / pairing from a SINGLE mount (ADR 36 §3)
   *   and the mount-only wire reports no completion;
   * - a boot that starts holding a wallet the host vault no longer has (a vault
   *   reset between sessions) spends its window on that removal, and the write
   *   that lands next — a re-import — arrives with no window open.
   *
   * Either way the stranded change waited on an unrelated boot or refocus, and
   * neither is guaranteed: a refocus does not fire when a host-owned window
   * closes.
   *
   * The chain always terminates: the batch is dispatched into the repo before
   * the follow-up's first read (which `timer(0, …)` schedules asynchronously, as
   * does the epic's own `delay(0)` hand-off to the store), so an unchanged host
   * vault diffs empty on that read.
   */
  const rearmingWindow = (reads$: Observable<unknown>) =>
    pollWindow(reads$).pipe(
      expand(batch =>
        batch.length > 0 ? pollWindow(flatReads(MAX_POLLS)) : EMPTY,
      ),
    );

  // Refocus polls, armed only once the window they follow has closed. A refocus
  // must NEVER supersede an open window: focus churns exactly WHILE a ceremony
  // runs (its own window takes focus and gives it back), so a refocus arriving
  // mid-ceremony used to replace the ceremony's long window with a single read —
  // taken seconds after the mount, long before a hand-driven pairing finishes.
  // That left NO window open when the wallet finally landed, which is what
  // stranded an air-gapped pairing in the host vault.
  const refocusPolls$ = windowRefocus$.pipe(
    switchMap(() => dispatchBatches(pollWindow(flatReads(REFOCUS_MAX_POLLS)))),
  );

  // ONE window at a time, across every trigger: two overlapping windows can both
  // be mid-flight over the same vault, and the older one's answer — read before a
  // removal landed — would resurrect the wallet the newer one just removed. Boot
  // and each mount request open a window; `switchMap` cancels whatever was open
  // (a removal ceremony settles, so its re-sync is what supersedes a stale read),
  // and `concat` keeps the refocus polls strictly after it. A re-armed follow-up
  // is part of the window chain it extends, so it is cancelled with it.
  return merge(
    of(dispatchBatches(rearmingWindow(flatReads(MAX_POLLS)))),
    syncWalletsRequested$.pipe(
      map(() => dispatchBatches(rearmingWindow(ceremonyReads()))),
    ),
  ).pipe(switchMap(window$ => concat(window$, refocusPolls$)));
};
