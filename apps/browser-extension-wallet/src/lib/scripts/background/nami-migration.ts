import { runtime, tabs } from 'webextension-polyfill';
import { walletRoutePaths } from '@routes/wallet-paths';
import { walletRepository, walletManager } from './wallet';
import * as Nami from '@types';

import { run } from './nami-migration-runner';
import { currencyCode } from '@providers/currency/constants';

const namiId = 'igonoepjobamjpghplmhjoleleipkkpk';

runtime.onMessageExternal.addListener(async (request, sender) => {
  if (sender.id !== namiId) return;

  const migrationState: Nami.State = request;

  await run(walletRepository, walletManager, migrationState);

  const encodedData = Buffer.from(
    JSON.stringify({
      currency: migrationState.currency === 'usd' ? currencyCode.usd : currencyCode.eur,
      analytics: migrationState.analytics
    })
  ).toString('base64');

  const path = walletRoutePaths.nami.root;
  const params = `?data=${encodedData}`;

  await tabs.create({ url: `app.html#${path}${params}` }).catch((error) => console.error(error));
});
