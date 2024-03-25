import { runtime, tabs } from 'webextension-polyfill';
import { walletRoutePaths } from '@routes/wallet-paths';
import type * as Nami from '@xsy/nami-migration-tool';
import { walletRepository, walletManager, getBaseDbName } from './wallet';

import { run, CollateralRepository } from './nami-migration-runner';
import { currencyCode } from '@providers/currency/constants';
import { getWalletStoreId } from '@cardano-sdk/web-extension';
import { storage } from '@cardano-sdk/wallet';

const namiId = 'igonoepjobamjpghplmhjoleleipkkpk';

const collateralRepository: CollateralRepository = async ({ utxo, chainId, walletId, accountIndex }) => {
  const walletStoreId = getWalletStoreId(walletId, chainId, accountIndex);
  const baseDbName = getBaseDbName(walletStoreId);
  const db = new storage.PouchDbUtxoStore({ dbName: `${baseDbName}UnspendableUtxo` }, console);
  db.setAll([utxo]);
};

runtime.onMessageExternal.addListener(async (request, sender) => {
  if (sender.id !== namiId) return;

  const state: Nami.State = request;

  await run({ walletRepository, walletManager, state, collateralRepository });

  const encodedData = Buffer.from(
    JSON.stringify({
      currency: state.currency === 'usd' ? currencyCode.usd : currencyCode.eur,
      analytics: state.analytics
    })
  ).toString('base64');

  const path = walletRoutePaths.nami.root;
  const params = `?data=${encodedData}`;

  await tabs.create({ url: `app.html#${path}${params}` }).catch((error) => console.error(error));
});
