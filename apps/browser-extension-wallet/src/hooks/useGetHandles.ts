import { useWalletStore } from '@src/stores';
import { isAdaHandleEnabled } from '@src/features/ada-handle/config';
import { useObservable } from './useObservable';
import { HandleInfo } from '@cardano-sdk/wallet';

export const useGetHandles = (): HandleInfo[] | undefined => {
  const { inMemoryWallet } = useWalletStore();
  const handles = useObservable(inMemoryWallet.handles$);

  return isAdaHandleEnabled === 'true' ? handles : undefined;
};
