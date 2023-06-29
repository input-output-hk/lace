import React from 'react';
import { useRedirection } from '../../../hooks';
import { walletRoutePaths } from '../../../routes';
import { useWalletStore } from '../../../stores';
import { ReceiveInfo } from './ReceiveInfo';
import { useGetHandles } from '@hooks/useGetHandles';

export const ReceiveInfoContainer = (): React.ReactElement => {
  const [redirectToOverview] = useRedirection(walletRoutePaths.assets);
  const { walletInfo } = useWalletStore();
  const handles = useGetHandles();

  return (
    <ReceiveInfo
      name={walletInfo?.name}
      address={walletInfo?.addresses[0].address}
      handles={handles}
      goBack={redirectToOverview}
    />
  );
};
