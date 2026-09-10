import {
  CardanoAccountId,
  CardanoNetworkId,
  deriveAccountExtendedPublicKey,
  isCardanoAddress,
} from '@lace-contract/cardano-context';
import { combineLatest, defer, filter, firstValueFrom, map, take } from 'rxjs';

import { resolveUnusedDestinationIndexes } from './destination-freshness';
import { makeDeviceAccountSource } from './device-account-source';

import type { SideEffect } from '../..';
import type { PendingHwDestination } from '../slice';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type {
  AccountId,
  AnyWallet,
  InMemoryWallet,
} from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

type SideEffectDeps = Parameters<SideEffect>[2];
type StateObservables = Parameters<SideEffect>[1];

/** The name a planned destination account is created with — exported so the
 * review can promise the exact name the account picker will later show. */
export const destinationAccountName = (accountIndex: number) =>
  `Cardano #${accountIndex}`;

/** One resolved landing account: where a mapping row's funds actually go. */
export type PreparedDestinationAccount = {
  destinationAccountIndex: number;
  accountId: AccountId;
  address: string;
};

/**
 * The wallet's Cardano accounts on ONE network, keyed by account index.
 *
 * Network-scoped deliberately: the same account index exists on every network
 * a wallet was created for, so matching on index alone would treat a preprod
 * account as proof that the mainnet account exists — skipping derivation and
 * then resolving that preprod account's address as the sweep target. Funds
 * would be sent to an address on the wrong network.
 */
const cardanoAccountsByIndex = (
  wallet: AnyWallet,
  blockchainNetworkId: unknown,
) =>
  new Map(
    wallet.accounts
      .filter(
        account =>
          account.blockchainName === 'Cardano' &&
          account.blockchainNetworkId === blockchainNetworkId,
      )
      .map(account => [
        (account.blockchainSpecific as { accountIndex?: number })
          ?.accountIndex ?? 0,
        account,
      ]),
  );

/**
 * Derives the planned destination accounts that do not exist yet, from the
 * destination's encrypted root (inside the auth window the sweep already
 * opens). Returns the full account entities to persist — the caller dispatches
 * the wallet update, so derivation and persistence cannot interleave.
 * Idempotent: existing indices are never re-derived.
 *
 * In-memory destinations only: a hardware destination cannot derive accounts
 * silently, which is why the mode choice is not offered for one.
 */
/**
 * Derives the missing destination accounts ON THE DEVICE, for a hardware
 * destination: each export is one on-device approval, and the connector hands
 * back complete account entities, so nothing is derived locally. Ledger and
 * Trezor only — an air-gapped family has no per-index export, which is why
 * preserve is not offered for one.
 */
export const deriveMissingDestinationAccountsOnDevice = async (
  {
    wallet,
    destinationAccountIndexes,
    blockchainNetworkId,
    device,
    preResolvedIndexes,
  }: {
    wallet: AnyWallet;
    destinationAccountIndexes: number[];
    blockchainNetworkId: unknown;
    device: PendingHwDestination;
    /**
     * What the pre-review probe already settled on. Supplied for a hardware
     * destination, where the probe ran once the device connected: re-probing
     * here would repeat a device round-trip per account (and a confirmation
     * each, on a device in expert mode) for an answer already established, and
     * could disagree with the indexes the review named.
     */
    preResolvedIndexes?: number[];
  },
  dependencies: Pick<
    SideEffectDeps,
    '__getState' | 'cardanoProvider' | 'loadModules'
  >,
) => {
  const existingByIndex = cardanoAccountsByIndex(wallet, blockchainNetworkId);

  // No early return for "every planned account is already loaded". This is the
  // only place a hardware destination is ever checked for on-chain freshness:
  // `freshDestinationMapping$` needs an encrypted root to derive candidate keys,
  // so it leaves a device destination alone at discovery. Returning the planned
  // indexes unchanged here therefore skipped the check entirely and could land
  // preserved funds in accounts that already have history — linking them to the
  // destination's existing activity, which is the one thing preserve mode is
  // for. Probing a loaded account costs no approval: its key comes from
  // `xpubByIndex` below.
  const source = await makeDeviceAccountSource(
    {
      wallet,
      hwSource: device,
      targetNetworkId: blockchainNetworkId as never,
    },
    dependencies,
  );
  if (!source) {
    throw new Error(
      'Destination device cannot export account keys for this family',
    );
  }
  const chainId = CardanoNetworkId.getChainId(
    blockchainNetworkId as Parameters<typeof CardanoNetworkId.getChainId>[0],
  );
  if (!chainId) {
    throw new Error(
      'Destination network id is not parsable as a Cardano chain',
    );
  }
  // Probes each candidate before creating it, starting at the wallet's FIRST
  // account: neither "loaded in Lace" nor "past the highest loaded index" says
  // anything about on-chain use. A loaded account that has never transacted is
  // the target we want — no account to create, no approval to spend — and a
  // device used in another app has accounts this wallet never loaded.
  const xpubByIndex = new Map(
    [...existingByIndex.entries()].flatMap(([accountIndex, account]) => {
      const xpub = (
        account.blockchainSpecific as {
          extendedAccountPublicKey?: Bip32PublicKeyHex;
        }
      )?.extendedAccountPublicKey;
      return xpub ? [[accountIndex, xpub] as const] : [];
    }),
  );
  const resolvedIndexes =
    preResolvedIndexes && preResolvedIndexes.length > 0
      ? preResolvedIndexes
      : await resolveUnusedDestinationIndexes(
          {
            startIndex: Math.min(
              ...existingByIndex.keys(),
              ...destinationAccountIndexes,
            ),
            count: destinationAccountIndexes.length,
            chainId,
            xpubForIndex: source.xpubForIndex,
            xpubByIndex,
          },
          dependencies,
        );
  const derived = [];
  for (const accountIndex of resolvedIndexes) {
    // Already loaded: nothing to create, and no approval spent on it.
    if (existingByIndex.has(accountIndex)) continue;
    // Drives the export (one approval), then reads the entities it cached.
    await source.xpubForIndex(accountIndex);
    derived.push(...source.accountsForIndex(accountIndex));
  }
  return { accounts: derived, resolvedIndexes };
};

