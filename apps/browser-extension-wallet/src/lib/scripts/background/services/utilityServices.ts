import { runtime, tabs, storage as webStorage } from 'webextension-polyfill';
import {
  BackgroundService,
  BaseChannels,
  BrowserViewSections,
  ChangeThemeData,
  Message,
  MessageTypes,
  OpenBrowserData,
  MigrationState,
  TokenPrices,
  CoinPrices
} from '../../types';
import { Subject, of, BehaviorSubject } from 'rxjs';
import { walletRoutePaths } from '@routes/wallet-paths';
import { backgroundServiceProperties } from '../config';
import { exposeApi } from '@cardano-sdk/web-extension';
import { Cardano } from '@cardano-sdk/core';
import { config } from '@src/config';
import {
  setBackgroundStorage,
  clearBackgroundStorage,
  getBackgroundStorage,
  convertToAssetName,
  getADAPriceFromBackgroundStorage
} from '../util';
import { currencies as currenciesMap, currencyCode } from '@providers/currency/constants';
import { tokenInLovelacePrices } from '@utils/token-prices-lovelace-list';

export const requestMessage$ = new Subject<Message>();
export const backendFailures$ = new BehaviorSubject(0);

const coinPrices: CoinPrices = {
  adaPrices$: new BehaviorSubject({
    prices: {},
    status: 'idle'
  }),
  tokenPrices$: new BehaviorSubject({
    tokens: new Map(),
    status: 'idle'
  })
};

const migrationState$ = new BehaviorSubject<MigrationState | undefined>(undefined);
let walletPassword: Uint8Array;

const handleOpenBrowser = async (data: OpenBrowserData) => {
  let path = '';
  switch (data.section) {
    case BrowserViewSections.SEND_ADVANCED:
      path = '';
      await setBackgroundStorage({ message: { type: MessageTypes.OPEN_BROWSER_VIEW, data } });
      break;
    case BrowserViewSections.STAKING:
      path = walletRoutePaths.staking;
      break;
    case BrowserViewSections.NFTS:
      path = walletRoutePaths.nfts;
      break;
    case BrowserViewSections.TRANSACTION:
      path = walletRoutePaths.activity;
      break;
    case BrowserViewSections.ADDRESS_BOOK:
      path = walletRoutePaths.addressBook;
      break;
    case BrowserViewSections.SETTINGS:
      path = walletRoutePaths.settings;
      break;
    case BrowserViewSections.COLLATERAL_SETTINGS:
      path = walletRoutePaths.settings;
      await setBackgroundStorage({ message: { type: MessageTypes.OPEN_COLLATERAL_SETTINGS, data } });
      break;
    case BrowserViewSections.FORGOT_PASSWORD:
      path = walletRoutePaths.setup.restore;
      break;
  }
  await tabs.create({ url: `app.html#${path}` }).catch((error) => console.log(error));
};

const handleChangeTheme = (data: ChangeThemeData) => requestMessage$.next({ type: MessageTypes.CHANGE_THEME, data });

const { ADA_PRICE_CHECK_INTERVAL, SAVED_PRICE_DURATION } = config();
const fetchTokenPrices = () => {
  fetch('https://analyticsv2.muesliswap.com/ticker')
    .then(async (response) => {
      const prices: Record<string, { ['last_price']: string | number; ['price_change']?: number }> =
        await response.json();
      const tokenPrices: TokenPrices = new Map();

      for (const [key, priceInfo] of Object.entries(prices)) {
        // the key is a concatenation of policy id + . + decoded asset name + _ADA, so we need to split it to get policy id and asset name
        const [policy, assetNameAsHex] = key.split('.');
        // get decoded asset name + _ADA in index 1 and split it to get asset name
        const strAssetName = assetNameAsHex.split('_')[0];
        // if for some reason we couldn't get any of this field jump to the next token
        if (!policy || !strAssetName) continue;
        // to be able to convert this to a type asset name first we need to convert it to hexadecimal
        const assetName = convertToAssetName(strAssetName);
        if (!assetName) continue;
        const policyId = Cardano.PolicyId(policy);
        // get the asset id to use as key for tokenPrices Map
        const assetId = Cardano.AssetId.fromParts(policyId, assetName);
        // it is possible for the price to come as NA so we need check this
        const price = priceInfo.last_price === 'NA' ? 0 : (priceInfo.last_price as number);

        // eslint-disable-next-line no-magic-numbers
        const priceInAda = tokenInLovelacePrices[assetId] ? price / 1_000_000 : price; // check if the price is in lovelace

        tokenPrices.set(assetId, {
          id: key,
          priceInAda,
          priceVariationPercentage24h: priceInfo.price_change
        });
      }

      coinPrices.tokenPrices$.next({ tokens: tokenPrices, status: 'fetched' });
    })
    .catch((error) => {
      console.log('Error fetching coin prices:', error);
      coinPrices.tokenPrices$.next({ ...coinPrices.tokenPrices$.value, status: 'error' });
    });
};

