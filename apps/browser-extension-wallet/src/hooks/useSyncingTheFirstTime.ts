import { useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { concat, of } from 'rxjs';
import { map, take, filter } from 'rxjs/operators';
import { useObservable } from '@lace/common';

export const useSyncingTheFirstTime = (): boolean => {
  const { inMemoryWallet } = useWalletStore();

  const isSyncingForTheFirstTime$ = useMemo(() => {
    if (!inMemoryWallet) {
      return of(true);
    }
    return concat(
      of(true),
      inMemoryWallet?.syncStatus?.isSettled$.pipe(
        filter((s: boolean) => s),
        map(() => false),
        take(1)
      )
    );
  }, [inMemoryWallet]);

  return useObservable(isSyncingForTheFirstTime$);
};
