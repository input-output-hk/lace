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
      wallet={{ ...walletInfo, name: (handles?.length && handles[0]?.nftMetadata.name) || walletInfo.name }}
      goBack={redirectToOverview}
    />
  );
};
