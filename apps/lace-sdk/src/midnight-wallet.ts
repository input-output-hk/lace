import { isInMemoryMidnightAccount } from '@lace-contract/midnight-context';
import { Err, Ok } from '@lace-lib/util';
import {
  concat,
  defer,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  of,
  skipWhile,
  switchMap,
  throwError,
  timeout,
  timer,
} from 'rxjs';

import {
  MidnightAccountNotFoundError,
  MidnightWalletNotReadyError,
} from './midnight-errors';
import { resolveTimeoutMs } from './midnight-timeouts';

import type { Activity } from '@lace-contract/activities';
import type {
  MidnightAccountId,
  MidnightWallet,
} from '@lace-contract/midnight-context';
import type {
  createModuleLoader,
  StateObservables,
} from '@lace-contract/module';
import type { networkSelectors } from '@lace-contract/network';
import type {
  AccountId,
  AnyAccount,
  walletsSelectors,
} from '@lace-contract/wallet-repo';
import type { Result } from '@lace-lib/util';
import type { Observable } from 'rxjs';

/** Wallet state and instance engine access supplied by `createLaceWallet`. */
export type WalletWithMidnight = {
  /** Present on SDK instances; enables best-effort pending activity tracking. */
  dispatch?: {
    (
      key: 'activities.upsertActivities',
      payload: { accountId: AccountId; activities: Activity[] },
    ): void;
    (
      key: 'activities.removeActivities',
      payload: { accountId: AccountId; activityIds: string[] },
    ): void;
  };
  stateObservables: Pick<
    StateObservables<typeof networkSelectors & typeof walletsSelectors>,
    'network' | 'wallets'
  > & {
    activities?: {
      selectAllMap$: Observable<Record<AccountId, Activity[]>>;
    };
  };
  /** @internal Not for direct SDK consumer use. */
  _loadModules: ReturnType<typeof createModuleLoader>;
};

/** The account a Midnight operation acts on, and how long it waits for the account's wallets. */
export type MidnightAccountProps = {
  /**
   * Midnight account to act on. Required when more than one in-memory
   * Midnight account is present on the active network.
   */
  accountId?: AccountId;
  /**
   * How long, in milliseconds, to wait for the engine to start the account's wallets; 120 s by default. A
   * value that is not a finite positive number up to 2^31 - 1 (the longest delay a timer honours) is refused
   * with a `RangeError`.
   */
  startTimeout?: number;
};

const DEFAULT_START_TIMEOUT_MS = 120_000;

export const resolveMidnightAccountId = async (
  { stateObservables }: WalletWithMidnight,
  requestedAccountId?: AccountId,
): Promise<MidnightAccountId> => {
  const wallets = await firstValueFrom(stateObservables.wallets.selectAll$);
  const activeNetworkIds = await firstValueFrom(
    stateObservables.network.selectAllActiveNetworkIds$,
  );
  const accounts = wallets
    .flatMap((wallet): AnyAccount[] => wallet.accounts)
    .filter(isInMemoryMidnightAccount)
    .filter(account => activeNetworkIds.includes(account.blockchainNetworkId));

  if (requestedAccountId) {
    const found = accounts.find(
      account => account.accountId === requestedAccountId,
    );
    if (!found)
      throw new MidnightAccountNotFoundError(
        `Midnight account "${requestedAccountId}" not found on the active network`,
      );
    return found.accountId as MidnightAccountId;
  }
  if (accounts.length === 0)
    throw new MidnightAccountNotFoundError(
      'No Midnight accounts found on the active network',
    );
  if (accounts.length > 1)
    throw new MidnightAccountNotFoundError(
      `Multiple Midnight accounts found (${accounts.length}) — specify accountId to disambiguate`,
    );
  return accounts[0].accountId as MidnightAccountId;
};

/**
 * The engine's wallet for the account, emitted once the engine starts it and
 * again whenever the engine replaces it (a sync reset or a restart). Emits
 * `undefined` while the engine has stopped the account's wallet and not yet
 * replaced it. Resolves the account on subscription and errors with
 * `MidnightAccountNotFoundError`, or with `MidnightWalletNotReadyError` when
 * no wallet arrives within `startTimeout`, at first or after a stop, so a
 * subscriber that was already watching fails the same way a new one would.
 */
export const observeMidnightWallet = (
  wallet: WalletWithMidnight,
  { accountId, startTimeout: requestedStartTimeout }: MidnightAccountProps,
): Observable<MidnightWallet | undefined> =>
  defer(async () => {
    const startTimeout = resolveTimeoutMs(
      'startTimeout',
      requestedStartTimeout,
      DEFAULT_START_TIMEOUT_MS,
    );
    const resolvedAccountId = await resolveMidnightAccountId(wallet, accountId);
    const [registry$] = await wallet._loadModules('addons.loadMidnightEngine');
    if (!registry$)
      throw new MidnightWalletNotReadyError(resolvedAccountId, startTimeout);
    return { resolvedAccountId, registry$, startTimeout };
  }).pipe(
    switchMap(({ resolvedAccountId, registry$, startTimeout }) => {
      const notReady = () =>
        throwError(
          () =>
            new MidnightWalletNotReadyError(resolvedAccountId, startTimeout),
        );
      return registry$.pipe(
        map(wallets => wallets[resolvedAccountId]),
        distinctUntilChanged(),
        skipWhile(candidate => !candidate),
        timeout({ first: startTimeout, with: notReady }),
        switchMap(candidate =>
          candidate
            ? of(candidate)
            : concat(
                of(undefined),
                timer(startTimeout).pipe(switchMap(notReady)),
              ),
        ),
      );
    }),
  );

/** The engine's wallet for the account, once the engine has started it. */
export const midnightWalletFor = async (
  wallet: WalletWithMidnight,
  props: MidnightAccountProps,
): Promise<MidnightWallet> =>
  firstValueFrom(
    observeMidnightWallet(wallet, props).pipe(
      filter((candidate): candidate is MidnightWallet => !!candidate),
    ),
  );

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

/** Runs one engine operation for the account and settles it as a `Result`. */
export const withMidnightWallet = async <T>(
  wallet: WalletWithMidnight,
  props: MidnightAccountProps,
  operation: (midnightWallet: MidnightWallet) => Observable<T>,
): Promise<Result<T, Error>> => {
  try {
    const midnightWallet = await midnightWalletFor(wallet, props);
    return Ok(await firstValueFrom(operation(midnightWallet)));
  } catch (error) {
    return Err(toError(error));
  }
};
