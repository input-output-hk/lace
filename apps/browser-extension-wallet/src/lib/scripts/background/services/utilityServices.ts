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
  getADAPriceFromBackgroundStorage
} from '../util';
import { currencies as currenciesMap, currencyCode } from '@providers/currency/constants';

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
interface TokenAPIResponse {
  price: {
    price: number;
    quoteDecimalPlaces: number;
    baseDecimalPlaces: number;
    quoteAddress: { policyId: string; name: string };
    priceChange: { '24h': string; '7d': string };
  };
}

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
    case BrowserViewSections.NEW_WALLET:
      path = walletRoutePaths.newWallet.root;
      break;
    case BrowserViewSections.SHARED_WALLET:
      path = walletRoutePaths.sharedWallet.root;
      break;
  }
  await tabs.create({ url: `app.html#${path}` }).catch((error) => console.error(error));
};

const handleChangeTheme = (data: ChangeThemeData) => requestMessage$.next({ type: MessageTypes.CHANGE_THEME, data });

const { ADA_PRICE_CHECK_INTERVAL, SAVED_PRICE_DURATION, TOKEN_PRICE_CHECK_INTERVAL } = config();
const fetchTokenPrices = () => {
  // `base-policy-id=&base-tokenname=` for ADA as base token
  fetch('https://muesliswap.live-mainnet.eks.lw.iog.io/list?base-policy-id=&base-tokenname=')
    .then(async (response) => {
      const tokens: TokenAPIResponse[] = await response.json();
      const tokenPrices: TokenPrices = new Map();
      for (const token of tokens) {
        try {
          const assetId = Cardano.AssetId.fromParts(
            Cardano.PolicyId(token.price.quoteAddress.policyId),
            Cardano.AssetName(token.price.quoteAddress.name)
          );
          // Base token is ADA, quote token is the one we are fetching the price
          // According to muesliswap API, ADA decimal places (baseDecimalPlaces) is 6
          // The token price returned by this endpoint is not based on ADA, even when ADA is specified as the base
          // If the token and ADA decimal places differ, we need to do the following to calculate the price in ADA properly:
          //   priceInAda = token price / (10 ^ (ADA decimal places - token decimal places))
          const priceInAda =
            // eslint-disable-next-line no-magic-numbers
            token.price.price / Math.pow(10, token.price.baseDecimalPlaces - token.price.quoteDecimalPlaces);
          tokenPrices.set(assetId, {
            priceInAda,
            priceVariationPercentage24h: Number(token.price.priceChange['24h'])
          });
        } catch {
          // If a token couldn't be parsed then skip it
        }
      }
      coinPrices.tokenPrices$.next({ tokens: tokenPrices, status: 'fetched' });
    })
    .catch((error) => {
      console.error('Error fetching coin prices:', error);
      coinPrices.tokenPrices$.next({ ...coinPrices.tokenPrices$.value, status: 'error' });
    });
};

const fetchAdaPrice = () => {
  const vsCurrencies =
    (Object.keys(currenciesMap) as currencyCode[]).map((code) => code.toLowerCase()).join(',') || 'usd';
  fetch(
    `https://coingecko.live-mainnet.eks.lw.iog.io/api/v3/simple/price?ids=cardano&vs_currencies=${vsCurrencies}&include_24hr_change=true`
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
      console.error('Error fetching coin prices:', error);
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
if (process.env.USE_TOKEN_PRICING === 'true') {
  fetchTokenPrices();
  setInterval(fetchTokenPrices, TOKEN_PRICE_CHECK_INTERVAL);
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