export const deriveMissingDestinationAccounts = async (
  {
    wallet,
    destinationAccountIndexes,
    blockchainNetworkId,
  }: {
    wallet: AnyWallet;
    destinationAccountIndexes: number[];
    /** The network the migration runs on; accounts on others are irrelevant. */
    blockchainNetworkId: unknown;
  },
  dependencies: Pick<SideEffectDeps, 'accessAuthSecret' | 'cardanoProvider'>,
) => {
  const { accessAuthSecret } = dependencies;
  const existingByIndex = cardanoAccountsByIndex(wallet, blockchainNetworkId);
  const missing = destinationAccountIndexes.filter(
    index => !existingByIndex.has(index),
  );
  if (missing.length === 0) {
    return { accounts: [], resolvedIndexes: destinationAccountIndexes };
  }

  const encryptedRootPrivateKey = (wallet as InMemoryWallet).blockchainSpecific
    ?.Cardano?.encryptedRootPrivateKey;
  // Template from THIS network: its networkId and chainId are copied onto the
  // derived accounts, so one from another network would mint accounts (and
  // addresses) that cannot receive the sweep.
  const template = wallet.accounts.find(
    account =>
      account.blockchainName === 'Cardano' &&
      account.blockchainNetworkId === blockchainNetworkId,
  );
  if (!encryptedRootPrivateKey || !template) {
    throw new Error(
      'Destination cannot derive new accounts: no encrypted root on the wallet',
    );
  }
  const networkId = template.blockchainNetworkId;
  const chainId = CardanoNetworkId.getChainId(networkId);
  if (!chainId) {
    throw new Error('Destination template account has no parsable network id');
  }

  const xpubForIndex = async (accountIndex: number) =>
    firstValueFrom(
      accessAuthSecret(authSecret =>
        defer(async () =>
          deriveAccountExtendedPublicKey({
            encryptedRootPrivateKey,
            accountIndex,
            authSecret,
          }),
        ),
      ),
    );
  // NOT probed here: discovery already resolved these indexes against the chain
  // (see freshDestinationMapping$), and re-running provider calls at this point
  // sits between the source device connecting and the signing request — long
  // enough to lose the WebUSB handle.
  //
  // Two distinct lists, and conflating them is a funds-routing bug either way.
  //
  // `missing` is what gets DERIVED — deriving an account the wallet already
  // holds would re-add it.
  //
  // `resolvedIndexes` is what the caller RESOLVES to addresses and the sweep
  // pairs against the funded source rows, so it must be the complete planned
  // set: short by the already-loaded accounts, it moved one source's funds into
  // another source's destination and left the last with none. A loaded account
  // is a landing account like any other; it just needs no deriving.
  const resolvedIndexes = destinationAccountIndexes;

  const derived = [];
  for (const accountIndex of missing) {
    const extendedAccountPublicKey = await xpubForIndex(accountIndex);
    derived.push({
      // The active network only: the wizard is network-scoped (ADR-11), and
      // sweep + delegation touch nothing else. Entries for other networks
      // appear when the user adds the account there.
      accountId: CardanoAccountId(
        wallet.walletId,
        accountIndex,
        chainId.networkMagic,
      ),
      accountType: 'InMemory' as const,
      blockchainName: 'Cardano' as const,
      blockchainNetworkId: networkId,
      blockchainSpecific: {
        accountIndex,
        chainId,
        extendedAccountPublicKey,
        networkId,
      },
      metadata: { name: destinationAccountName(accountIndex) },
      networkType: template.networkType,
      walletId: wallet.walletId,
    });
  }
  return { accounts: derived, resolvedIndexes };
};

/**
 * Resolves each planned destination index to its account id and receive
 * address, waiting for the platform's address tracking to derive addresses for
 * accounts that were only just persisted. Emits once, with every index
 * resolved — the sweep cannot build a per-account transaction before its
 * target can receive.
 */
export const awaitDestinationTargets$ = (
  {
    wallet,
    destinationAccountIndexes,
    blockchainNetworkId,
  }: {
    wallet: AnyWallet;
    destinationAccountIndexes: number[];
    blockchainNetworkId: unknown;
  },
  { addresses: { selectByAccountId$ } }: StateObservables,
): Observable<PreparedDestinationAccount[]> =>
  defer(() => {
    const accountsByIndex = cardanoAccountsByIndex(wallet, blockchainNetworkId);
    return combineLatest(
      destinationAccountIndexes.map(index => {
        const account = accountsByIndex.get(index);
        if (!account) {
          throw new Error(
            `Planned destination account ${index} is missing from the wallet`,
          );
        }
        return selectByAccountId$.pipe(
          map(selectByAccountId =>
            selectByAccountId(account.accountId).filter(isCardanoAddress),
          ),
          filter(accountAddresses => accountAddresses.length > 0),
          take(1),
          map(
            (accountAddresses): PreparedDestinationAccount => ({
              destinationAccountIndex: index,
              accountId: account.accountId,
              address: accountAddresses[0].address,
            }),
          ),
        );
      }),
    ).pipe(take(1));
  });
