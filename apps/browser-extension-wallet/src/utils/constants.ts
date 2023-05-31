/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import BigNumber from 'bignumber.js';
import { CoinId } from '../types';

export const LACE_APP_ID = 'lace-app';

export const zero = new BigNumber(0);
export const thousand = new BigNumber(1e3);
export const million = new BigNumber(1e6);
export const billion = new BigNumber(1e9);
export const trillion = new BigNumber(1e12);
export const quadrillion = new BigNumber(1e15);

export const unitsMap = new Map([
  ['', { gt: zero, lt: thousand }],
  ['K', { gt: thousand, lt: million }],
  ['M', { gt: million, lt: billion }],
  ['B', { gt: billion, lt: trillion }],
  ['T', { gt: trillion, lt: quadrillion }],
  ['Q', { gt: quadrillion, lt: new BigNumber(1e18) }]
]);

type ADAEnumType = 'ADA' | 'tADA';

export const CARDANO_COIN_SYMBOL: { [key in Wallet.Cardano.NetworkId]: ADAEnumType } = {
  [Wallet.Cardano.NetworkId.Mainnet]: 'ADA',
  [Wallet.Cardano.NetworkId.Testnet]: 'tADA'
};

export const cardanoCoin: CoinId = {
  id: '1',
  name: 'Cardano',
  decimals: 6,
  symbol: CARDANO_COIN_SYMBOL[Wallet.Cardano.NetworkId.Mainnet]
};

export const EPOCH_DURATION_DAYS = 5;

export const MIN_COIN_TO_SEND = 1;

type StaticBalanceTracker = {
  rewardAccounts: {
    rewards$: Wallet.Cardano.Lovelace;
    deposit$: Wallet.Cardano.Lovelace;
  };
  utxo: {
    total$: Wallet.Cardano.Value;
    available$: Wallet.Cardano.Value;
    unspendable$: Wallet.Cardano.Value;
  };
};

export const DEFAULT_WALLET_BALANCE: StaticBalanceTracker = {
  utxo: {
    total$: {
      coins: BigInt(0)
    },
    available$: {
      coins: BigInt(0)
    },
    unspendable$: {
      coins: BigInt(0)
    }
  },
  rewardAccounts: {
    deposit$: BigInt(0),
    rewards$: BigInt(0)
  }
};

export const PHRASE_FREQUENCY_OPTIONS = [
  {
    value: '',
    label: 'Never'
  },
  {
    value: '31',
    label: 'Every month'
  },
  {
    value: '182',
    label: 'Twice a year'
  },
  {
    value: '365',
    label: 'Yearly'
  }
];

export const HW_POPUPS_WIDTH = 360;

export const DRAWER_PADDING = 25;
export const DRAWER_WIDTH = 664;

export enum MenuItemList {
  ASSETS = 'assets',
  NFT = 'nft',
  TRANSACTIONS = 'transactions',
  STAKING = 'staking',
  DAPPS = 'dapps'
}

export const POPUP_WINDOW = {
  width: 360,
  height: 630
};

export const DAPP_CHANNELS = {
  userPrompt: `user-prompt-${process.env.WALLET_NAME}`,
  authenticator: `authenticator-${process.env.WALLET_NAME}`,
  walletApi: `wallet-api-${process.env.WALLET_NAME}`,
  authorizedDapps: `authorized-dapps-${process.env.WALLET_NAME}`,
  originsList: `${process.env.WALLET_NAME}Origins`,
  dappData: `dapp-data-${process.env.WALLET_NAME}`
};
export type AppMode = 'popup' | 'browser';

export const APP_MODE_POPUP: AppMode = 'popup';
export const APP_MODE_BROWSER: AppMode = 'browser';

export const SEND_NFT_DEFAULT_AMOUNT = '1';

export const COINGECKO_URL = 'https://www.coingecko.com';
