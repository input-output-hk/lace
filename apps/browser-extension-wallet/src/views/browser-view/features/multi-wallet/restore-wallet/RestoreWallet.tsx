import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { Setup } from './steps/Setup';
import { SelectRecoveryPhraseLength } from './steps/SelectRecoveryPhraseLength';
import { RestoreRecoveryPhrase } from './steps/RestoreRecoveryPhrase';
import { RestoreWalletProvider } from './context';
import { KeepWalletSecure } from './steps/KeepWalletSecure';
import { walletRoutePaths } from '@routes';
import { AllDone } from './steps/AllDone';
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
      <Route path={restore.keepSecure} component={KeepWalletSecure} />
      <Route path={restore.selectRecoveryPhraseLength} component={SelectRecoveryPhraseLength} />
      <Route path={restore.enterRecoveryPhrase} component={RestoreRecoveryPhrase} />
      <Route path={restore.allDone} component={AllDone} />
    </Switch>
  </RestoreWalletProvider>
);
