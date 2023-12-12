import { WalletSetupNamePasswordStep } from '@lace/core';
import { walletRoutePaths } from '@routes';
import React from 'react';
import { useHistory } from 'react-router';
import { useCreateWallet } from '../context';

export const Setup = (): JSX.Element => {
  const history = useHistory();
  const { setName, setPassword } = useCreateWallet();

  return (
    <WalletSetupNamePasswordStep
      onBack={() => history.push(walletRoutePaths.newWallet.root)}
      onNext={({ password, walletName }) => {
        setName(walletName);
        setPassword(password);
        history.push(walletRoutePaths.newWallet.create.keepSecure);
      }}
    />
  );
};
