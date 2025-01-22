/* eslint-disable no-magic-numbers */
import { runtime, tabs, storage as webStorage, windows, action, Tabs, Windows } from 'webextension-polyfill';
import {
  BackgroundService,
  BaseChannels,
  BrowserViewSections,
  ChangeThemeData,
  Message,
  MessageTypes,
  OpenBrowserData,
  OpenNamiBrowserData,
  MigrationState,
  TokenPrices,
  CoinPrices,
  ChangeModeData,
  LaceFeaturesApi,
  UnhandledError
} from '../../types';
import { Subject, of, BehaviorSubject, merge, map, fromEvent } from 'rxjs';
import { walletRoutePaths } from '@routes/wallet-paths';
import { backgroundServiceProperties } from '../config';
import { exposeApi } from '@cardano-sdk/web-extension';
import { Cardano } from '@cardano-sdk/core';
import { config } from '@src/config';
import {getADAPriceFromBackgroundStorage, closeAllLaceOrNamiTabs, getBtcPriceFromBackgroundStorage} from '../util';
import { currencies as currenciesMap, currencyCode } from '@providers/currency/constants';
import { clearBackgroundStorage, getBackgroundStorage, setBackgroundStorage } from '../storage';
import { laceFeaturesApiProperties, LACE_FEATURES_CHANNEL } from '../injectUtil';
import { getErrorMessage } from '@src/utils/get-error-message';
import { logger } from '@lace/common';
import { POPUP_WINDOW_NAMI_TITLE } from '@utils/constants';
import { catchAndBrandExtensionApiError } from '@utils/catch-and-brand-extension-api-error';

export const requestMessage$ = new Subject<Message>();
export const backendFailures$ = new BehaviorSubject(0);

const coinPrices: CoinPrices = {
  adaPrices$: new BehaviorSubject({
    prices: {},
    status: 'idle'
  }),
  bitcoinPrices$: new BehaviorSubject({
    prices: {},
    status: 'idle'
  }),
  tokenPrices$: new BehaviorSubject({
    tokens: new Map(),
    status: 'idle'
  })
};
interface TokenAPIResponse {
  [key: string]: {
    price: number; // price in ADA
    priceChange: { '24h': string };
  };
}

const migrationState$ = new BehaviorSubject<MigrationState | undefined>(undefined);

// eslint-disable-next-line complexity
const handleOpenBrowser = async (data: OpenBrowserData) => {
  let path = '';
  switch (data.section) {
    case BrowserViewSections.SEND_ADVANCED:
    case BrowserViewSections.RECEIVE_ADVANCED:
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
    case BrowserViewSections.SIGN_MESSAGE:
      path = walletRoutePaths.signMessage;
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
    case BrowserViewSections.ADD_SHARED_WALLET:
      path = walletRoutePaths.sharedWallet.root;
      break;
    case BrowserViewSections.NAMI_MIGRATION:
      path = walletRoutePaths.namiMigration.root;
      break;
    case BrowserViewSections.NAMI_HW_FLOW:
      path = walletRoutePaths.namiMigration.hwFlow;
      break;
    case BrowserViewSections.DAPP_EXPLORER:
      path = walletRoutePaths.dapps;
      break;
  }
  const params = data.urlSearchParams ? `?${data.urlSearchParams}` : '';
  const url = `app.html#${path}${params}`;
  await catchAndBrandExtensionApiError(tabs.create({ url }), `Failed to open expanded view with url: ${url}`).catch(
    (error) => logger.error(error)
  );
};

const handleOpenNamiBrowser = async (data: OpenNamiBrowserData) => {
  const url = `popup.html#${data.path}`;
  await catchAndBrandExtensionApiError(
    tabs.create({ url }),
    `Failed to open nami mode extended with url: ${url}`
  ).catch((error) => logger.error(error));
};

const enrichWithTabsDataIfMissing = (browserWindows: Windows.Window[]) => {
  const promises = browserWindows.map(async (w) => ({
    ...w,
    tabs:
      w.tabs ||
      (await catchAndBrandExtensionApiError(tabs.query({ windowId: w.id }), 'Failed to query tabs of a window'))
  }));
  return Promise.all(promises);
};

// Yes, Nami mode can be rendered as tab
const isLaceOrNamiTab = (tab: Tabs.Tab) => ['Lace', POPUP_WINDOW_NAMI_TITLE].includes(tab.title);

type WindowWithTabsNotOptional = Windows.Window & {
  tabs: Tabs.Tab[];
};
const doesWindowHaveOtherTabs = (browserWindow: WindowWithTabsNotOptional) =>
  browserWindow.tabs.some((t) => !isLaceOrNamiTab(t));

const closeAllTabsAndOpenPopup = async () => {
  try {
    const allWindowsRaw = await catchAndBrandExtensionApiError(windows.getAll(), 'Failed to query all browser windows');
    const allWindows = await enrichWithTabsDataIfMissing(allWindowsRaw);
    if (allWindows.length === 0) return;

    const windowsWith3rdPartyTabs = allWindows.filter((w) => doesWindowHaveOtherTabs(w));
    const candidateWindowsWithPreferenceForCurrentlyFocused = windowsWith3rdPartyTabs.sort(
      (w1, w2) => Number(w2.focused) - Number(w1.focused)
    );

    let nextFocusedWindow = candidateWindowsWithPreferenceForCurrentlyFocused[0];
    const noSingleWindowWith3rdPartyTabsOpen = !nextFocusedWindow;
    if (noSingleWindowWith3rdPartyTabsOpen) {
      nextFocusedWindow = allWindows[0];
      await catchAndBrandExtensionApiError(
        tabs.create({ active: true, windowId: nextFocusedWindow.id }),
        'Failed to open empty tab to prevent window from closing'
      );
    }

    await catchAndBrandExtensionApiError(
      windows.update(nextFocusedWindow.id, { focused: true }),
      'Failed to focus window'
    );
    await closeAllLaceOrNamiTabs();
    await catchAndBrandExtensionApiError(action.openPopup(), 'Failed to open popup');
  } catch (error) {
    logger.error(error);
  }
};

