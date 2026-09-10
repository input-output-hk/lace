import {
  CardanoNetworkId,
  CardanoPaymentAddress,
  deriveAccountExtendedPublicKey,
} from '@lace-contract/cardano-context';
import { defer, firstValueFrom, from, map, of, toArray } from 'rxjs';

import { uniqueRewardAccounts } from '../helpers';
import { isMigratableRow } from '../slice';

import {
  accountUtxos,
  rewardAccountInfo,
  toGroupedAddress,
} from './scan-active-accounts';

import type { SideEffect } from '../..';
import type { AccountMapping } from '../slice';
import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { AnyWallet, InMemoryWallet } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

type SideEffectDeps = Parameters<SideEffect>[2];
type ProviderDeps = Pick<SideEffectDeps, 'cardanoProvider'>;

/**
 * Runaway guard, NOT a policy on how many accounts a wallet may have. The walk
 * ends when it has found the accounts it needs; a used index is evidence to
 * keep going, never a reason to stop — accounts are contiguous from 0, so a
 * wallet used elsewhere legitimately presents a long run of used indexes, and
 * that run is exactly what this probe exists to walk past.
 *
 * The ceiling only stops an unbounded loop if the provider reports every index
 * as used. It is high enough that no real wallet reaches it, and hitting it
 * fails before anything is signed.
 */
export const MAX_DESTINATION_PROBE_CEILING = 256;

/**
 * Whether an account index has ever been used on chain.
 *
 * Deliberately WIDER than the source scan's `isAccountActive`, which asks
 * whether an account holds anything now. A migration target must never have
 * been used at all: an account that was funded, emptied and deregistered holds
 * nothing, yet its addresses are already linked to whatever they transacted
 * with — landing migrated funds there reconnects exactly the history preserve
 * mode exists to keep apart. So transaction history counts, not just balance.
 *
 * Errs toward "used": any signal on any of the account's addresses or reward
 * accounts disqualifies the index. A false positive costs one skipped index; a
 * false negative silently links two identities.
 */
export const isAccountIndexUsed = async (
  {
    accountIndex,
    extendedAccountPublicKey,
    chainId,
  }: {
    accountIndex: number;
    extendedAccountPublicKey: Bip32PublicKeyHex;
    chainId: Cardano.ChainId;
  },
  { cardanoProvider }: ProviderDeps,
): Promise<boolean> => {
  const discovered = await firstValueFrom(
    cardanoProvider
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
      ),
  );
  if (discovered.length === 0) return false;

  const addresses = discovered.map(toGroupedAddress);
  const rewardAccounts = uniqueRewardAccounts(addresses);

  for (const rewardAccount of rewardAccounts) {
    // A stake key can be registered by a transaction paid for entirely by
    // another account, so registration is not always visible in this account's
    // address history — it has to be asked for separately.
    const info = await rewardAccountInfo(
      cardanoProvider,
      chainId,
      rewardAccount,
    );
    if (info.isRegistered || BigInt(`${info.withdrawableAmount}`) > 0n) {
      return true;
    }
    if (
      (await accountUtxos(cardanoProvider, chainId, rewardAccount)).length > 0
    )
      return true;
  }

  for (const { address } of addresses) {
    const history = await firstValueFrom(
      cardanoProvider
        .getAddressTransactionHistory(
          { address: CardanoPaymentAddress(address), numberOfItems: 1 },
          { chainId },
        )
        .pipe(
          map(result => {
            if (result.isErr()) throw result.unwrapErr();
            return result.unwrap();
          }),
        ),
    );
    if (history.length > 0) return true;
  }

  return false;
};

/**
 * Walks up from `startIndex` and returns `count` account indexes that are
 * unused on chain, skipping indexes the wallet already holds (a loaded account
 * is used by definition) and any the probe finds history for.
 *
 * `xpubForIndex` is the same source the derivation then uses, so an index is
 * probed with exactly the key it would be created from.
 */
export const resolveUnusedDestinationIndexes = async (
  {
    startIndex,
    count,
    chainId,
    xpubForIndex,
    xpubByIndex,
  }: {
    startIndex: number;
    count: number;
    chainId: Cardano.ChainId;
    xpubForIndex: (
      accountIndex: number,
    ) => Promise<Bip32PublicKeyHex | undefined>;
    /**
     * Keys already held for accounts the wallet has loaded. Consulted first so
     * a loaded account is probed without deriving anything — on a hardware
     * destination that is the difference between reusing an account and
     * spending an on-device approval to rediscover a key we already have.
     */
    xpubByIndex?: ReadonlyMap<number, Bip32PublicKeyHex>;
  },
  dependencies: ProviderDeps,
): Promise<number[]> => {
  const resolved: number[] = [];
  const limit = startIndex + MAX_DESTINATION_PROBE_CEILING;
  for (
    let accountIndex = startIndex;
    accountIndex < limit && resolved.length < count;
    accountIndex += 1
  ) {
    // A loaded account is NOT disqualified for being loaded: an account Lace
    // already holds that has never touched the chain is a better target than a
    // new one — same privacy, no account to create, no approval to spend.
    const extendedAccountPublicKey =
      xpubByIndex?.get(accountIndex) ?? (await xpubForIndex(accountIndex));
    // No key for the index means nothing can have used it, and the derivation
    // that follows would fail loudly on the same call.
    if (extendedAccountPublicKey === undefined) {
      resolved.push(accountIndex);
      continue;
    }
    const isUsed = await isAccountIndexUsed(
      { accountIndex, extendedAccountPublicKey, chainId },
      dependencies,
    );
    if (!isUsed) resolved.push(accountIndex);
  }
  if (resolved.length < count) {
    throw new Error(
      `Could not find ${count} unused destination accounts within ${MAX_DESTINATION_PROBE_CEILING} indexes of ${startIndex}`,
    );
  }
  return resolved;
};

