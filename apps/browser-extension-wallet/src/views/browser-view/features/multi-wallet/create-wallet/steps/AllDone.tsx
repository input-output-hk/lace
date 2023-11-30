import React from 'react';
import { walletRoutePaths } from '@routes';
import { AllDone as View } from '../../components';
import { useHistory } from 'react-router-dom';

export const AllDone = (): JSX.Element => {
  const history = useHistory();
  return <View onFinish={() => history.push(walletRoutePaths.assets)} />;
};
