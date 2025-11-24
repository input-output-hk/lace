import { useWalletStore } from '@src/stores';
import { isAdaHandleEnabled } from '@src/features/ada-handle/config';
import { useObservable } from '@lace/common';
import { HandleInfo } from '@cardano-sdk/wallet';

export const useGetHandles = (): HandleInfo[] => {
  const { inMemoryWallet } = useWalletStore();
  const handles = (useObservable(inMemoryWallet?.handles$) || []).sort(
    ({ nftMetadata: { name: a } }, { nftMetadata: { name: b } }) => a.length - b.length
  );

  return isAdaHandleEnabled ? handles : [];
};
