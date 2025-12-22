import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { ReceiveInfoContainer } from './features/receive-info/components';
import { Activity } from './features/activity/components';
import { MainLayout } from './components/Layout/MainLayout';
import { PopupAssets } from './features/assets';
import { SendContainer } from './features/send/components';
import { walletRoutePaths } from './wallet-paths';
import { Settings } from '../../features/settings';
import { useNotificationsCenterConfig } from '../../hooks/useNotificationsCenterConfig';
import { NotificationDetailsContainer, NotificationsCenter } from '../../features/notifications-center';

export const ExtensionRoutes = (): React.ReactElement => {
  const { isNotificationsCenterEnabled } = useNotificationsCenterConfig();

  return (
    <MainLayout>
      <Switch>
        <Route exact path={walletRoutePaths.assets} component={PopupAssets} />
        <Route exact path={walletRoutePaths.receive} component={ReceiveInfoContainer} />
        <Route exact path={walletRoutePaths.activity} component={Activity} />
        <Route exact path={walletRoutePaths.send} component={SendContainer} />
        {isNotificationsCenterEnabled && (
          <Route exact path={walletRoutePaths.notifications} component={NotificationsCenter} />
        )}
        {isNotificationsCenterEnabled && (
          <Route exact path={walletRoutePaths.notification} component={NotificationDetailsContainer} />
        )}
        <Route exact path={walletRoutePaths.settings} component={Settings} />
        <Route path="*" render={() => <Redirect to={walletRoutePaths.assets} />} />
      </Switch>
    </MainLayout>
  );
};
