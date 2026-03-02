import { useLocalStorage } from '@hooks/useLocalStorage';
import { getAssetImageUrl } from '@utils/get-asset-image-url';
import { useWalletStore } from '@stores';
import { useGetHandles } from '@hooks/useGetHandles';
import { useCallback, useEffect, useState } from 'react';
import { useWalletManager } from './useWalletManager';

interface UseWalletAvatar {
  activeWalletAvatar: string;
  setAvatar: (image: string) => void;
  getAvatar: (walletId: string) => string;
}

export const useWalletAvatar = (): UseWalletAvatar => {
  const { environmentName } = useWalletStore();
  const [activeWalletId, setActiveWalletId] = useState<string>('');

  const { getActiveWalletId } = useWalletManager();

  useEffect(() => {
    // eslint-disable-next-line promise/catch-or-return
    getActiveWalletId().then((id) => {
      setActiveWalletId(id);
    });
  }, [getActiveWalletId]);

  const [handle] = useGetHandles();
  const [avatars, { updateLocalStorage: setUserAvatar }] = useLocalStorage('userAvatar');

  const handleImage = handle?.profilePic;
  const activeWalletAvatar =
    (environmentName && avatars?.[`${environmentName}${activeWalletId}`]) ||
    (handleImage && getAssetImageUrl(handleImage));

  const setAvatar = useCallback(
    (image: string) => {
      setUserAvatar({ ...avatars, [`${environmentName}${activeWalletId}`]: image });
    },
    [setUserAvatar, avatars, environmentName, activeWalletId]
  );

  const getAvatar = useCallback(
    (walletId: string) => avatars?.[`${environmentName}${walletId}`],
    [avatars, environmentName]
  );

  return { activeWalletAvatar, setAvatar, getAvatar };
};
