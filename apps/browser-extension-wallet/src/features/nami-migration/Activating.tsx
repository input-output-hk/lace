import React, { useEffect } from 'react';

import { NamiMigrationUpdatingYourWallet } from '@lace/core';
import { consumeRemoteApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { NamiMigrationAPI, NamiMigrationChannels } from '@lib/scripts/background/nami-migration';
import { runtime } from 'webextension-polyfill';
import { useHistory } from 'react-router-dom';
import { walletRoutePaths as routes } from '@routes/wallet-paths';
import { useCurrencyStore } from '@providers/currency';
import { MigrationState } from '@xsy/nami-migration-tool/dist/migrator/migration-state.data';

const namiMigrationRemoteApi = consumeRemoteApi<Pick<NamiMigrationAPI, 'startMigration' | 'checkMigrationStatus'>>(
  {
    baseChannel: NamiMigrationChannels.MIGRATION,
    properties: {
      startMigration: RemoteApiPropertyType.MethodReturningPromise,
      checkMigrationStatus: RemoteApiPropertyType.MethodReturningPromise
    }
  },
  {
    logger: console,
    runtime
  }
);

export const Activating = (): JSX.Element => {
  const history = useHistory();
  const { setFiatCurrency } = useCurrencyStore();

  useEffect(() => {
    const startMigration = async () => {
      const migrationStatus = await namiMigrationRemoteApi.checkMigrationStatus();

      if (migrationStatus !== MigrationState.InProgress && migrationStatus !== MigrationState.Completed) {
        history.push(routes.namiMigration.welcome);
        return;
      }

      const result = await namiMigrationRemoteApi.startMigration();
      setFiatCurrency(result.currency);
      history.push(routes.namiMigration.welcome);
    };

    startMigration();
  }, [setFiatCurrency, history]);

  return <NamiMigrationUpdatingYourWallet />;
};
