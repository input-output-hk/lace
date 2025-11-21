/* eslint-disable no-magic-numbers, @typescript-eslint/no-empty-function */
import { useEffect } from 'react';
import { PostHogAction, PostHogProperties, TX_CREATION_TYPE_KEY } from './analyticsTracker';
import { getValueFromLocalStorage, saveValueInLocalStorage } from '@src/utils/local-storage';
import { ILocalStorage, UnconfirmedTransaction, UnconfirmedTransactions } from '@src/types';
import { EMPTY, Observable, Subject, filter, map, merge, take } from 'rxjs';
import { ObservableWallet } from '@cardano-sdk/wallet';
import { logger } from '@lace/common';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

const LOCK_NAME = 'unconfirmed_transactions';

const isNotStaleTx = (tx: UnconfirmedTransaction) => new Date(tx.date) > new Date(Date.now() - ONE_WEEK);

export const getUnconfirmedTransactions = (): UnconfirmedTransactions =>
  getValueFromLocalStorage<ILocalStorage, 'unconfirmedTransactions'>('unconfirmedTransactions', []);

export const saveUnconfirmedTransactions = (unconfirmedTransactions: UnconfirmedTransactions): void =>
  saveValueInLocalStorage<ILocalStorage, 'unconfirmedTransactions'>({
    key: 'unconfirmedTransactions',
    value: unconfirmedTransactions
  });

const addToUnconfirmedTransactions = (unconfirmedTransaction: UnconfirmedTransaction): void => {
  const unconfirmedTransactions = getUnconfirmedTransactions();
  unconfirmedTransactions.push(unconfirmedTransaction);
  saveUnconfirmedTransactions(unconfirmedTransactions);
};

export const txSubmitted$ = new Subject<UnconfirmedTransaction>();

txSubmitted$.subscribe((unconfirmedTransaction) => {
  addToUnconfirmedTransactions(unconfirmedTransaction);
});

const separateTransactions = (
  unconfirmedTransactions: UnconfirmedTransactions,
  onChainTransactionIds: string[]
): { unconfirmedAndFreshTransactions: UnconfirmedTransactions; confirmedTransactions: UnconfirmedTransactions } => {
  const confirmedTransactions: UnconfirmedTransactions = [];
  const unconfirmedAndFreshTransactions: UnconfirmedTransactions = [];

  for (const unconfirmedTransaction of unconfirmedTransactions) {
    const isConfirmed = onChainTransactionIds.includes(unconfirmedTransaction.id);
    const isFresh = isNotStaleTx(unconfirmedTransaction);
    if (isConfirmed) {
      confirmedTransactions.push(unconfirmedTransaction);
    } else if (isFresh) {
      unconfirmedAndFreshTransactions.push(unconfirmedTransaction);
    }
  }

  return { confirmedTransactions, unconfirmedAndFreshTransactions };
};

type ConfirmedTransactionsObservable = Observable<string[]>;

export const createConfirmedTransactionsObservable = (
  inMemoryWallet?: ObservableWallet
): ConfirmedTransactionsObservable => {
  if (!inMemoryWallet?.transactions?.outgoing?.onChain$ || !inMemoryWallet?.transactions?.history$) {
    return EMPTY;
  }

  const outgoing$ = inMemoryWallet.transactions.outgoing.onChain$.pipe(map((tx) => [tx.id.toString()]));

  const history$ = inMemoryWallet.transactions.history$.pipe(
    take(1),
    map((txs) => txs.map((tx) => tx.id.toString()))
  );

  return merge(outgoing$, history$).pipe(filter((txs) => txs.length > 0));
};

interface SendConfirmedTransactionAnalytics {
  onChainTransactionIds: string[];
  getUnconfirmedTransactionsFn: () => UnconfirmedTransactions;
  saveUnconfirmedTransactionsFn: (unconfirmedTransactions: UnconfirmedTransactions) => void;
  sendEventToPostHog?: (action: PostHogAction, properties: PostHogProperties) => Promise<void>;
}

export const sendConfirmedTransactionAnalytics = async ({
  onChainTransactionIds,
  getUnconfirmedTransactionsFn,
  saveUnconfirmedTransactionsFn,
  sendEventToPostHog = () => Promise.resolve()
}: SendConfirmedTransactionAnalytics): Promise<void> => {
  try {
    const unconfirmedTransactions = getUnconfirmedTransactionsFn();

    if (unconfirmedTransactions.length === 0) {
      return;
    }

    const { confirmedTransactions, unconfirmedAndFreshTransactions } = separateTransactions(
      unconfirmedTransactions,
      onChainTransactionIds
    );

    for (const confirmedTransaction of confirmedTransactions) {
      await sendEventToPostHog(PostHogAction.SendTransactionConfirmed, {
        [TX_CREATION_TYPE_KEY]: confirmedTransaction.creationType
      });
    }

    if (unconfirmedTransactions.length === unconfirmedAndFreshTransactions.length) {
      return;
    }

    saveUnconfirmedTransactionsFn(unconfirmedAndFreshTransactions);
  } catch (error) {
    logger.error(error);
  }
};

interface UseOnChainEventAnalytics {
  observable$?: Observable<string[]>;
  requestLock?: (name: string, options: LockOptions, callback: () => Promise<void>) => Promise<void>;
  onChainEvent: (tx: string[]) => Promise<void>;
}

export const useOnChainEventAnalytics = ({
  observable$,
  requestLock = navigator?.locks?.request.bind(navigator.locks) || (() => Promise.resolve()),
  onChainEvent
}: UseOnChainEventAnalytics): void => {
  useEffect(() => {
    const controller = new AbortController();

    const subscription = observable$.subscribe(async (onChainTransactions) => {
      try {
        await requestLock(LOCK_NAME, { signal: controller.signal }, () => onChainEvent(onChainTransactions));
      } catch (error) {
        // do nothing if lock request has been manually aborted
        if (error instanceof Error && error.name === 'AbortError') return;
        throw error;
      }
    });

    return () => {
      controller.abort();
      subscription.unsubscribe();
    };
  }, [observable$, requestLock, onChainEvent]);
};