/**
 * The mapping with its destination indexes probed for on-chain use, for a
 * destination that derives from its own root.
 *
 * Runs at DISCOVERY, before the review, deliberately: the probe is several
 * provider round-trips, and doing it later — between the source device
 * connecting and the signing request — held the WebUSB handle open long enough
 * to lose it ("Pre-authorized USB device not found"). Discovery is already
 * provider-bound and has nothing connected, so the cost is invisible there and
 * the review states indexes that have already been checked.
 *
 * A destination that can only export keys on-device is left alone: probing it
 * needs the device, which is not connected yet at discovery.
 */
export const freshDestinationMapping$ = (
  {
    mapping,
    wallet,
    blockchainNetworkId,
    fixedDestinationAccountIndex,
  }: {
    mapping: AccountMapping;
    wallet: AnyWallet | undefined;
    blockchainNetworkId: unknown;
    /**
     * Set when the plan deliberately lands everything in the account the user
     * picked, because the destination cannot create accounts. Passed explicitly
     * rather than inferred: "one planned index, and it happens to be loaded" is
     * indistinguishable from a deliberate choice, and inferring it skipped the
     * probe for an ordinary one-account migration into an existing wallet —
     * sweeping into an account that may already have history.
     */
    fixedDestinationAccountIndex?: number;
  },
  dependencies: Pick<SideEffectDeps, 'accessAuthSecret'> & ProviderDeps,
): Observable<AccountMapping> => {
  const encryptedRootPrivateKey = (wallet as InMemoryWallet | undefined)
    ?.blockchainSpecific?.Cardano?.encryptedRootPrivateKey;
  const chainId = CardanoNetworkId.getChainId(
    blockchainNetworkId as Parameters<typeof CardanoNetworkId.getChainId>[0],
  );
  if (!encryptedRootPrivateKey || !chainId || mapping.length === 0) {
    return of(mapping);
  }
  const cardanoAccounts = (wallet?.accounts ?? []).filter(
    account =>
      account.blockchainName === 'Cardano' &&
      account.blockchainNetworkId === blockchainNetworkId,
  );
  const loadedIndexes = cardanoAccounts.map(
    account =>
      (account.blockchainSpecific as { accountIndex?: number })?.accountIndex ??
      0,
  );
  // Keys the wallet already holds, so a loaded account is probed for free.
  const xpubByIndex = new Map(
    cardanoAccounts.flatMap(account => {
      const specific = account.blockchainSpecific as {
        accountIndex?: number;
        extendedAccountPublicKey?: Bip32PublicKeyHex;
      };
      return specific?.extendedAccountPublicKey
        ? [
            [
              specific.accountIndex ?? 0,
              specific.extendedAccountPublicKey,
            ] as const,
          ]
        : [];
    }),
  );
  // Funded rows only, and their positions so the resolved indexes go back onto
  // the same rows.
  //
  // A rewards-only row is NOT migrated (it has no input to pay its own fee, and
  // carrying its withdrawal elsewhere would link the accounts), so no account
  // is ever created for it. Letting it consume a resolved index left a HOLE in
  // the destination's account sequence — the row took index 1, the funded rows
  // above it got 2 and 3, and standard BIP44 recovery of the destination seed
  // stops at the first unused index, making the swept accounts invisible to
  // every other wallet. The device path already counts funded rows only.
  const fundedPositions = mapping.flatMap((row, position) =>
    isMigratableRow(row) ? [position] : [],
  );
  if (fundedPositions.length === 0) return of(mapping);
  const planned = fundedPositions.map(
    position => mapping[position].destinationAccountIndex,
  );
  // A plan that deliberately lands everything in the account the user picked is
  // not searching for a target, so there is nothing to resolve — probing it
  // would only find it used and move the funds somewhere they did not ask for.
  if (fixedDestinationAccountIndex !== undefined) return of(mapping);

  return from(
    resolveUnusedDestinationIndexes(
      {
        // From the wallet's FIRST account, not past its last: an account
        // already loaded that has never touched the chain is exactly what we
        // want, and creating a new one instead is pure waste.
        startIndex: Math.min(...loadedIndexes, ...planned),
        count: new Set(planned).size,
        chainId,
        xpubByIndex,
        xpubForIndex: async accountIndex =>
          firstValueFrom(
            dependencies.accessAuthSecret(authSecret =>
              defer(async () =>
                deriveAccountExtendedPublicKey({
                  encryptedRootPrivateKey,
                  accountIndex,
                  authSecret,
                }),
              ),
            ),
          ),
      },
      dependencies,
    ),
  ).pipe(
    map(resolved => {
      const resolvedByPosition = new Map(
        fundedPositions.map((position, order) => [position, resolved[order]]),
      );
      return mapping.map((row, position) => ({
        ...row,
        destinationAccountIndex:
          resolvedByPosition.get(position) ?? row.destinationAccountIndex,
      }));
    }),
  );
};
