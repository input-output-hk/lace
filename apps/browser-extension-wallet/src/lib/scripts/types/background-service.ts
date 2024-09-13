import { BehaviorSubject, Subject } from 'rxjs';
import { themes } from '@providers/ThemeProvider';
import { BackgroundStorage, MigrationState } from './storage';
import { CoinPrices } from './prices';
import type { clearBackgroundStorage } from '../background/storage';

export enum BaseChannels {
  BACKGROUND_ACTIONS = 'background-actions'
}

export interface HTTPConnectionStatus {
  connected: boolean;
}

export interface ChangeThemeData {
  theme: themes;
}

export enum MessageTypes {
  OPEN_BROWSER_VIEW = 'open-browser-view',
  CHANGE_THEME = 'change-theme',
  HTTP_CONNECTION = 'http-connnection',
  OPEN_COLLATERAL_SETTINGS = 'open-collateral-settings'
}

export enum BrowserViewSections {
  SEND_ADVANCED = 'send-advanced',
  STAKING = 'staking',
  NFTS = 'nfts',
  TRANSACTION = 'transaction',
  ADDRESS_BOOK = 'address-book',
  SETTINGS = 'settings',
  HOME = 'home',
  SIGN_MESSAGE = 'sign-message',
  COLLATERAL_SETTINGS = 'collateral-settings',
  FORGOT_PASSWORD = 'forgot_password',
  NEW_WALLET = 'new_wallet',
  ADD_SHARED_WALLET = 'add_shared_wallet'
}

export interface OpenBrowserData {
  section: BrowserViewSections;
  urlSearchParams?: string;
}

interface ChangeThemeMessage {
  type: MessageTypes.CHANGE_THEME;
  data: ChangeThemeData;
}
interface HTTPConnectionMessage {
  type: MessageTypes.HTTP_CONNECTION;
  data: HTTPConnectionStatus;
}
interface OpenBrowserMessage {
  type: MessageTypes.OPEN_BROWSER_VIEW | MessageTypes.OPEN_COLLATERAL_SETTINGS;
  data: OpenBrowserData;
}
export type Message = ChangeThemeMessage | HTTPConnectionMessage | OpenBrowserMessage;

export type BackgroundService = {
  handleOpenBrowser: (data: OpenBrowserData, urlSearchParams?: string) => Promise<void>;
  requestMessage$: Subject<Message>;
  migrationState$: BehaviorSubject<MigrationState | undefined>;
  coinPrices: CoinPrices;
  handleChangeTheme: (data: ChangeThemeData) => void;
  setBackgroundStorage: (data: BackgroundStorage) => Promise<void>;
  getBackgroundStorage: () => Promise<BackgroundStorage>;
  clearBackgroundStorage: typeof clearBackgroundStorage;
  resetStorage: () => Promise<void>;
  backendFailures$: BehaviorSubject<number>;
};
