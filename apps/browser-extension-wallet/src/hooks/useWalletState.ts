/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/ban-types */
import { ObservableWallet } from '@cardano-sdk/wallet';
import { useWalletStore } from '@src/stores';
import {
  Observable,
  combineLatest,
  debounceTime,
  map,
  of,
  Subject,
  switchMap,
  distinctUntilChanged,
  concat,
  delay
} from 'rxjs';
import { useObservable } from '@lace/common';
import { Wallet } from '@lace/cardano';

const DEBOUNCE_TIME = 2000;

type RemoveObservableNameSuffix<T> = T extends `${infer S}$` ? S : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FlattenObservableProperties<T> = T extends Map<any, any> | String | Number | Array<any> | Date | null | BigInt
  ? T
  : T extends object
  ? {
      [k in keyof T as T[k] extends Function ? never : RemoveObservableNameSuffix<k>]: T[k] extends Observable<infer O>
        ? FlattenObservableProperties<O>
        : FlattenObservableProperties<T[k]>;
    }
  : T;
export type ObservableWalletState = FlattenObservableProperties<
  Omit<ObservableWallet, 'transactions'> & {
    transactions: {
      history$: ObservableWallet['transactions']['history$'];
      outgoing: Pick<ObservableWallet['transactions']['outgoing'], 'inFlight$' | 'signed$'>;
    };
  }
>;

/**
 * Creates a debounced Observable based on the given predicate and debounce delay.
 *
 * This function applies a conditional delay to values emitted by an Observable.
 * If the predicate returns true for a value, it is emitted immediately. If the predicate
 * returns false, the emission is delayed by the specified debounce delay. This is useful
 * for filtering rapid or transient changes in the observable stream that are considered
 * insignificant, while allowing immediate handling of significant changes.
 *
 * @param skipDebounce A function that accepts a boolean value and returns a boolean.
 *                     If it returns true, the value is emitted immediately. If false,
 *                     the value is delayed by `debounceDelay`.
 * @param debounceDelay The time, in milliseconds, to delay the emission of the value
 *                      if the predicate returns false.
 * @returns A function that takes an Observable of boolean values and returns a new
 *          Observable that applies the conditional debouncing logic.
 *
 * @example
 * // Observable that emits online status (true for online, false for offline)
 * const isOnline$ = fromEvent(window, 'online').pipe(
 *   map(event => navigator.onLine)
 * );
 *
 * const debouncedIsOnline$ = debounceIf(
 *   isSettled => isSettled, // Apply debouncing only when the value is 'false'
 *   1000                    // Debounce 'false' values by 1000 milliseconds
 * )(isOnline$);
 *
 * debouncedIsOnline$.subscribe(isOnline => {
 *   console.log(`Online status is: ${isOnline}`);
 * });
 */
const debounceIf = (skipDebounce: (val: boolean) => boolean, debounceDelay: number) => (obs$: Observable<boolean>) =>
  obs$.pipe(
    switchMap((isSettled) => (skipDebounce(isSettled) ? of(isSettled) : of(isSettled).pipe(delay(debounceDelay)))),
    distinctUntilChanged()
  );

