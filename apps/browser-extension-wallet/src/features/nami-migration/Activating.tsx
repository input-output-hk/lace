import React, { useEffect } from 'react';
import { NamiMigrationUpdatingYourWallet } from '@lace/core';
import { consumeRemoteApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import type { NamiMigrationAPI } from '@lib/scripts/background/nami-migration';
import { runtime } from 'webextension-polyfill';
import { useHistory } from 'react-router-dom';
import { walletRoutePaths as routes } from '@routes/wallet-paths';
import { useCurrencyStore } from '@providers/currency';
import { MigrationState } from './migration-tool/migrator/migration-state.data';
import { useTheme } from '@providers/ThemeProvider/context';
import { NamiMigrationChannels } from '@lib/scripts/types';
import { logger } from '@lace/common';

const namiMigrationRemoteApi = consumeRemoteApi<Pick<NamiMigrationAPI, 'startMigration' | 'checkMigrationStatus'>>(
  {
    baseChannel: NamiMigrationChannels.MIGRATION,
    properties: {
      startMigration: RemoteApiPropertyType.MethodReturningPromise,
      checkMigrationStatus: RemoteApiPropertyType.MethodReturningPromise
    }
  },
  {
    logger,
    runtime
  }
);

export const Activating = (): JSX.Element => {
  const history = useHistory();
  const { setFiatCurrency } = useCurrencyStore();
  const { setTheme } = useTheme();

  useEffect(() => {
    const startMigration = async () => {
      const migrationStatus = await namiMigrationRemoteApi.checkMigrationStatus();

      if (migrationStatus !== MigrationState.InProgress && migrationStatus !== MigrationState.Completed) {
        history.push(routes.namiMigration.welcome);
        return;
      }

      const result = await namiMigrationRemoteApi.startMigration();
      const namiTheme = result.themeColor === 'light' ? 'light' : 'dark';

      setTheme(namiTheme);
      setFiatCurrency(result.currency);
      history.push(routes.namiMigration.welcome);
    };

    startMigration();
  }, [setFiatCurrency, history, setTheme]);

  return <NamiMigrationUpdatingYourWallet />;
};
