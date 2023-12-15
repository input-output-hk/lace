import React from 'react';
import { useHistory } from 'react-router';
import { KeepWalletSecure as View } from '../../components';
import { walletRoutePaths } from '@routes';
import { useCreateWallet } from '../context';

const {
  newWallet: { create }
} = walletRoutePaths;

const noop = (): void => void 0;

export const KeepWalletSecure = (): JSX.Element => {
  const history = useHistory();
  const { withConfirmationDialog } = useCreateWallet();

  return (
    <View
      onBack={withConfirmationDialog(() => history.goBack())}
      onNext={() => history.push(create.recoveryPhrase)}
      onVideoClick={noop}
    />
  );
};
