import { useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { isAdaHandleEnabled } from '@src/features/ada-handle/config';
import { useObservable } from './useObservable';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useGetHandles = () => {
  const { inMemoryWallet } = useWalletStore();
  const handles = useObservable(inMemoryWallet.handles$);

  return useMemo(() => isAdaHandleEnabled === 'true' && handles, [handles]);
};
