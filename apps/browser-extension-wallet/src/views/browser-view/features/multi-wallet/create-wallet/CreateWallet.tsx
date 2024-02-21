import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { Setup } from './steps/Setup';
import { NewRecoveryPhrase } from './steps/NewRecoveryPhrase';
import { CreateWalletProvider } from './context';
import { KeepWalletSecure } from './steps/KeepWalletSecure';
import { Providers } from './types';

interface Props {
  providers: Providers;
}

export const CreateWallet = ({ providers }: Props): JSX.Element => (
  <CreateWalletProvider providers={providers}>
    <Switch>
      <Route path={providers.paths.create.setup} component={Setup} />
      <Route path={providers.paths.create.keepSecure} component={KeepWalletSecure} />
      <Route path={providers.paths.create.recoveryPhrase} component={NewRecoveryPhrase} />
    </Switch>
  </CreateWalletProvider>
);
