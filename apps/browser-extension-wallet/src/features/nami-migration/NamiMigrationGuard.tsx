import { consumeRemoteApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import type { NamiMigrationAPI } from '@lib/scripts/background/nami-migration';
import { getBackgroundStorage } from '@lib/scripts/background/storage';
import { MigrationState } from './migration-tool/migrator/migration-state.data';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { Route, Switch, useHistory, useLocation } from 'react-router-dom';
import { runtime, storage } from 'webextension-polyfill';
import { walletRoutePaths as routes } from '@routes/wallet-paths';
import { useWalletStore } from '@src/stores';
import { APP_MODE_POPUP } from '@src/utils/constants';
import { useBackgroundServiceAPIContext } from '@providers';
import { BrowserViewSections, NamiMigrationChannels } from '@lib/scripts/types';
import { NamiMigration } from './NamiMigration';

const namiMigrationRemoteApi = consumeRemoteApi<Pick<NamiMigrationAPI, 'checkMigrationStatus' | 'abortMigration'>>(
  {
    baseChannel: NamiMigrationChannels.MIGRATION,
    properties: {
      checkMigrationStatus: RemoteApiPropertyType.MethodReturningPromise,
      abortMigration: RemoteApiPropertyType.MethodReturningPromise
    }
  },
  {
    logger: console,
    runtime
  }
);

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore ignore this
  window.namiMigration = {
    checkMigrationStatus: namiMigrationRemoteApi.checkMigrationStatus,
    abortMigration: async () => {
      await namiMigrationRemoteApi.abortMigration();
      const backgroundStorage = await getBackgroundStorage();

      await storage.local.set({
        BACKGROUND_STORAGE: {
          ...backgroundStorage,
          namiMigration: undefined
        }
      });
    }
  };
}

interface Props {
  children: React.ReactNode;
}

interface State {
  isReady: boolean;
  requiresMigration: boolean;
}

export const NamiMigrationGuard = ({ children }: Props): JSX.Element => {
  const history = useHistory();
  const backgroundServices = useBackgroundServiceAPIContext();
  const location = useLocation();
  const {
    walletUI: { appMode }
  } = useWalletStore();
  const [state, setState] = useState<State>({
    isReady: false,
    requiresMigration: location.pathname.startsWith(routes.namiMigration.root)
  });

  const redirectToActivating = useCallback(async () => {
    if (appMode === APP_MODE_POPUP) {
      await backgroundServices?.handleOpenBrowser({ section: BrowserViewSections.NAMI_MIGRATION });
      return;
    }

    history.push(routes.namiMigration.activating);
  }, [appMode, backgroundServices, history]);

  useEffect(() => {
    const checkMigrationStatus = async (): Promise<void> => {
      try {
        const [migrationStatus, backgroundStorage] = await Promise.all([
          namiMigrationRemoteApi.checkMigrationStatus(),
          getBackgroundStorage()
        ]);

        const conditions = [
          migrationStatus === MigrationState.InProgress,
          !backgroundStorage.namiMigration?.completed && migrationStatus === MigrationState.Completed
        ];

        if (conditions.some(Boolean)) {
          await redirectToActivating();
          setState({
            isReady: true,
            requiresMigration: true
          });

          return;
        }

        setState({
          isReady: true,
          requiresMigration: false
        });
      } catch {
        setState({
          isReady: true,
          requiresMigration: false
        });
      }
    };

    checkMigrationStatus();
  }, [history, redirectToActivating]);

  useEffect(() => {
    if (state.requiresMigration && location.pathname.startsWith(routes.assets)) {
      setState({
        isReady: true,
        requiresMigration: false
      });
    }
  }, [location.pathname, state]);

  if (!state.isReady) {
    return <Fragment />;
  }

  if (state.requiresMigration) {
    return (
      <Switch>
        <Route path={routes.namiMigration.root} component={NamiMigration} />
      </Switch>
    );
  }

  return <>{children}</>;
};
