import React, { useEffect } from 'react';
import { walletRoutePaths } from '@routes';
import { Route, Switch } from 'react-router-dom';
import { Activating } from './Activating';
import { Welcome } from './Welcome';
import { Customize } from './Customize';
import { AllDone } from './AllDone';
import { WalletSetupLayout } from '@views/browser/components';
import { Portal } from '@views/browser/features/wallet-setup/components/Portal';
import { useAnalyticsContext } from '@providers';
import { postHogNamiMigrationActions } from '@providers/AnalyticsProvider/analyticsTracker';

const urlPath = walletRoutePaths.namiMigration;

export const NamiMigration = (): JSX.Element => {
  const analytics = useAnalyticsContext();

  useEffect(() => {
    document.querySelector('#preloader')?.remove();
  }, []);

  useEffect(() => {
    analytics.sendEventToPostHog(postHogNamiMigrationActions.onboarding.OPEN);
  }, [analytics]);

  return (
    <Portal>
      <WalletSetupLayout>
        <Switch>
          <>
            <Route path={urlPath.activating} component={Activating} />
            <Route path={urlPath.welcome} component={Welcome} />
            <Route path={urlPath.customize} component={Customize} />
            <Route path={urlPath.allDone} component={AllDone} />
          </>
        </Switch>
      </WalletSetupLayout>
    </Portal>
  );
};
