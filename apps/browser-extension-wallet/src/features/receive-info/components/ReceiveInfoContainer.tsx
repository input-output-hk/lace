import React from 'react';
import { useRedirection } from '../../../hooks';
import { walletRoutePaths } from '../../../routes';
import { useWalletStore } from '../../../stores';
import { ReceiveInfo } from './ReceiveInfo';

export const ReceiveInfoContainer = (): React.ReactElement => {
  const [redirectToOverview] = useRedirection(walletRoutePaths.assets);
  const { walletInfo } = useWalletStore();

  return <ReceiveInfo wallet={walletInfo} goBack={redirectToOverview} />;
};
