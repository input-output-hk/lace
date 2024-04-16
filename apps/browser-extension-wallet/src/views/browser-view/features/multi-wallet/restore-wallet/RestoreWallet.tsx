import React from 'react';
import { Route, Switch } from 'react-router-dom';
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
      <Route path={restore.setup} component={Setup} />
      <Route path={restore.enterRecoveryPhrase} component={RestoreRecoveryPhrase} />
    </Switch>
  </RestoreWalletProvider>
);