const combineObservable = ({ wallet }: Wallet.CardanoWallet): Observable<ObservableWalletState> =>
  combineLatest([
    wallet.addresses$,
    wallet.assetInfo$,
    wallet.balance.rewardAccounts.deposit$,
    wallet.balance.rewardAccounts.rewards$,
    wallet.balance.utxo.available$,
    wallet.balance.utxo.total$,
    wallet.balance.utxo.unspendable$,
    wallet.currentEpoch$,
    wallet.delegation.distribution$,
    wallet.delegation.portfolio$,
    wallet.delegation.rewardAccounts$,
    wallet.delegation.rewardsHistory$,
    wallet.eraSummaries$,
    wallet.genesisParameters$,
    wallet.governance.isRegisteredAsDRep$,
    wallet.handles$,
    wallet.protocolParameters$,
    wallet.publicStakeKeys$,
    wallet.syncStatus.isAnyRequestPending$.pipe(
      debounceIf((isAnyRequestPending) => !isAnyRequestPending, DEBOUNCE_TIME)
    ),
    wallet.syncStatus.isSettled$.pipe(debounceIf((isSettled) => isSettled, DEBOUNCE_TIME)),
    wallet.syncStatus.isUpToDate$.pipe(debounceIf((isUpToDate) => isUpToDate, DEBOUNCE_TIME)),
    wallet.tip$,
    wallet.transactions.history$,
    wallet.transactions.outgoing.inFlight$,
    wallet.transactions.outgoing.signed$,
    wallet.utxo.available$,
    wallet.utxo.total$,
    wallet.utxo.unspendable$
  ]).pipe(
    debounceTime(1),
    map(
      ([
        addresses,
        assetInfo,
        balanceRewardAccountsDeposit,
        balanceRewardAccountsRewards,
        balanceUtxoAvailable,
        balanceUtxoTotal,
        balanceUtxoUnspendable,
        currentEpoch,
        delegationDistribution,
        delegationPortfolio,
        delegationRewardAccounts,
        delegationRewardsHistory,
        eraSummaries,
        genesisParameters,
        isRegisteredAsDRep,
        handles,
        protocolParameters,
        publicStakeKeys,
        syncStatusIsAnyRequestPending,
        syncStatusIsSettled,
        syncStatusIsUpToDate,
        tip,
        transactionsHistory,
        transactionsHistoryOutgoingInFlight,
        transactionsHistoryOutgoingSigned,
        utxoAvailable,
        utxoTotal,
        utxoUnspendable
      ]): ObservableWalletState => ({
        addresses,
        assetInfo,
        balance: {
          rewardAccounts: {
            deposit: balanceRewardAccountsDeposit,
            rewards: balanceRewardAccountsRewards
          },
          utxo: {
            available: balanceUtxoAvailable,
            total: balanceUtxoTotal,
            unspendable: balanceUtxoUnspendable
          }
        },
        currentEpoch,
        delegation: {
          distribution: delegationDistribution,
          portfolio: delegationPortfolio,
          rewardAccounts: delegationRewardAccounts,
          rewardsHistory: delegationRewardsHistory
        },
        eraSummaries,
        genesisParameters,
        governance: {
          isRegisteredAsDRep
        },
        handles,
        protocolParameters,
        publicStakeKeys,
        syncStatus: {
          isAnyRequestPending: syncStatusIsAnyRequestPending,
          isSettled: syncStatusIsSettled,
          isUpToDate: syncStatusIsUpToDate
        },
        tip,
        transactions: {
          history: transactionsHistory,
          outgoing: {
            inFlight: transactionsHistoryOutgoingInFlight,
            signed: transactionsHistoryOutgoingSigned
          }
        },
        utxo: {
          available: utxoAvailable,
          total: utxoTotal,
          unspendable: utxoUnspendable
        }
      })
    )
  );

const walletStateParams$ = new Subject<{
  cardanoWallet: Wallet.CardanoWallet | undefined;
  currentChain: Wallet.Cardano.ChainId | undefined;
}>();
const walletState$ = walletStateParams$.pipe(
  distinctUntilChanged(
    (a, b) =>
      a.cardanoWallet?.source.wallet.walletId === b.cardanoWallet?.source.wallet.walletId &&
      a.cardanoWallet?.source.account?.accountIndex === b.cardanoWallet?.source.account?.accountIndex &&
      a.currentChain?.networkMagic === b?.currentChain.networkMagic
  ),
  switchMap(({ cardanoWallet, currentChain }) => {
    if (!cardanoWallet || !currentChain) return of(null);
    return concat(of(null), combineObservable(cardanoWallet));
  })
);

export const useWalletState = (): ObservableWalletState | undefined => {
  const { cardanoWallet, currentChain } = useWalletStore();
  walletStateParams$.next({ cardanoWallet, currentChain });
  return useObservable(walletState$);
};
