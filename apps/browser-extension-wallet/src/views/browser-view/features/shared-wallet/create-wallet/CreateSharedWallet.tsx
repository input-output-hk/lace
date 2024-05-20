import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { AddWalletCoSigners } from './steps/AddWalletCoSigners';
import { walletRoutePaths } from '@routes';

const {
  sharedWallet: { create }
} = walletRoutePaths;

export const CreateSharedWallet = (): JSX.Element => (
  <Switch>
    <Route path={create.addCosigner} component={AddWalletCoSigners} />
    <Redirect from={create.root} to={create.addCosigner} />
  </Switch>
);
