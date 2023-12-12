import { BehaviorSubject, Subject } from 'rxjs';
import { themes } from '@providers/ThemeProvider';
import { BackgroundStorage, MigrationState } from './storage';
import { CoinPrices } from './prices';
import type { clearBackgroundStorage } from '../background/util';

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
  COLLATERAL_SETTINGS = 'collateral-settings',
  FORGOT_PASSWORD = 'forgot_password',
  NEW_WALLET = 'new_wallet'
}

export interface OpenBrowserData {
  section: BrowserViewSections;
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
  handleOpenBrowser: (data: OpenBrowserData) => Promise<void>;
  requestMessage$: Subject<Message>;
  migrationState$: BehaviorSubject<MigrationState | undefined>;
  coinPrices: CoinPrices;
  handleChangeTheme: (data: ChangeThemeData) => void;
  setBackgroundStorage: (data: BackgroundStorage) => Promise<void>;
  getBackgroundStorage: () => Promise<BackgroundStorage>;
  clearBackgroundStorage: typeof clearBackgroundStorage;
  getWalletPassword: () => Uint8Array;
  setWalletPassword: (password?: Uint8Array) => void;
  resetStorage: () => Promise<void>;
  backendFailures$: BehaviorSubject<number>;
};
