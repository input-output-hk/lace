import React from 'react';
import { AllDone as View } from '../../components';
import { useHistory } from 'react-router-dom';
import { walletRoutePaths } from '@routes';

export const AllDone = (): JSX.Element => {
  const history = useHistory();
  return <View onFinish={() => history.push(walletRoutePaths.assets)} isHardwareWallet />;
};
