import { WalletSetupNamePasswordStep } from '@lace/core';
import React from 'react';
import { useHistory } from 'react-router';
import { useCreateWallet } from '../context';

export const Setup = (): JSX.Element => {
  const history = useHistory();
  const { setName, setPassword, onChange, data, paths } = useCreateWallet();

  return (
    <WalletSetupNamePasswordStep
      initialWalletName={data.name}
      onChange={onChange}
      onBack={() => history.push(paths.root)}
      onNext={({ password, walletName }) => {
        setName(walletName);
        setPassword(password);
        history.push(paths.create.keepSecure);
      }}
    />
  );
};
