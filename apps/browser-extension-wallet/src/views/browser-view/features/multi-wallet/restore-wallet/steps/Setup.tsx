import { WalletSetupNamePasswordStep } from '@lace/core';
import React from 'react';
import { useHistory } from 'react-router';
import { useRestoreWallet } from '../context';
import { walletRoutePaths } from '@routes/wallet-paths';

export const Setup = (): JSX.Element => {
  const history = useHistory();
  const { setName, setPassword } = useRestoreWallet();

  return (
    <WalletSetupNamePasswordStep
      onBack={() => history.push(walletRoutePaths.newWallet.root)}
      onNext={({ password, walletName }) => {
        setName(walletName);
        setPassword(password);
        history.push(walletRoutePaths.newWallet.restore.keepSecure);
      }}
    />
  );
};
