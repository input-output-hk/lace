import React from 'react';
import { useRedirection } from '../../../hooks';
import { walletRoutePaths } from '../../../routes';
import { useWalletStore } from '../../../stores';
import { ReceiveInfo } from './ReceiveInfo';
import { useFindNftByPolicyId } from '@hooks/useGetNftPolicyId';
import { ADA_HANDLE_POLICY_ID, isAdaHandleEnabled } from '@src/features/ada-handle/config';

export const ReceiveInfoContainer = (): React.ReactElement => {
  const [redirectToOverview] = useRedirection(walletRoutePaths.assets);
  const { walletInfo } = useWalletStore();
  const handle = useFindNftByPolicyId(ADA_HANDLE_POLICY_ID);

  return (
    <ReceiveInfo
      wallet={{ ...walletInfo, name: (isAdaHandleEnabled === 'true' && handle?.name) || walletInfo.name }}
      goBack={redirectToOverview}
    />
  );
};
