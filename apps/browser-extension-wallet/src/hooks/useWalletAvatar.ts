import { useLocalStorage } from '@hooks/useLocalStorage';
import { getAssetImageUrl } from '@utils/get-asset-image-url';
import { useWalletStore } from '@stores';
import { useGetHandles } from '@hooks/useGetHandles';
import { useCallback } from 'react';
import { walletRepository } from '@lib/wallet-api-ui';

interface UseWalletAvatar {
  activeWalletAvatar: string;
  setAvatar: (image: string) => void;
  getAvatar: (walletId: string) => string;
}

export const useWalletAvatar = (): UseWalletAvatar => {
  const { cardanoWallet, environmentName } = useWalletStore();
  const [handle] = useGetHandles();
  const [avatars, { updateLocalStorage: setUserAvatar }] = useLocalStorage('userAvatar');

  const activeWalletId = cardanoWallet?.source.wallet.walletId;
  const { accountIndex, metadata } = cardanoWallet?.source.account ?? {};
  const handleImage = handle?.profilePic;
  const activeWalletAvatar =
    (environmentName && avatars?.[`${environmentName}${activeWalletId}`]) ||
    (handleImage && getAssetImageUrl(handleImage));

  const setAvatar = useCallback(
    (image: string) => {
      setUserAvatar({ ...avatars, [`${environmentName}${activeWalletId}`]: image });
      if (metadata?.namiMode) {
        walletRepository.updateAccountMetadata({
          accountIndex,
          walletId: activeWalletId,
          metadata: { ...metadata, namiMode: { ...metadata.namiMode, avatar: image } }
        });
      }
    },
    [setUserAvatar, avatars, environmentName, activeWalletId, metadata, accountIndex]
  );

  const getAvatar = useCallback(
    (walletId: string) => avatars?.[`${environmentName}${walletId}`],
    [avatars, environmentName]
  );

  return { activeWalletAvatar, setAvatar, getAvatar };
};
