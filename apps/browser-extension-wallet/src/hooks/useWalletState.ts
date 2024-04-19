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
  concat
} from 'rxjs';
import { useObservable } from '@lace/common';
import { Wallet } from '@lace/cardano';

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
  Omit<ObservableWallet, 'fatalError$' | 'transactions'> & {
    transactions: {
      history$: ObservableWallet['transactions']['history$'];
      outgoing: Pick<ObservableWallet['transactions']['outgoing'], 'inFlight$'>;
    };
  }
>;

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
    wallet.syncStatus.isAnyRequestPending$,
    wallet.syncStatus.isSettled$,
    wallet.syncStatus.isUpToDate$,
    wallet.tip$,
    wallet.transactions.history$,
    wallet.transactions.outgoing.inFlight$,
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
            inFlight: transactionsHistoryOutgoingInFlight
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
