import React, { useMemo } from 'react';
import { useRedirection } from '../../../hooks';
import { walletRoutePaths } from '../../../routes';
import { useWalletStore } from '../../../stores';
import { ReceiveInfo } from './ReceiveInfo';
import { useGetHandles } from '@hooks/useGetHandles';

export const ReceiveInfoContainer = (): React.ReactElement => {
  const redirectToOverview = useRedirection(walletRoutePaths.assets);
  const { walletInfo } = useWalletStore();
  const handles = useGetHandles();

  const userAddresses = useMemo(() => {
    const addresses = [...walletInfo.addresses];
    return addresses.sort((a, b) => a.index - b.index);
  }, [walletInfo.addresses]);

  return (
    <ReceiveInfo
      name={walletInfo?.name}
      address={userAddresses[0].address}
      handles={handles}
      goBack={redirectToOverview}
    />
  );
};
