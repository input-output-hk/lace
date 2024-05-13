import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { Connect } from './steps/Connect';
import { SelectAccount } from './steps/SelectAccount';
import { NameWallet } from './steps/NameWallet';
import { walletRoutePaths } from '@routes';
import { HardwareWalletProvider } from './context';
import { Providers } from './types';

const {
  newWallet: { hardware }
} = walletRoutePaths;

interface Props {
  providers: Providers;
}

export const HardwareWallet = ({ providers }: Props): JSX.Element => (
  <HardwareWalletProvider providers={providers}>
    <Switch>
      <Route path={hardware.connect} component={Connect} />
      <Route path={hardware.select} component={SelectAccount} />
      <Route path={hardware.name} component={NameWallet} />
      <Redirect from={hardware.root} to={hardware.connect} />
    </Switch>
  </HardwareWalletProvider>
);
