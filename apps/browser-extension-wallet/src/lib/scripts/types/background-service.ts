import { BehaviorSubject, Subject, Observable } from 'rxjs';
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

export interface WSConnectionStatus {
  connected: boolean;
}

export interface ChangeThemeData {
  theme: themes;
}

export interface ChangeModeData {
  mode: 'lace' | 'nami';
  completed?: boolean;
}

export enum MessageTypes {
  OPEN_BROWSER_VIEW = 'open-browser-view',
  CHANGE_THEME = 'change-theme',
  HTTP_CONNECTION = 'http-connnection',
  WS_CONNECTION = 'ws-connnection',
  OPEN_COLLATERAL_SETTINGS = 'open-collateral-settings',
  CHANGE_MODE = 'change-mode'
}

export enum BrowserViewSections {
  SEND_ADVANCED = 'send-advanced',
  RECEIVE_ADVANCED = 'receive-advanced',
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
  ADD_SHARED_WALLET = 'add_shared_wallet',
  NAMI_MIGRATION = 'nami_migration',
  NAMI_HW_FLOW = 'nami_hw_flow',
  DAPP_EXPLORER = 'dapp-explorer'
}

export interface OpenBrowserData {
  section: BrowserViewSections;
  urlSearchParams?: string;
}

export interface OpenNamiBrowserData {
  path: string;
}

interface ChangeThemeMessage {
  type: MessageTypes.CHANGE_THEME;
  data: ChangeThemeData;
}
interface HTTPConnectionMessage {
  type: MessageTypes.HTTP_CONNECTION;
  data: HTTPConnectionStatus;
}
interface WSConnectionMessage {
  type: MessageTypes.WS_CONNECTION;
  data: WSConnectionStatus;
}
interface OpenBrowserMessage {
  type: MessageTypes.OPEN_BROWSER_VIEW | MessageTypes.OPEN_COLLATERAL_SETTINGS;
  data: OpenBrowserData;
}

interface ChangeMode {
  type: MessageTypes.CHANGE_MODE;
  data: ChangeModeData;
}
export type Message =
  | ChangeThemeMessage
  | HTTPConnectionMessage
  | WSConnectionMessage
  | OpenBrowserMessage
  | ChangeMode;

export type UnhandledError = {
  type: 'error' | 'unhandledrejection';
  message: string;
};

export type BackgroundService = {
  handleOpenBrowser: (data: OpenBrowserData, urlSearchParams?: string) => Promise<void>;
  handleOpenPopup: () => Promise<void>;
  handleOpenNamiBrowser: (data: OpenNamiBrowserData) => Promise<void>;
  requestMessage$: Subject<Message>;
  migrationState$: BehaviorSubject<MigrationState | undefined>;
  coinPrices: CoinPrices;
  handleChangeTheme: (data: ChangeThemeData) => void;
  handleChangeMode: (data: ChangeModeData) => void;
  setBackgroundStorage: (data: BackgroundStorage) => Promise<void>;
  getBackgroundStorage: () => Promise<BackgroundStorage>;
  clearBackgroundStorage: typeof clearBackgroundStorage;
  resetStorage: () => Promise<void>;
  backendFailures$: BehaviorSubject<number>;
  unhandledError$: Observable<UnhandledError>;
};

export type WalletMode = {
  mode: BackgroundStorage['namiMigration']['mode'];
  dappInjectCompatibilityMode: BackgroundStorage['dappInjectCompatibilityMode'];
};

export type LaceFeaturesApi = {
  getMode: () => Promise<WalletMode>;
};
