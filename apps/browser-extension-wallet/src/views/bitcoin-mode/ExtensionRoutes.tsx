import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { ReceiveInfoContainer } from './features/receive-info/components';
import { Activity } from './features/activity/components';
import { MainLayout } from './components/Layout/MainLayout';
import { PopupAssets } from './features/assets';
import { SendContainer } from './features/send/components';
import { walletRoutePaths } from './wallet-paths';
import { Settings } from '../../features/settings';

export const ExtensionRoutes = (): React.ReactElement => (
  <MainLayout>
    <Switch>
      <Route exact path={walletRoutePaths.assets} component={PopupAssets} />
      <Route exact path={walletRoutePaths.receive} component={ReceiveInfoContainer} />
      <Route exact path={walletRoutePaths.activity} component={Activity} />
      <Route exact path={walletRoutePaths.send} component={SendContainer} />
      <Route exact path={walletRoutePaths.settings} component={Settings} />
      <Route path="*" render={() => <Redirect to={walletRoutePaths.assets} />} />
    </Switch>
  </MainLayout>
);
