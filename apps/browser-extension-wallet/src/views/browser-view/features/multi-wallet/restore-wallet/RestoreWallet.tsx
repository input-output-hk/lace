import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { Setup } from './steps/Setup';
import { RestoreRecoveryPhrase } from './steps/RestoreRecoveryPhrase';
import { RestoreWalletProvider } from './context';
import { walletRoutePaths } from '@routes';
import { Providers } from './types';

const {
  newWallet: { restore }
} = walletRoutePaths;

interface Props {
  providers: Providers;
}

export const RestoreWallet = ({ providers }: Props): JSX.Element => (
  <RestoreWalletProvider providers={providers}>
    <Switch>
      <Route path={restore.enterRecoveryPhrase} component={RestoreRecoveryPhrase} />
      <Route path={restore.setup} component={Setup} />
      <Redirect from={restore.root} to={restore.enterRecoveryPhrase} />
    </Switch>
  </RestoreWalletProvider>
);
