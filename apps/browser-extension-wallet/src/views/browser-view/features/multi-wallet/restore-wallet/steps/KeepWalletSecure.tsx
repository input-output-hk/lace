import React from 'react';
import { useHistory } from 'react-router';
import { KeepWalletSecure as View } from '../../components';
import { walletRoutePaths } from '@routes';

const {
  newWallet: { restore }
} = walletRoutePaths;

const noop = (): void => void 0;

export const KeepWalletSecure = (): JSX.Element => {
  const history = useHistory();

  return <View onNext={() => history.push(restore.selectRecoveryPhraseLength)} onVideoClick={noop} />;
};
