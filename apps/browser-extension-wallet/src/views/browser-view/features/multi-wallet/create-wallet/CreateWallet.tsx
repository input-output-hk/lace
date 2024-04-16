import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { Setup } from './steps/Setup';
import { NewRecoveryPhrase } from './steps/NewRecoveryPhrase';
import { CreateWalletProvider } from './context';
import { walletRoutePaths } from '@routes';
import { Providers } from './types';

const {
  newWallet: { create }
} = walletRoutePaths;

interface Props {
  providers: Providers;
}

export const CreateWallet = ({ providers }: Props): JSX.Element => (
  <CreateWalletProvider providers={providers}>
    <Switch>
      <Route path={create.setup} component={Setup} />
      <Route path={create.recoveryPhrase} component={NewRecoveryPhrase} />
    </Switch>
  </CreateWalletProvider>
);