const handleChangeTheme = (data: ChangeThemeData) => requestMessage$.next({ type: MessageTypes.CHANGE_THEME, data });

const handleChangeMode = (data: ChangeModeData) => requestMessage$.next({ type: MessageTypes.CHANGE_MODE, data });

const { ADA_PRICE_CHECK_INTERVAL, SAVED_PRICE_DURATION, TOKEN_PRICE_CHECK_INTERVAL } = config();
const fetchTokenPrices = () => {
  fetch('https://muesliswap.live-mainnet.eks.lw.iog.io/lace/prices')
    .then(async (response) => {
      const tokens: TokenAPIResponse = await response.json();
      const tokenPrices: TokenPrices = new Map();
      for (const [key, token] of Object.entries(tokens)) {
        const [policyId, name] = key.split('.');
        try {
          const assetId = Cardano.AssetId.fromParts(Cardano.PolicyId(policyId), Cardano.AssetName(name));
          tokenPrices.set(assetId, {
            priceInAda: token.price,
            priceVariationPercentage24h: Number(token.priceChange['24h'])
          });
        } catch {
          // If a token couldn't be parsed then skip it
        }
      }
      coinPrices.tokenPrices$.next({ tokens: tokenPrices, status: 'fetched' });
    })
    .catch((error) => {
      logger.debug('Error fetching token prices:', error);
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
      logger.debug('Error fetching coin prices:', error);
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

const fetchBitcoinPrice = () => {
  const vsCurrencies =
    (Object.keys(currenciesMap) as currencyCode[]).map((code) => code.toLowerCase()).join(',') || 'usd';
  fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${vsCurrencies}&include_24hr_change=true`
  )
    .then(async (response) => {
      const { bitcoin: prices } = await response.json();
      // save the last fetched ada price in background storage
      await setBackgroundStorage({
        fiatBitcoinPrices: {
          prices,
          timestamp: Date.now()
        }
      });
      coinPrices.bitcoinPrices$.next({
        prices,
        status: 'fetched'
      });
    })
    .catch(async (error) => {
      console.error('Error fetching coin prices:', error);
      // If for some reason we couldn't fetch the ada price, get it from background store
      const btcPrice = await getBtcPriceFromBackgroundStorage();
      if (!btcPrice) return coinPrices.bitcoinPrices$.next({ prices: {}, status: 'error', timestamp: undefined });

      const { prices, timestamp } = btcPrice;

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
      return coinPrices.bitcoinPrices$.next({ prices: nextPriceValues, status: 'error', timestamp: nextTimestamp });
    });
};

fetchAdaPrice();
fetchBitcoinPrice();

setInterval(fetchAdaPrice, ADA_PRICE_CHECK_INTERVAL);
setInterval(fetchBitcoinPrice, ADA_PRICE_CHECK_INTERVAL);

if (process.env.USE_TOKEN_PRICING === 'true') {
  fetchTokenPrices();
  setInterval(fetchTokenPrices, TOKEN_PRICE_CHECK_INTERVAL);
}

exposeApi<LaceFeaturesApi>(
  {
    api$: of({
      getMode: async () => {
        const { namiMigration, dappInjectCompatibilityMode } = await getBackgroundStorage();
        return { mode: namiMigration?.mode || 'lace', dappInjectCompatibilityMode: !!dappInjectCompatibilityMode };
      }
    }),
    baseChannel: LACE_FEATURES_CHANNEL,
    properties: laceFeaturesApiProperties
  },
  { logger, runtime }
);

const toUnhandledError = (error: unknown, type: UnhandledError['type']): UnhandledError => ({
  type,
  message: getErrorMessage(error)
});
const unhandledError$ = merge(
  fromEvent(globalThis, 'error').pipe(map((e: ErrorEvent): UnhandledError => toUnhandledError(e.error, 'error'))),
  fromEvent(globalThis, 'unhandledrejection').pipe(
    map((e: PromiseRejectionEvent): UnhandledError => toUnhandledError(e.reason, 'unhandledrejection'))
  )
);

const getAppVersion = async () => await process.env.APP_VERSION;

exposeApi<BackgroundService>(
  {
    api$: of({
      handleOpenBrowser,
      handleOpenNamiBrowser,
      closeAllTabsAndOpenPopup,
      requestMessage$,
      migrationState$,
      coinPrices,
      handleChangeTheme,
      handleChangeMode,
      clearBackgroundStorage,
      getBackgroundStorage,
      setBackgroundStorage,
      resetStorage: async () => {
        await clearBackgroundStorage();
        await webStorage.local.set({ MIGRATION_STATE: { state: 'up-to-date' } as MigrationState });
      },
      getAppVersion,
      backendFailures$,
      unhandledError$
    }),
    baseChannel: BaseChannels.BACKGROUND_ACTIONS,
    properties: backgroundServiceProperties
  },
  { logger, runtime }
);