const fetchAdaPrice = () => {
  const vsCurrencies =
    (Object.keys(currenciesMap) as currencyCode[]).map((code) => code.toLowerCase()).join(',') || 'usd';
  fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=cardano&vs_currencies=${vsCurrencies}&include_24hr_change=true`
  )
    .then(async (response) => {
      const { cardano: prices } = await response.json();
      // save the last fetched ada price in background storage
      await setBackgroundStorage({
        fiatPrices: {
          prices,
          timestamp: Date.now()
        }
      });
      coinPrices.adaPrices$.next({
        prices,
        status: 'fetched'
      });
    })
    .catch(async (error) => {
      console.log('Error fetching coin prices:', error);
      // If for some reason we couldn't fetch the ada price, get it from background store
      const adaPrice = await getADAPriceFromBackgroundStorage();
      if (!adaPrice) return coinPrices.adaPrices$.next({ prices: {}, status: 'error', timestamp: undefined });

      const { prices, timestamp } = adaPrice;

      const currentDate = Date.now();
      const timePassedSinceLastSaved = currentDate - timestamp;
      // eslint-disable-next-line no-magic-numbers
      const timePassedInMinutes = Math.floor(timePassedSinceLastSaved / 60_000);
      // We need this in case if the wallet is opened after a long period of time and the value is too old to be used
      // in that case we omit the saved value
      // we can set this period of time with an env variable, by default is 720 minutes
      const shouldSetPriceValues = timePassedInMinutes < SAVED_PRICE_DURATION;
      const nextPriceValues = shouldSetPriceValues ? prices : {};
      const nextTimestamp = shouldSetPriceValues ? timestamp : undefined;
      return coinPrices.adaPrices$.next({ prices: nextPriceValues, status: 'error', timestamp: nextTimestamp });
    });
};

fetchAdaPrice();
setInterval(fetchAdaPrice, ADA_PRICE_CHECK_INTERVAL);

/* TODO: before enable token price fetching, we need this ticket https://input-output.atlassian.net/browse/ADP-2821 to be resolved
  once we have this resolved, we can enable token price fetching by adding USE_TOKEN_PRINCING=true to the environment variables
*/
if (process.env.USE_TOKEN_PRICING === 'true') {
  fetchTokenPrices();
  setInterval(fetchTokenPrices, ADA_PRICE_CHECK_INTERVAL);
}

exposeApi<BackgroundService>(
  {
    api$: of({
      handleOpenBrowser,
      requestMessage$,
      migrationState$,
      coinPrices,
      handleChangeTheme,
      clearBackgroundStorage,
      getBackgroundStorage,
      setBackgroundStorage,
      getWalletPassword: () => {
        if (!walletPassword) throw new Error('Missing password');
        return walletPassword;
      },
      setWalletPassword: (password?: Uint8Array) => {
        walletPassword = password;
      },
      resetStorage: async () => {
        await clearBackgroundStorage();
        await webStorage.local.set({ MIGRATION_STATE: { state: 'up-to-date' } as MigrationState });
      },
      backendFailures$
    }),
    baseChannel: BaseChannels.BACKGROUND_ACTIONS,
    properties: backgroundServiceProperties
  },
  { logger: console, runtime }
);
