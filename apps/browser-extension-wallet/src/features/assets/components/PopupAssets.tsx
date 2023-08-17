import { useFeatureFlagsContext } from '@providers/FeatureFlags/context';
import React from 'react';
import { AssetsView } from '.';

export const PopupAssets = (): React.ReactElement => {
  const { isFeatureEnabled } = useFeatureFlagsContext();
  return isFeatureEnabled('assets') ? <AssetsView /> : <div>hiden assets</div>;
};
